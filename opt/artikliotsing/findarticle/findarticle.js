'use strict';

var config = require('config');
var urllib = require('url');
var fetch = require('fetch');
var sources = require('../shared/sources.json');
var sortedSources = processSources(sources);
var resolver = require('resolver');
var redis = require('redis');
var redisClient = redis.createClient(config.redis.port, config.redis.host);
var crypto = require('crypto');
var NodePie = require('nodepie');
var debug = config.debug;
var urllib = require('url');

syncLoop();

function syncLoop() {
    sources.unshift(sources.pop());
    var source = sources[0];

    if (debug) {
        console.log('syncLoop: checking ' + source.id);
    }

    checkFeed(source.url, source.feed, function(err, items) {
        if (debug) {
            console.log('Feed checked');
            console.log('syncLoop: found ' + items + ' new articles');
        }
        setTimeout(syncLoop, 10 * 1000);
    });
}

function checkFeed(siteUrl, feedUrl, callback) {
    var feed;

    if (debug) {
        console.log('checkFeed: fetching ' + feedUrl + ' (' + Date() + ')');
    }
    fetch.fetchUrl(feedUrl, {
        timeout: 45 * 1000
    }, function(err, meta, body) {
        if (err) {
            console.log('Fetch url ' + Date() + ' ' + feedUrl);
            console.log(err);
            return callback(err);
        }
        if (meta.status != 200) {
            if (debug) {
                console.log('checkFeed: Invalid status ' + meta.status);
            }
            return callback(null, false);
        }

        var items = [],
            newItems = 0,
            counter = 0;

        if (debug) {
            console.log('checkFeed: Creating new NodePie');
        }

        try {
            feed = new NodePie(body);
            feed.init();
        } catch (E) {
            try {
                // common error - unallowed bytes in the file
                feed = new NodePie(new Buffer(body.toString().replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F]/g, ''), 'utf-8'));
                feed.init();
            } catch (E) {
                console.log('Error opening RSS/Atom file ' + feedUrl);
                console.log(E);
                return callback(err);
            }
        }

        feed.getItems().reverse().forEach(function(item) {
            if (item.getDate() < new Date(Date.now() - (1000 * 3600 * 24 * 30))) {
                return;
            }
            items.push({
                url: item.getPermalink(),
                date: item.getDate(),
                title: item.getTitle() || '',
                found: new Date(),
                author: item.getAuthor() || ''
            });
        });

        var processItems = function() {
            if (counter >= items.length) {
                return callback(null, newItems);
            }
            var item = items[counter++];

            if (debug) {
                console.log('processItems: resolving ' + item.url + ' (' + Date() + ')');
            }
            resolve(item.url, function(err, url) {
                if (err) {
                    console.log('Resolver error ' + Date());
                    console.log(err);
                    return process.nextTick(processItems);
                }
                item.url = url;
                item.site = detectSite(url, siteUrl);
                item.lang = (sortedSources[item.site] ||  {}).language ||  'et';
                item.found = new Date();

                if (item.url) {
                    if (debug) {
                        console.log('processItems: checking article ' + item.url + ' (' + Date() + ')');
                    }
                    checkArticle(item.url, function(err, exists) {
                        if (err) {
                            console.log(err);
                            return process.nextTick(processItems);
                        }
                        if (exists) {
                            return process.nextTick(processItems);
                        }

                        if (debug) {
                            console.log('processItems: found new article ' + item.url);
                        }
                        newItems++;
                        redisClient.multi().
                        select(config.redis.db).
                        set('recent:' + md5(item.url), item.url).
                        expire('recent:' + md5(item.url), 3600 * 24 * 40).
                        lpush('article:list', JSON.stringify(item)).
                        zadd('article:last', item.found.getTime(), JSON.stringify(item)).
                        zremrangebyscore('article:last', 0, Date.now() - 24 * 3600 * 1000).
                        exec(processItems);
                    });
                } else {
                    if (debug) {
                        console.log('processItems: empty url (' + Date() + ')');
                    }
                    return process.nextTick(processItems);
                }
            });
        };

        if (debug) {
            console.log('checkFeed: processing ' + feed.getItemQuantity() + ' items (' + Date() + ')');
        }
        processItems();
    });
}

function detectSite(itemUrl, siteUrl) {
    var itemUrlParts = urllib.parse(itemUrl, true, true),
        siteUrlParts = urllib.parse(siteUrl, true, true),

        itemDomain = itemUrlParts.hostname.replace(/^www\./i, '').trim(),
        siteDomain = siteUrlParts.hostname.replace(/^www\./i, '').trim(),

        domain = siteDomain;

    sources.forEach(function(source) {
        if (source.domains && source.domains.indexOf(itemDomain) >= 0) {
            domain = source.id;
        }
    });

    return domain;
}


function checkArticle(url, callback) {
    if (debug) {
        console.log('checkArticle: resolving ' + url + ' (' + Date() + ')');
    }
    resolve(url, function(err, url) {
        if (err) {
            console.log(err);
            return callback(err);
        }

        redisClient.multi().
        select(config.redis.db).
        get('recent:' + md5(url)).
        exec(function(err, replies) {
            if (err) {
                console.log(err);
                return callback(err);
            }
            if (replies && replies[1]) {
                return callback(null, true);
            }

            return callback(null, false);
        });
    });
}

function resolve(sourceUrl, callback) {
    var key = 'link:' + md5(sourceUrl);
    redisClient.multi().
    select(config.redis.db).
    get(key).
    exec(function(err, replies) {
        if (err) {
            return callback(err);
        }
        if (replies && replies[1]) {
            return callback(null, replies[1]);
        }
        resolver.resolve(sourceUrl, {
            removeParams: [/^utm_/, 'ref', 'rsscount'],
            userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:21.0) Gecko/20100101 Firefox/21.0'
        }, function(err, url) {
            if (err) {
                return callback(err);
            }

            if (!url) {
                return callback(null, '');
            }

            redisClient.multi().
            select(config.redis.db).
            set(key, url).
            expire(key, 3600 * 24 * 7).
            exec(function() {
                return callback(null, url);
            });
        });
    });
}

function md5(str) {
    var hash = crypto.createHash('md5');
    hash.update(str);
    return hash.digest('hex');
}

function processSources(sources) {
    var sorted = {};
    sources.forEach(function(source) {
        if (!(source.id in sorted)) {
            sorted[source.id] = source;
        }
    });
    return sorted;
}
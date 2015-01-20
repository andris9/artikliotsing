'use strict';

var config = require('./config');
var redis = require('redis');
var redisClient = redis.createClient(config.redis.port, config.redis.host);
var fetch = require('fetch');
var debug = process.env.NODE_ENV != 'production';
var crypto = require('crypto');

var rewriteUrlRules = [{
    from: /^http:\/\/(www\.)?ohtuleht\.ee\b/i,
    to: 'http://m.ohtuleht.ee'
}, {
    from: /^(http:\/\/(?:[^.]+\.)?(?:tallinna|tartu)?(?:postimees|tarbija24|e24|elu24|ilmajaam|juhtimine|naine24|valgamaalane|sakala.ajaleht.ee|virumaateataja)\.ee\/(\d+))\/\b/i,
    to: '$1/print/'
}, {
    from: /^(http:\/\/(?:[^.]+\.)?(?:delfi|epl|ekspress|maaleht|aialeht)\.ee)\/[^?]+\?id=(\d+)/i,
    to: '$1/archive/print.php?id=$2'
}, {
    from: /^(http:\/\/(?:[^.]+\.)?(?:ap3|ituudised|best-marketing|ehitusuudised|logistikauudised|toostusuudised|pollumajandus|raamatupidaja|sekretar|kaubandus|bestsales)\.ee)\/(?:Print\.aspx|Default\.aspx)?(?=\?PublicationId)/i,
    to: '$1/Print.aspx'
}, {
    from: /^(http:\/\/(?:www\.)?tartuekspress\.eu\/(?:index\.php)?\?page=\d+&id=\d+).*/i,
    to: '$1&print=1'
}, {
    from: /^(http:\/\/(?:www\.)?kesknadal\.ee\/.*)/i,
    to: '$1&mode=print'
}, {
    from: /^(http:\/\/(?:www\.)?kirikiri\.ee\/)article\.php(.*)/i,
    to: '$1print.php$2'
}, {
    from: /^(http:\/\/(?:www\.)?riigikogu\.ee\/.*)/i,
    to: '$1&op2=print'
}];

var rewriteTextRules = [{
    from: /\s*Aadress http:\/\/.*$/i,
    to: ''
}, {
    from: /\s*See leht on trükitud.*$/i,
    to: ''
}, {
    from: /\s*([\S]|Print|Blogi|www\.delfi\.ee|ärileht.ee)\s*$/mi,
    to: ''
}];

fetchLoop();

function fetchLoop() {


    redisClient.multi().
    select(config.redis.db).
    rpop('article:list').
    exec(function(err, replies) {
        var articleData;

        if (err) {
            console.log('Redis error ' + Date());
            console.log(err);
            setTimeout(fetchLoop, 5000);
            return;
        }

        articleData = replies && replies[1];

        if (!articleData) {
            setTimeout(fetchLoop, 1000);
            return;
        }

        try {
            articleData = JSON.parse(articleData);
        } catch (E) {
            if (debug) {
                console.log('Redis error: invalid JSON ' + Date());
                console.log(E);
            }
            setTimeout(fetchLoop, 5000);
            return;
        }

        if (!articleData.url) {
            if (debug) {
                console.log('JSON error: empty URL ' + Date());
            }
            setTimeout(fetchLoop, 5000);
            return;
        }

        if (articleData.date) {
            articleData.date = new Date(articleData.date);
        }

        if (debug) {
            console.log('Fetching article from ' + articleData.url);
        }
        fetchArticle(articleData);
    });

}

function fetchArticle(articleData) {
    var articleUrl = config.apiUrl.replace(/FETCH_URL/, encodeURIComponent(rewriteUrl(articleData.url)));
    fetch.fetchUrl(articleUrl, {
        timeout: 30 * 1000
    }, function(err, meta, body) {
        var data;

        if (err) {
            console.log('Fetch error ' + Date() + ' ' + articleUrl);
            console.log(err);
            setTimeout(fetchLoop, 5000);
            return;
        }

        if (meta.status != 200) {
            if (debug) {
                console.log('Fetch error: Invalid status ' + meta.status + ' ' + Date());
            }
            setTimeout(fetchLoop, 5000);
            return;
        }

        if (!body || !body.length) {
            if (debug) {
                console.log('Fetch error: empty response ' + Date());
            }
            setTimeout(fetchLoop, 5000);
            return;
        }

        try {
            data = JSON.parse(body && body.toString());
        } catch (E) {
            if (debug) {
                console.log('Fetch error: invalid JSON ' + Date());
                console.log(E);
            }
            setTimeout(fetchLoop, 5000);
            return;
        }

        if (data.error && data.errorCode) {
            if (debug) {
                console.log('Fetch error: invalid source ' + Date());
                console.log(data.error);
            }
            setTimeout(fetchLoop, 5000);
            return;
        }

        if (!data.text) {
            if (debug) {
                console.log('Fetch error: empty article ' + Date());
            }
            process.nextTick(fetchLoop);
            return;
        }

        data.text = rewriteText(data.text ||  '');

        Object.keys(data).forEach(function(key) {
            if (!articleData[key]) {
                articleData[key] = data[key];
            }
        });

        storeArticle(articleData);
    });
}

function storeArticle(articleData) {
    fetch.fetchUrl(config.elasticsearch.replace(/ARTICLE_ID/, crypto.createHash('sha1').update(articleData.url).digest('hex')), {
        method: 'PUT',
        payload: JSON.stringify(articleData)
    }, function(err, meta) {
        if (err) {
            console.log('ElasticSearch error ' + Date());
            console.log(err);
        }

        if (meta && debug) {
            console.log('ElasticSearch response: ' + meta.status);
        }

        process.nextTick(fetchLoop);
    });
}


function rewriteUrl(url) {
    rewriteUrlRules.forEach(function(rule) {
        if (url.match(rule.from)) {
            url = url.replace(rule.from, rule.to);
        }
    });
    return url;
}

function rewriteText(text) {
    rewriteTextRules.forEach(function(rule) {
        if (text.match(rule.from)) {
            text = text.replace(rule.from, rule.to);
        }
    });
    return text;
}
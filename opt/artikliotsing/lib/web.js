'use strict';

var config = require('config');
var pathlib = require('path');
var express = require('express');
var http = require('http');
var searchlib = require('./search');
var sources = require('../sources.json');
var app = express();
var morgan = require('morgan');
var compression = require('compression');
var st = require('st');
var log = require('npmlog');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var feedster = require('feedster');
var packageData = require('../package.json');

var mount = st({
    path: pathlib.join(__dirname, '../public'),
    url: '/',
    dot: false,
    index: false,
    passthrough: true,

    cache: { // specify cache:false to turn off caching entirely
        content: {
            max: 1024 * 1024 * 64
        }
    },

    gzip: false
});

app.set('port', config.port || 8080);
app.disable('x-powered-by');
app.set('views', pathlib.join(__dirname, '../views'));
app.use(compression());
app.use(function(req, res, next) {
    mount(req, res, function() {
        next();
    });
});
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

app.use(methodOverride('X-HTTP-Method-Override'));

// Log requests to console
app.use(morgan(":req[x-forwarded-for] [:date[clf]] \":method :url HTTP/:http-version\" :status :res[content-length] - :response-time ms", {
    stream: {
        write: function(message) {
            message = (message || '').toString();
            if (message) {
                log.info('HTTP', message.replace('\n', '').trim());
            }
        }
    },
    skip: function(req, res) {
        // ignore ping requests
        if (res && req.query && req.query.monitor === 'true') {
            return true;
        }
        return false;
    }
}));

app.set('view engine', 'ejs');

app.get('/', function(req, res) {
    res.render('main', {
        body: 'main',
        query: '',
        title: config.title
    });
});

app.get('/about', function(req, res) {
    res.render('main', {
        body: 'about',
        query: '',
        sources: sources,
        title: config.title
    });
});

app.get('/search.json', function(req, res) {
    if (!req.query.q) {
        return res.redirect('/');
    }
    searchlib.search(req.query.q, 0, config.page_size, function(err, results) {
        if (err) {
            res.status(500);
            res.set('Content-Type', 'application/json; Charset=utf-8');
            return res.send(JSON.stringify({
                error: err.message
            }, false, 4));
        }
        res.set('Content-Type', 'application/json; Charset=utf-8');
        res.send(JSON.stringify({
            total: results.hits.total,
            results: searchlib.formatResults(results)
        }, false, 4));
    });
});

app.get('/search.rss', serveRSS);
app.get('/api/articles.rss', serveRSS);

function serveRSS(req, res) {
    if (!req.query.q) {
        return res.redirect('/');
    }
    searchlib.search(req.query.q, 0, config.page_size, function(err, results) {
        if (err) {
            res.status(500);
            res.set('Content-Type', 'text/plain; Charset=utf-8');
            return res.send(err.message);
        }
        res.set('Content-Type', 'application/rss+xml; charset=utf-8');

        var feed = feedster.createFeed({
            title: config.title,
            description: 'Otsing Eesti veebimeediast',
            link: config.url,
            generator: config.title + ' ' + packageData.version,
            language: 'et-ee',
            atomLink: {
                href: config.url + req.url,
                rel: 'self' // type is automatically for "self"
            }
        });

        searchlib.formatResults(results).forEach(function(result) {
            feed.addItem({
                title: result.title + ' – ' + result.site,
                pubDate: result.date,
                description: result.content,
                content: result.html,
                link: result.url,
                creator: result.author,
                guid: {
                    value: result.id,
                    isPermaLink: false
                }
            });
        });

        res.send(feed.render());
    });
}

app.get('/search', function(req, res) {
    if (!req.query.q) {
        return res.redirect('/');
    }

    var page = Math.abs(req.query.page || 1),
        from = (page - 1) * config.page_size;

    searchlib.search(req.query.q, from, config.page_size, function(err, results) {
        if (err) {
            res.status(500);
            res.set('Content-Type', 'text/plain; Charset=utf-8');
            return res.send(err.message);
        }

        var total = results && results.hits && results.hits.total || 0,
            pages = Math.ceil(total / config.page_size);

        if (page > pages) {
            page = pages || 1;
        }

        res.render('main', {
            body: 'search',
            query: req.query.q,
            encoded_query: encodeURIComponent(req.query.q),
            pages: pages,
            page: page,
            from: from,
            results: results,
            page_list: searchlib.paging(page, pages),
            visible_results: searchlib.formatResults(results),
            fulltext: (req.query.fulltext ||  '').toString().trim().toLowerCase() == 'true',
            title: config.title
        });

    });
});

app.post('/search', function(req, res) {
    if (!req.body.q) {
        res.redirect('/');
    } else {
        res.redirect('/search?q=' + encodeURIComponent(req.body.q ||  ''));
    }
});

http.createServer(app).listen(app.get('port'), function() {
    log.info('Express', 'Express server listening on port %s', app.get('port'));
    try {
        process.setgid('nogroup');
        process.setuid('nobody');
    } catch (E) {
        log.error('App', 'Failed giving up root privileges');
    }
});
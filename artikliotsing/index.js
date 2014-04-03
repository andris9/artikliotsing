var config = require("./config.json"),
    pathlib = require("path"),
    express = require('express'),
    http = require("http"),
    ejs = require('ejs'),
    searchlib = require("./lib/search"),
    moment = require("moment"),
    sources = require("./sources"),
    app = express();

app.configure(function(){
    //app.use(require('node-force-domain').redirect('disposebox.com'));
    app.use(express.compress());

    app.set('port', config.port);
    app.set('views', __dirname + '/views');
    app.set('view engine', 'ejs');
    app.use(express.favicon());
    //app.use(express.logger('dev'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.errorHandler());

    app.use(express.static(pathlib.join(__dirname, 'public')));
});

app.get('/', function(req, res){
    res.render("main", {
        body : "main",
        query: ""
    });
});

app.get('/about', function(req, res){
    res.render("main", {
        body : "about",
        query: "",
        sources: sources
    });
});

app.get('/search.json', function(req, res){
    if(!req.query.q){
        return res.redirect("/");
    }
    searchlib.search(req.query.q, 0, config.page_size, function(err, results){
        if(err){
            throw err;
        }
        res.set('Content-Type', "application/json; Charset=utf-8");
        res.send(JSON.stringify({total: results.hits.total, results: searchlib.formatResults(results)}, false, 4));
    });
});

app.get('/search.rss', serveRSS);
app.get('/api/articles.rss', serveRSS);

function serveRSS(req, res){
    if(!req.query.q){
        return res.redirect("/");
    }
    searchlib.search(req.query.q, 0, config.page_size, function(err, results){
        if(err){
            throw err;
        }
        res.set('Content-Type', "application/rss+xml; Charset=utf-8");
        res.render("rss", {
            title: "kreata.ee:8000",
            query: req.query.q,
            encoded_query: encodeURIComponent(req.query.q),
            domain: req.headers.host || "localhost",
            pub_date: results.hits.hits.length && results.hits.hits[0]._source.found || new Date(),
            results: searchlib.formatResults(results),
            fulltext: (req.query.fulltext || "").toString().trim().toLowerCase() == "true"
        });
    });
}

app.get('/search', function(req, res){
    if(!req.query.q){
        return res.redirect("/");
    }

    var page = Math.abs(req.query.page || 1),
        from = (page - 1) * config.page_size;

    searchlib.search(req.query.q, from, config.page_size, function(err, results){
        if(err){
            throw err;
        }

        var total = results && results.hits && results.hits.total || 0,
            pages = Math.ceil(total / config.page_size);

        if(page > pages){
            page = pages || 1;
        }

        res.render("main", {
            body : "search",
            query: req.query.q,
            encoded_query: encodeURIComponent(req.query.q),
            pages: pages,
            page: page,
            from: from,
            results: results,
            page_list: searchlib.paging(page, pages),
            visible_results: searchlib.formatResults(results),
            fulltext: (req.query.fulltext || "").toString().trim().toLowerCase() == "true"
        });

    });
});

app.post('/search', function(req, res){
    if(!req.body.q){
        res.redirect("/");
    }else{
        res.redirect("/search?q=" + encodeURIComponent(req.body.q || ""));
    }
});

http.createServer(app).listen(app.get('port'), function(){
    console.log("Express server listening on port " + app.get('port'));
    try{
        process.setgid("nogroup");
        process.setuid("nobody");
    }catch(E){
        console.log("Failed giving up root privileges");
    }
});

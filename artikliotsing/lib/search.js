'use strict';

var config = require("../config"),
    fetch = require("fetch"),
    moment = require("moment");

moment.lang("et");

module.exports.paging = paging;
module.exports.search = search;
module.exports.formatResults = formatResults;

function formatResults(results){
    if(!results || !results.hits || !results.hits.hits){
        return [];
    }
    return results.hits.hits.map(function(doc){
        var element = {
            url: doc._source.url,
            site: doc._source.site,
            humanized_date: moment(doc._source.date).fromNow(),
            date: new Date(doc._source.date),
            found: new Date(doc._source.found),
            title: keepStrong(doc.highlight && doc.highlight.title && doc.highlight.title.join(" ... ").trim() || doc._source.title),
            content: keepStrong(doc.highlight && doc.highlight.text && doc.highlight.text.join(" ... ").trim() || ""),
            html: doc._source.text?"<p>" + doc._source.text.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n+/g, "</p><p>") + "</p>":""
        };

        if(doc._source && doc._source.media){
            for(var i=0, len=doc._source.media.length; i<len; i++){
                if(doc._source.media[i].type == "image"){
                    element.image = doc._source.media[i].link;
                    break;
                }
            }
        }

        if(doc._source.author){
            element.author = doc._source.author;
        }

        return element;
    });
}

function keepStrong(str){
    return str.replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/&lt;strong&gt;/g, "<strong>").replace(/&lt;\/strong&gt;/g, "</strong>");
}

function paging(page, pages){
    var visible = 8,
        range = Math.max(page - Math.round(visible/2)),
        rangeMin = page - Math.round(visible/2),
        rangeMax = page + Math.round(visible/2),
        pageList = [];

    if(pages <= visible){
        rangeMin = 1;
        rangeMax = pages;
    }else{
        if(rangeMin < 1){
            rangeMax += Math.abs(rangeMin) + 1
            rangeMin = 1;
        }else if(rangeMax > pages){
            rangeMin -= rangeMax - pages;
            rangeMax = pages;
        }
    }

    for(var i=rangeMin; i<=rangeMax; i++){
        pageList.push({
            page: i,
            active: i == page
        });
    }

    if(rangeMin > 1){
        pageList.unshift({disabled: true});
    }

    if(rangeMax < pages){
        pageList.push({disabled: true});
    }

    return pageList;
}

function search(query, from, size, callback){
    var searchObj = {
            "sort" : [
                { "found" : {"order" : "desc"} }
            ],
            "query" : {
              "query_string" : {
                    "fields" : ["text", "title^5"],
                    "query" : query || "",
                    "default_operator": "AND"
                }
            },
            "from": from || 0,
            "size": size || 25,
            "highlight" : {
                "pre_tags" : ["<strong>"],
                "post_tags" : ["</strong>"],
                "fields" : {
                    "title" : {"fragment_size" : 500, "number_of_fragments" : 1},
                    "text" : {"fragment_size" : 250, "number_of_fragments" : 1}
                }
            }
        };

    fetch.fetchUrl(config.elasticsearch, {
      method:"GET",
      payload: JSON.stringify(searchObj)
    }, function(err, meta, body){
        var docs;
        if(err){
            return callback(err);
        }
        if(meta.status != 200){
            return callback(new Error("Invalid response status from Storage server " + meta.status));
        }

        try{
            docs = JSON.parse(body.toString());
        }catch(E){
            console.log(E);
            return callback(E);
        }
//console.log(require("util").inspect(docs, false, 11));
        return callback(null, docs);
    });
}
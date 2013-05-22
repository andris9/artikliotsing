var config = require("./config.json"),
    cluster = require('cluster');

if (cluster.isMaster) {
    for (var i = 0; i < config.workers; i++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
        cluster.fork();
    });
} else {
    console.log("Starting worker "+process.pid);
    require("./fetcher");
}
'use strict';

var config = require('config');
var log = require('npmlog');

if (!config.diffbotToken) {
    log.error('diffbot', 'Token not found! Configure at /etc/artikliotsing.d/default.json');
}

require('./lib/web');
require('./lib/findarticle');
require('./lib/getarticle');
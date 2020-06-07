const Twitter = require('twitter');
const config = require('./config');
const client = new Twitter(config);
module.exports = client;
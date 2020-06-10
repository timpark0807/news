// FETCH CREDENTIALS
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env['API_KEY']
const API_SECRET = process.env['API_SECRET']
const ACCESS_KEY = process.env['ACCESS_KEY']
const ACCESS_SECRET = process.env['ACCESS_SECRET']

const twitterApp = {
                    consumer_key: API_KEY,
                    consumer_secret: API_SECRET,
                    access_token_key: ACCESS_KEY,
                    access_token_secret: ACCESS_SECRET
                    };

module.exports = twitterApp;

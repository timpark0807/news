// FETCH CREDENTIALS
const dotenv = require('dotenv');
dotenv.config();
const API_KEY = process.env['API_KEY']
const API_SECRET = process.env['API_SECRET']
const ACCESS_KEY = process.env['ACCESS_KEY']
const ACCESS_SECRET = process.env['ACCESS_SECRET']

// INIT TWITTER CLIENT
var Twitter = require('twitter');
var client = new Twitter({
  consumer_key: API_KEY,
  consumer_secret: API_SECRET,
  access_token_key: ACCESS_KEY,
  access_token_secret: ACCESS_SECRET
});

// #1. Subscription Service 
function getTweets() {
    var params = {q: '@stocknewsbot subscribe'};

    client.get('search/tweets', params, function(error, tweets, response) {
        console.log(tweets.statuses[0])
    });
};

function addSubscription(body) {
};

function removeSubscription(body) {
};


// #2. News Tweeting Service   
function sendTweets(){ 
    const request = require('request');
    var ticker = "TSLA";
    var token = "pk_9c9d7383c24748a8adaa5d85544c5fa9";
    var url = "https://cloud.iexapis.com/stable/stock/" + ticker + "/news?last=1&token=" + token;

    request(url, {json:true}, (err, res, body) => {
        if (err) { return console.log(err); }
        var response = res.body
        var article = {"headline":response[0].headline, "url":response[0].url}
        console.log(article)
    
        client.post('statuses/update', {status: article.headline + " " + article.url},  function(error, tweet, response) {
            if(error) throw error;
          });
      });    
};

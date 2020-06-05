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
function subscriptionService() {
    var params = {q: '@stocknewsbot'};
    client.get('search/tweets', params, function(error, tweets, response) {
        if (!error) {
            var todo = processTweets(tweets);
            for (let i=todo.length-1; i>=0; i--){
                var currToDo = todo[i];
                if (currToDo["action"] == "subscribe") {
                    processSubscribe(currToDo);
                } else if (currToDo["action"] == "unsubscribe") {
                    processUnSubscribe(currToDo);
                }
            }
        }
    });
};

// Subscription Service Helper Functions 
function processSubscribe(currToDo) {
    console.log("Subscribing")
    console.log(currToDo);
};

function processUnSubscribe(currToDo) {
    console.log("Unsubscribing")
    console.log(currToDo);
};

function processMessage(message) {
    var res = message.toLowerCase().split(" "); 
    return [res[1], res[2]]; 
};

function processTweets(tweets) {
    var mapping = [];
    for (let i=0; i < tweets.statuses.length; i++) {
        var currTweet = tweets.statuses[i];
        var msg = processMessage(currTweet.text);
        var action = msg[0];
        var ticker = msg[1]; 
        if (action !== "subscribe" && action !== "unsubscribe") { continue };
        var currJSON = {"user": currTweet.user.name, 
                        "message": currTweet.text, 
                        "action": action, 
                        "ticker": ticker, 
                        "timestamp": currTweet.created_at};

        mapping.push(currJSON);
    }
    return mapping;
}

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
        var intro = "Here's your " + ticker + " article for today! \n"
        console.log(article)
    
        client.post('statuses/update', {status: intro + article.headline + " " + article.url},  function(error, tweet, response) {
            if(error) throw error;
          });
      });    
};

subscriptionService();
sendTweets();
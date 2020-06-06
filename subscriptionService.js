const client = require("./initTwitterClient.js")
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});

// #1. Subscription Service 
exports.subscriptionService = function () {
    const params = {q: '@stocknewsbot'};
    client.get('search/tweets', params, function(error, rawTweets, response) {
        if (!error) {
            const tweets = getTweets(rawTweets);
            for (let i=tweets.length-1; i>=0; i--){
                processTweet(tweets[i]);
            }
        }
    });
};

// Subscription Service Helper Functions 
function processSubscribe(data, ticker, username) {

    var currSubscriptions = data.Item.subscriptions.SS;   

    // Verify that subscription does not already exist 
    if (!currSubscriptions.includes(ticker)){

        // Add New subscription to User's subscriptions 
        currSubscriptions.push(ticker);
        var newParams = {
            Item: {
            "username":{S:username},
            "subscriptions":{SS:currSubscriptions},
            "updated":{S:"2020-06-04"}
                },
            TableName: "stocknews-twitter-db"
        }
    
        // Send the request to DynamoDB
        dynamodb.putItem(newParams, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });
    }

};

function processTweet2(tweet) {
    if (tweet["action"] == "subscribe") {
        processSubscribe(tweet);
    } else if (tweet["action"] == "unsubscribe") {
        processUnSubscribe(tweet);
    }
};

function processTweet(tweet) {
    const ticker = tweet.ticker.toUpperCase();
    const username = tweet.user;
    var params = getQueryParams(tweet);

    dynamodb.getItem(params, function(error, data) {
        if (!error) {
            console.log(tweet);
            if (tweet["action"] == "subscribe") {
                processSubscribe(data, ticker, username);
            } else if (tweet["action"] == "unsubscribe") {
                processUnSubscribe(data, ticker, username);
            }
        }
    });
}

function processUnSubscribe(data, ticker, username) {

    var currSubscriptions = data.Item.subscriptions.SS;

    // Verify ticker we want to unsubscribe is in the current subscriptions 
    if (currSubscriptions.includes(ticker)) {

        // remove that ticker
        const index = currSubscriptions.indexOf(ticker);
        currSubscriptions.splice(index, 1);

        // create new item to PUT
        var newParams = {
            Item: {
            "username":{S:username},
            "subscriptions":{SS:currSubscriptions},
            "updated":{S:"2020-06-04"}
                },
            TableName: "stocknews-twitter-db"
        }
    
        // Send the request to DynamoDB
        dynamodb.putItem(newParams, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });
    }
 
};

function getQueryParams(tweet) {
    var params = {
        Key: {"username": {S:tweet.user}},
        TableName: "stocknews-twitter-db"
    }
    return params; 
};

function getTweets(tweets) {
    const processedTweets = [];
    for (let i=0; i < tweets.statuses.length; i++) {
        let currTweet = tweets.statuses[i];
        let output = getActionAndTicker(currTweet.text);
        let action = output[0];
        let ticker = output[1]; 
        if (action !== "subscribe" && action !== "unsubscribe") { 
            continue 
        } else {
        let processedTweet = {"user": "@" + currTweet.user.name, 
                              "message": currTweet.text, 
                              "action": action, 
                              "ticker": ticker, 
                              "timestamp": currTweet.created_at}
        processedTweets.push(processedTweet);
        }   
    }
    return processedTweets;
};

function getActionAndTicker(message) {
    const res = message.toLowerCase().split(" "); 
    return [res[1], res[2]]; 
};


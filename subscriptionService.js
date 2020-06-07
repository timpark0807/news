const client = require("./twitterClient.js")
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});

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

function processTweet(tweet) {
    const ticker = tweet.ticker.toUpperCase();
    const username = tweet.user;
    var params = getQueryParams(tweet);

    dynamodb.getItem(params, function(error, data) {
        if (!error) {
            if (tweet["action"] == "subscribe") {
                processSubscribe(data, ticker, username);
            } else if (tweet["action"] == "unsubscribe") {
                processUnSubscribe(data, ticker, username);
            }
        }
    });
}

function processSubscribe(data, ticker, username) {

    var currSubscriptions = data.Item.subscriptions.SS;   

    // Verify that subscription does not already exist 
    if (!currSubscriptions.includes(ticker)){

        // create updated item to PUT 
        currSubscriptions.push(ticker);
        var newParams = {
            Item: {
            "username":{S:username},
            "subscriptions":{SS:currSubscriptions},
            "updated":{S:"2020-06-04"}
                },
            TableName: "stocknews-twitter-db"
        }
    
        // Send the PUT request to DynamoDB
        dynamodb.putItem(newParams, function(err, data) {
            if (err) console.log(err, err.stack); // an error occurred
            else     console.log(data);           // successful response
        });
    }

};

function processUnSubscribe(data, ticker, username) {

    var currSubscriptions = data.Item.subscriptions.SS;

    // Verify ticker we want to unsubscribe is in the current subscriptions 
    if (currSubscriptions.includes(ticker)) {

        // remove that ticker
        const index = currSubscriptions.indexOf(ticker);
        currSubscriptions.splice(index, 1);

        // create updated item to PUT
        var newParams = {
            Item: {
            "username":{S:username},
            "subscriptions":{SS:currSubscriptions},
            "updated":{S:"2020-06-04"}
                },
            TableName: "stocknews-twitter-db"
        }
    
        // Send the PUT request to DynamoDB
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
    tweets.forEach(currTweet => {
        let currTweet = tweets.statuses[i];
        let output = getActionAndTicker(currTweet.text);
        let action = output[0];
        let ticker = output[1]; 
        if (action !== "subscribe" && action !== "unsubscribe") { 
            // TODO: Place in SQS to reply to tweet. 
            continue 
        } else {
        let processedTweet = {"user": "@" + currTweet.user.name, 
                              "message": currTweet.text, 
                              "action": action, 
                              "ticker": ticker, 
                              "timestamp": currTweet.created_at}
        processedTweets.push(processedTweet);
        }   
    })
    return processedTweets;
};

function getActionAndTicker(message) {
    const res = message.toLowerCase().split(" "); 
    return [res[1], res[2]]; 
};


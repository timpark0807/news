const client = require("./twitterClient.js")
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});
const sqs = new AWS.SQS({region:'us-east-1'});

// Main Function Handler
exports.handler = async (events) => {
    const rawTweets = await promiseGetRawTweets({ q: '@stocknewsbot' });
    const tweets = await getTweets(rawTweets);

    // Iterate backwards through the tweets to process oldest tweet first
    for (let i=tweets.length-1; i>=0; i--){
        const tweet = tweets[i];
        const ticker = tweet.ticker.toUpperCase();
        const params = getQueryParams(tweet);

        // ToDo: Check DynamoDB if tweet has already been processed  

        let userData = await promiseGetUserData(params);

        if (tweet["action"] == "subscribe") {
            await processSubscribe(userData, ticker);
        } else if (tweet["action"] == "unsubscribe") {
            await processUnSubscribe(userData, ticker);
        }
    };
}

// Subscribe Functionality 
async function processSubscribe(data, ticker) {

    const [currSubscriptions, username] = parseData(data);

    // Check that we already not already subscribed to the ticker 
    if (!currSubscriptions.includes(ticker)){

        // Add item to subscriptions and create a new item to PUT 
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
        await promisePutItem(newParams);
    }
}

// Unsubscribe Functionality
async function processUnSubscribe(data, ticker) {

    const [currSubscriptions, username] = parseData(data);

    // Check the ticker we want to unsubscribe from is in the user's current subscriptions 
    if (currSubscriptions.includes(ticker)) {

        // Remove that ticker
        const tickerIndex = currSubscriptions.indexOf(ticker);
        currSubscriptions.splice(tickerIndex, 1);

        // Create an updated item to PUT
        var newParams = {
            Item: {
            "username":{S:username},
            "subscriptions":{SS:currSubscriptions},
            "updated":{S:"2020-06-04"}
                },
            TableName: "stocknews-twitter-db"
        }
    
        // Send the PUT request to DynamoDB
        await promisePutItem(newParams);
    }
}


// Promise Wrappers for Async Functions
function promiseGetRawTweets(params){
    return new Promise((resolve, reject) => {
        client.get('search/tweets', params, (error, data, response) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}

function promiseGetUserData(params) {
    return new Promise((resolve, reject) => {
        dynamodb.getItem(params, function(error, data) {        
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    });
}

function promisePutItem(params){
    return new Promise((resolve, reject) => {
        dynamodb.putItem(params, (error, data) => {
            if (error) {
                reject(error);
            } else {
                resolve(data);
            }
        });
    })
}

function promiseLoadQueue(params) {
    return new Promise((resolve, reject) => {
        sqs.sendMessage(params, (error, data) => {
            if (error) {
                reject(error);
            }
            if (!error){
                resolve(data);
            }
        });         
    });
}

// Miscellaneous Helper Functions 
async function getTweets(tweets) {
    const processedTweets = [];
    for (let i=0; i<tweets.statuses.length; i++) {
        let currTweet = tweets.statuses[i];
        let [action, ticker] = getActionAndTicker(currTweet.text);

        if (action !== "subscribe" && action !== "unsubscribe") { 
            await promiseLoadQueue({QueueUrl: process.env['SQS_FAIL_URL'], MessageBody: currTweet.text});
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
}

function getActionAndTicker(message) {
    const res = message.toLowerCase().split(" "); 
    return [res[1], res[2]]; 
}

function getQueryParams(tweet) {
    var params = {
        Key: {
            "username": {
                S:tweet.user
            }
        },
        TableName: "stocknews-twitter-db"
    }
    return params; 
}

function parseData(data) {
    const currSubscriptions = data.Item.subscriptions.SS;
    const username = data.Item.username.S; 
    return [currSubscriptions, username];
}

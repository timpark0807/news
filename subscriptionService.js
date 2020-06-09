const client = require("./twitterClient.js")
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});


// Main Function Handler
exports.handler = async (events) => {
    const params = {q: '@stocknewsbot'};
    console.log("a. start");
    const tweets = await promiseGetRawTweets(params);

    // Iterate backwards through the tweets to process oldest tweet first
    for (let i=tweets.length-1; i>=0; i--){
        console.log("2.1 starting process tweet");
        const tweet = tweets[i];
        const ticker = tweet.ticker.toUpperCase();
        const params = getQueryParams(tweet);
        let userData = await promiseGetUserData(params);

        if (tweet["action"] == "subscribe") {
            console.log("3.1 start process subsribe")
            await processSubscribe(userData, ticker);
            console.log("3.2 finish process subsribe")
        } else if (tweet["action"] == "unsubscribe") {
            await processUnSubscribe(userData, ticker);
        }
        console.log("2.2 finished process tweet");
    };
    console.log("b. finished");
}

// Subscribe Functionality 
async function processSubscribe(data, ticker) {

    const currSubscriptions = data.Item.subscriptions.SS;   
    const username = data.Item.username.S; 

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
};

// Unsubscribe Functionality
async function processUnSubscribe(data, ticker) {

    const currSubscriptions = data.Item.subscriptions.SS;
    const username = data.Item.username.S; 

    // Check the ticker we want to unsubscribe from is in the user's current subscriptions 
    if (currSubscriptions.includes(ticker)) {

        // Remove that ticker
        const index = currSubscriptions.indexOf(ticker);
        currSubscriptions.splice(index, 1);

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
};


// Promise Wrappers for Async Functions
function promiseGetRawTweets(params){
    return new Promise((resolve, reject) => {
        client.get('search/tweets', params, (error, rawTweets, response) => {
            if (error) {
                reject(error);
            } else {
                console.log("1.1 getting raw tweets");
                const tweets = getTweets(rawTweets);
                console.log("1.2 finished raw tweets");
                resolve(tweets);
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
                console.log("putting in db");
                resolve(data);
            }
        });
    })
}


// Miscellaneous Helper Functions 
function getTweets(tweets) {
    const processedTweets = [];
    for (let i=0; i<tweets.statuses.length; i++) {
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
    }
    return processedTweets;
};

function getActionAndTicker(message) {
    const res = message.toLowerCase().split(" "); 
    return [res[1], res[2]]; 
};

function getQueryParams(tweet) {
    var params = {
        Key: {"username": {S:tweet.user}},
        TableName: "stocknews-twitter-db"
    }
    return params; 
};
const client = require("./twitterClient.js")
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});
const sqs = new AWS.SQS({region:'us-east-1'});

// Load the SQS queue with tasks. 
function loadSubscriptions() {
    params = {TableName: "stocknews-twitter-db"}

    // Get all items from the DDB table 
    dynamodb.scan(params, function(error, data) {
        if (!error){
            processItems(data.Items);          
        }
    });         
};

function processItems(items){
    // Iterate over each username 

    items.forEach(item => {
        var username = item.username.S
        var currSubscriptions = item.subscriptions.SS

        // Iterate over each ticker for that username  
        currSubscriptions.forEach(currSubscription =>{
            loadQueue(username, currSubscription);
        })
    })
};

// Load the SQS with the username + ticker to tweet to
function loadQueue(username, ticker) {
    params = {
        QueueUrl: process.env['SQS_URL'],
        MessageBody: username + "_" + ticker
    }
    sqs.sendMessage(params, function(error, data) {
        if (!error) {
            console.log(data);
        }
    });
};

// Lambda function polls from SQS queue 
// Message details are in the event parameter
function main(event) {
    const records = event.Records;
    records.forEach(record => {
        processRecord(record.body);
    })
};

function processRecord(record) {
    const res = record.split("_");
    const username = res[0];
    const ticker = res[1].slice(1);
    sendTweet(username, ticker);
};

// Send the tweet  
function sendTweet(username, ticker){ 
    const request = require('request');
    const token = process.env['API_TOKEN']
    var url = "https://cloud.iexapis.com/stable/stock/" + ticker + "/news?last=1&token=" + token;
    console.log(url);
    request(url, {json:true}, (error, res, body) => {
        if (!error) {  
            var response = res.body
            var article = {"headline":response[0].headline, "url":response[0].url}
            console.log(article)
            const status = createMessage(username, ticker, article)
            client.post('statuses/update', {status: status},  function(error, tweet, response) {
                if(error) console.log(error);
        });
        }
    });    
};

function createMessage(username, ticker, article) {
    var intro = username + " Here's your $" + ticker + " article for today! \n"
    return intro + article.headline + " " + article.url
}

loadSubscriptions();
// main(event);

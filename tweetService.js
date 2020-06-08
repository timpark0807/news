const client = require("./twitterClient.js")
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});
const sqs = new AWS.SQS({region:'us-east-1'});

// Load the SQS queue with tasks. 
exports.loadSubscriptions = function () {
    params = {TableName: "stocknews-twitter-db"}

    // Get all items from the DDB table 

    console.log("a. start")
    dynamodb.scan(params, (error, data) => {
        if (!error){
            console.log("1.1 start process items")
            processItems(data.Items);    
            console.log("1.2 end process items")
        }
    });         
    console.log("b. finish")

};

function processItems(items){
    // Iterate over each username 

    items.forEach(item => {
        var username = item.username.S
        var currSubscriptions = item.subscriptions.SS

        // Iterate over each ticker for that username  
        currSubscriptions.forEach(currSubscription => {
            console.log("2.1 start load queue")
            loadQueue(username, currSubscription);
            console.log("2.2 end load queue")

        })
    })
};

// Load the SQS with the username + ticker to tweet to
function loadQueue(username, ticker) {
    params = {
        QueueUrl: process.env['SQS_URL'],
        MessageBody: username + "_" + ticker
    }
    sqs.sendMessage(params, (error, data) => {
        if (!error) {
            console.log("send message"); 
            console.log(data);
        }
    });
};

const event = {
                "Records": [
                {
                    "body": "@stocknewsbot_$SNAP"
                },
                {
                    "body": "@stocknewsbot_$FB"
                }
                ]
            }

// Lambda function polls from SQS queue 
// Message details are in the event parameter
function main(event) {
    const records = event.Records;
    console.log("a. start")
    records.forEach(record => {
        console.log("1.1 start process record")
        processRecord(record.body);
        console.log("1.2 end process record")
    })
    console.log("b. finish")
};

function processRecord(record) {
    const res = record.split("_");
    const username = res[0];
    const ticker = res[1].slice(1);
    console.log("2.1 start send tweet")
    sendTweet(username, ticker);
    console.log("2.2 end send tweet")

};

// Send the tweet  
async function sendTweet(username, ticker) { 
    const request = require('request');
    const token = process.env['API_TOKEN']
    var url = "https://cloud.iexapis.com/stable/stock/" + ticker + "/news?last=1&token=" + token;

    console.log("3.1 start request")
    request(url, {json:true}, (error, res, body) => {
        if (!error) {  
            var response = res.body
            var article = {"headline":response[0].headline, "url":response[0].url}
            const status = createMessage(username, ticker, article)
            client.post('statuses/update', {status: status},  function(error, tweet, response) {
                console.log("tweet");
                if(error) console.log(error);
        });
        }
    });    
    console.log("3.2 end request")
};

function createMessage(username, ticker, article) {
    var intro = username + " Here's your $" + ticker + " article for today! \n"
    return intro + article.headline + " " + article.url
}

main(event);

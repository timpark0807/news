const client = require("./initTwitterClient.js")
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
    for (let i = 0; i < items.length; i++){
        var username = items[i].username.S
        var currSubscriptions = items[i].subscriptions.SS

        // Iterate over each ticker for that username  
        for (let j = 0; j < currSubscriptions.length; j++) {
            loadQueue(username, currSubscriptions[j]);
        }
    }
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


// Poll from SQS queue 

function pollQueue(){

}


    // Send the tweet 
function sendTweets(){ 
    const request = require('request');
    var ticker = "TSLA";
    var token = process.env['API_TOKEN']
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


loadSubscriptions();

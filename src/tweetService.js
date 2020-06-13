const client = require("./twitterClient.js")

// Lambda function polls from SQS queue containing subscriptions we need to fulfill
// Message details are in the event parameter
async function main(event) {
    const records = event.Records;
    for (let i=0; i<records.length; i++){
        await processRecord(records[i].body);
    }
};

async function processRecord(record) {
    const res = record.split("_");
    const username = res[0];
    const ticker = res[1].slice(1);
    await sendTweet(username, ticker);
};

async function sendTweet(username, ticker) { 
    const token = process.env['API_TOKEN']
    const url = "https://cloud.iexapis.com/stable/stock/" + ticker + "/news?last=1&token=" + token;
    const article = await promiseGetArticle(url)
    const message = createMessage(username, ticker, article)

    await promiseSendTweet(message);
};

function promiseGetArticle(url) {
    const request = require('request');

    return new Promise((resolve, reject) => {
        request(url, {json:true}, (error, res, body) => {
            if (error) {
                reject(error);
            } else {  
                resolve(res);
            }
        });    
    })
}

function promiseSendTweet(message) {
    return new Promise((resolve, reject) => {
        client.post('statuses/update', {status: message},  function(error, tweet, response) {
            if(error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    })
}

function createMessage(username, ticker, article) {
    var intro = username + " Here's your $" + ticker + " article for today! \n"
    return intro + article.body[0].headline + " " + article.body[0].url
}



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
main(event)
const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({region:'us-east-1'});
const sqs = new AWS.SQS({region:'us-east-1'});

// Load the SQS queue with tasks. 
exports.loadSubscriptions = async function () {
    // Get all items from the DDB table to load into SQS 
    const userSubscriptionData = await promiseGetSubscriptionData({TableName: "stocknews-twitter-db"}); 

    // userSubscriptionData.Items = [item1, item2, ..., itemN]
    // item = {username:username, subscriptions:[ticker1, ticker2, ..., tickerN]}
    for (let i=0; i<userSubscriptionData.Items.length; i++){
        let item = userSubscriptionData.Items[i];
        let username = item.username.S
        let currUserSubscriptions = item.subscriptions.SS

        // Iterate over each ticker for that username  
        for (let j=0; j<currUserSubscriptions.length; j++) {
            let currSubscription = currUserSubscriptions[j];
            console.log("2.1 start load queue")
            params = {
                QueueUrl: process.env['SQS_URL'],
                MessageBody: username + "_" + currSubscription
            }
            await promiseLoadQueue(params);
            console.log("2.2 end load queue")
        }
    }
    console.log("b. finish")
};

function promiseGetSubscriptionData(params){
    return new Promise((resolve, reject) => {
        dynamodb.scan(params, (error, data) => {
            if (error) {
                reject(error);
            }
            if (!error){
                console.log("getting data");
                resolve(data);
                console.log("finished getting data");
            }
        });         
    });
}

// Load the SQS with the username + ticker to tweet to
function promiseLoadQueue(params) {
    return new Promise((resolve, reject) => {
        sqs.sendMessage(params, (error, data) => {
            if (error) {
                reject(error);
            }
            if (!error){
                console.log("loading queue");
                resolve(data);
            }
        });         
    })
}
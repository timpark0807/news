const client = require("./twitterClient.js")

replyOrNah = async function (event) {
    const records = event.Records;
    console.log("a. start")
    
    for (let i=0; i<records.length; i++){
        const [username, action] = parseSQSMessage(records[i].body);

        let a = await editDistance(action, "subscribe");
        if (a < 5) {
            await promiseSendTweet(username + " I think you meant");
            continue
        } 

        let b = await editDistance(action, "unsubscribe");
        if (b < 5) {
            await promiseSendTweet(username + " I think you meant 2");
        }
    }
    console.log("b. finish")
};

function parseSQSMessage(message) { 
    const res = message.toLowerCase().split("_"); 
    return [res[0], res[1]]
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

function editDistance(word1, word2) { 
    if (word1.length > 14) {
        return word1.length;
    }
    const word1Len = word1.length;
    const word2Len = word2.length;
    
    const dp = [];
    
    for (let i = 0; i <= word1Len; i++) {
        dp[i] = new Array(word2Len + 1).fill(0);
        dp[i][0] = i;
    }
    
    for (let j = 1; j <= word2Len; j++) {
        dp[0][j] = j;
    }
    
    for (let i = 1; i <= word1Len; i++) {
        for (let j = 1; j <= word2Len; j++) {
            if (word1.charAt(i - 1) === word2.charAt(j - 1)) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp[word1Len][word2Len];

}


const event = {
    "Records": [
    {
        "body": "@FENDISEATBELT_sbscribeasdfasdf"
    },
    {
        "body": "@FENDISEATBELT_uncribe"
    }
    ]
}
replyOrNah(event)
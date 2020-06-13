# Stock News Twitter Service
Daily tweets containing stock news articles. Built with Node.js and AWS.

## How to Use the Service

**Subscribe** to a stock by tweeting `@stocknewsbot subscribe $TICKER`

**Unsubscribe** from a stock by tweeting `@stocknewsbot unsubscribe $TICKER`

## Architecture 
The application is composed of the following microservices:
1. Subscription Service
2. Queue Loader Service
3. Tweet Service
4. Error Handling Service

### Diagram 

![Imgur](https://i.imgur.com/jBB7N2t.png)


# Service Overview

## Subscription Service
The subscription service begins by retreiving tweets containing the keyword `@stocknewsbot`  via the Twitter API. We parse each retrieved tweet to check if the tweet is a subscription request. A tweet is a subscription request if the first word following `@stocknewsbot` is either `subscribe` or `unsubscribe`. 

If the tweet is a valid subscription request, we perform the subscribe/unsubscribe action for the given ticker.  If we encounter an error, we place the tweet in the Error Handling Queue for additional processing. 

User subscriptions are stored in DynamoDB the following format: 
```
item = {
        username: string,
        subscriptions: [string]
	   }
```
Subscriptions are processed by appending the `$TICKER` to the the `item.subscriptions` array. Unsubscriptions are processed by removing the `$TICKER` from the `item.subscriptions` array.

## Queue Loader Service
The queue loader scans the DynamoDB table to retreive all current users and their stock subscriptions. 

Each row in the resulting scan represents a task that must be completed. The service adds these tasks to an SQS queue in the following format: `@username_$TICKER`. 

## Tweet Service

The tweet service polls from the loaded SQS Queue and processes the message. The message is parsed to retrieve the `username` and `stock ticker` of the current task. 

The `stock ticker` is used as a query string parameter in an API request to the CloudIEX Financial API. We retreive the news article for that stock from the response. 

Finally, we compose and send a tweet containing the news article to the `username` via the Twitter API.

## Error Handling Service
Tweets that fail to be processed as a `subscribe` or `unsubscribe` action are processed for error handling. 

This service polls off the Error Handling queue and runs an Edit Distance DP algorithm on the failed action. The action is the first word directly after `@stocknewsbot` in the tweet. 

If the Edit Distance between the failed action and `subscribe` or `unsubscribe` is less than 4, we reply back to the user asking if they meant `subscribe` or `unsubscribe`.

**Case 1**
```
Error Tweet: @stocknewsbot sscribe $TSLA

Failed action -> 'sscribe' 

Edit Distance between 'sscribe' and 'subscribe' is less than 4.
-> So reply to the tweet asking if they meant to 'subscribe'. 
```
 
 **Case 2**
 ```
Error Tweet: @stocknewsbot Hello World!

Failed action -> 'Hello' 

Edit Distance between 'sscribe' and 'subscribe' is greater than 4.
-> So do not reply to the tweet.
```
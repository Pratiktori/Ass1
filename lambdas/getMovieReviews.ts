import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { 
  DynamoDBDocumentClient, 
  QueryCommand,
  ScanCommand
} from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const movieId = event.pathParameters?.movieId;
    const reviewId = event.queryStringParameters?.reviewId;
    const reviewerEmail = event.queryStringParameters?.reviewerEmail;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movie ID in path" }),
      };
    }

    let command;
    if (reviewId) {
      // Get specific review
      command = new QueryCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        KeyConditionExpression: "movieId = :movieId AND reviewId = :reviewId",
        ExpressionAttributeValues: {
          ":movieId": parseInt(movieId),
          ":reviewId": reviewId
        }
      });
    } else if (reviewerEmail) {
      // Search by reviewer email (using GSI)
      command = new QueryCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        IndexName: "ReviewerEmailIndex",
        KeyConditionExpression: "reviewerEmail = :email",
        FilterExpression: "movieId = :movieId",
        ExpressionAttributeValues: {
          ":email": reviewerEmail,
          ":movieId": parseInt(movieId)
        }
      });
    } else {
      // Get all reviews for movie
      command = new QueryCommand({
        TableName: process.env.REVIEWS_TABLE_NAME,
        KeyConditionExpression: "movieId = :movieId",
        ExpressionAttributeValues: {
          ":movieId": parseInt(movieId)
        }
      });
    }

    const result = await ddbDocClient.send(command);

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        data: result.Items,
        count: result.Count
      }),
    };

  } catch (error) {
    console.error("[ERROR]", error);
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};

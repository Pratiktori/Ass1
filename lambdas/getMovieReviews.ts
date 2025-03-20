import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: 'eu-west-1' });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));
    const movieId = event.pathParameters?.movieId;

    if (!movieId) {
      return {
        statusCode: 400,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "Missing movie ID in path" }),
      };
    }

    const params = {
      TableName: 'MovieReviews',
      KeyConditionExpression: "movieId = :movieId",
      ExpressionAttributeValues: {
        ":movieId":  { N: movieId }
      },
    };
    const command = new QueryCommand(params);
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

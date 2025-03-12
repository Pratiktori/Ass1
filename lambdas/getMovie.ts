import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: process.env.REGION });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler: APIGatewayProxyHandlerV2 = async (event, context) => {
  const movieId = event.pathParameters?.movieId;
  const includeCast = event.queryStringParameters?.cast === 'true';

  if (!movieId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "movieId is required" }),
    };
  }

  try {
    const getMovieCommand = new GetCommand({
      TableName: process.env.MOVIES_TABLE_NAME,
      Key: { movieId: parseInt(movieId) },
    });

    const movieResult = await ddbDocClient.send(getMovieCommand);
    if (!movieResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: "Movie not found" }),
      };
    }

    const responseBody: any = { movie: movieResult.Item };

    if (includeCast) {
      const queryCastCommand = new QueryCommand({
        TableName: process.env.CAST_TABLE_NAME,
        KeyConditionExpression: "movieId = :movieId",
        ExpressionAttributeValues: { ":movieId": parseInt(movieId) },
      });

      const castResult = await ddbDocClient.send(queryCastCommand);
      responseBody.cast = castResult.Items;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody),
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error", error }),
    };
  }
};

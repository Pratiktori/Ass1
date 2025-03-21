import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    console.log("[EVENT]", JSON.stringify(event));

    const movieId = event.pathParameters?.movieId;
    const requestBody = JSON.parse(event.body || '{}');
    const { content, reviewerId } = requestBody;

    if (!movieId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing movieId in path" }),
      };
    }

    if (!content || !reviewerId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "Missing required fields in request body",
          required: ["content", "reviewerId"]
        }),
      };
    }

    const review = {
      movieId: parseInt(movieId),
      reviewId: uuidv4(),
      ReviewerId: reviewerId,
      Content: content,
      ReviewDate: new Date().toISOString().split("T")[0],
    };

    await ddbDocClient.send(new PutCommand({
      TableName: "MovieReviews",
      Item: review
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: "Review added successfully",
        review: review
      }),
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: "Internal server error",
        error: error instanceof Error ? error.message : error
      }),
    };
  }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: "eu-west-1" });
  return DynamoDBDocumentClient.from(ddbClient);
}

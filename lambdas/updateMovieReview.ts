import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const ddbDocClient = createDDbDocClient();

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));

        const movieId = event.pathParameters?.movieId;
        const reviewId = event.pathParameters?.reviewId;
        const requestBody = JSON.parse(event.body || '{}');
        const { content } = requestBody;

        if (!movieId || !reviewId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing movieId or reviewId in path" }),
            };
        }

        if (!content) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing content in request body" }),
            };
        }

        const updateCommand = new UpdateCommand({
            TableName: "MovieReviews",
            Key: {
                movieId: parseInt(movieId),
                reviewId: reviewId,
            },
            UpdateExpression: "set Content = :content",  // Changed 'content' to 'Content'
            ExpressionAttributeValues: {
                ":content": content,
            },
            ReturnValues: "ALL_NEW",
        });

        const result = await ddbDocClient.send(updateCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Review updated successfully", item: result.Attributes }),
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error", error }),
        };
    }
};

function createDDbDocClient() {
  const ddbClient = new DynamoDBClient({ region: "eu-west-1" });
  return DynamoDBDocumentClient.from(ddbClient);
}

import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { LambdaClient, InvokeCommand, InvokeCommandInput } from "@aws-sdk/client-lambda"; // Import LambdaClient
import { Buffer } from 'node:buffer';
import { TextDecoder } from 'util';

const ddbDocClient = createDDbDocClient();
const lambdaClient = new LambdaClient({ region: process.env.REGION || 'eu-west-1' });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        console.log("[EVENT]", JSON.stringify(event));
        const reviewId = event.pathParameters?.reviewId;
        const movieId = event.pathParameters?.movieId;
        const languageCode = event.queryStringParameters?.language;
        if (!reviewId || !movieId) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing reviewId or movieId in path" }),
            };
        }
        if (!languageCode) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing language code in query string" }),
            };
        }
        const getCommand = new GetCommand({
            TableName: process.env.REVIEWS_TABLE_NAME,
            Key: {
                movieId: parseInt(movieId),
                reviewId: reviewId,
            },
        });
        const reviewResult = await ddbDocClient.send(getCommand);
        if (!reviewResult.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Review not found" }),
            };
        }
        const reviewContent = reviewResult.Item.Content.S;
        if (!reviewContent) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Review content not found" }),
            };
        }
        // Invoke the translate.ts Lambda function
        const translateParams: InvokeCommandInput = {
            FunctionName: process.env.TRANSLATE_LAMBDA_ARN, // ARN of the translate.ts Lambda
            InvocationType: "RequestResponse", // Wait for the result
            Payload: JSON.stringify({ text: reviewContent, language: languageCode }),
        };
        const translateCommand = new InvokeCommand(translateParams);
        const translateResult = await lambdaClient.send(translateCommand);
        if (translateResult.StatusCode !== 200) {
            console.error("Translation failed:", translateResult);
            return {
                statusCode: 502, // Bad Gateway
                body: JSON.stringify({ message: "Translation service error" }),
            };
        }
        // Ensure Payload exists before attempting to parse
        if (translateResult.Payload) {
            const payloadString = new TextDecoder().decode(translateResult.Payload);
            const payload = JSON.parse(payloadString);
            const translatedText = payload.translatedText;
            return {
                statusCode: 200,
                body: JSON.stringify({ translatedContent: translatedText }),
            };
        } else {
            console.error("No payload received from translation Lambda");
            return {
                statusCode: 500,
                body: JSON.stringify({ message: "Internal server error: No translation received" }),
            };
        }
    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error", error }),
        };
    }
};

function createDDbDocClient() {
    const ddbClient = new DynamoDBClient({ region: process.env.REGION || 'eu-west-1' });
    return DynamoDBDocumentClient.from(ddbClient);
}

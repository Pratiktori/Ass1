import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import * as translate from '@aws-sdk/client-translate';

const ddbDocClient = createDDbDocClient();
const translateClient = new translate.TranslateClient({ region: process.env.REGION });

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

    const reviewContent = reviewResult.Item.content;

    const translateCommand = new translate.TranslateTextCommand({
      SourceLanguageCode: "auto",
      TargetLanguageCode: languageCode,
      Text: reviewContent,
    });

    const translationResult = await translateClient.send(translateCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        translatedContent: translationResult.TranslatedText,
      }),
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
  const ddbClient = new DynamoDBClient({ region: process.env.REGION });
  return DynamoDBDocumentClient.from(ddbClient);
}

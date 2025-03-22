import {
    APIGatewayProxyHandlerV2,
    APIGatewayProxyEventV2,
    APIGatewayProxyResultV2,
  } from "aws-lambda";
  import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
  import {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
  } from "@aws-sdk/lib-dynamodb";
  import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";
  
  const region = process.env.REGION || "eu-west-1";
  const ddbClient = new DynamoDBClient({ region });
  const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
  const translateClient = new TranslateClient({ region });
  
  export const handler: APIGatewayProxyHandlerV2 = async (
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyResultV2> => {
    console.log("Event received:", JSON.stringify(event));
  
    const reviewId = event.pathParameters?.reviewId;
    const movieId = event.pathParameters?.movieId;
    const targetLanguage = event.queryStringParameters?.language;
  
    if (!reviewId || !movieId || !targetLanguage) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "Missing reviewId, movieId, or language query parameter.",
        }),
      };
    }
  
    const tableName = process.env.TABLE_NAME;
    if (!tableName) {
      console.error("TABLE_NAME environment variable is not set.");
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal server error: TABLE_NAME not set",
        }),
      };
    }
    // 1. Retrieve the review from DynamoDB
    const getParams = {
      TableName: tableName,
      Key: {
        movieId: Number(movieId),
        reviewId: reviewId,
      },
    };
  
    try {
      const { Item } = await ddbDocClient.send(new GetCommand(getParams));
  
      if (!Item || !Item.Content) {
        return {
          statusCode: 404,
          body: JSON.stringify({ message: "Review not found" }),
        };
      }
  
      const translations = (Item as any).translations || {};
  
      if (translations[targetLanguage]) {
        console.log("Returning cached translation.");
        return {
          statusCode: 200,
          body: JSON.stringify({
            translatedText: translations[targetLanguage],
            cached: true,
          }),
        };
      }
  
      // 3. Otherwise, use Amazon Translate to translate the review
      const originalText = Item.Content;
  
      const translateParams = {
        Text: originalText,
        SourceLanguageCode: "en",
        TargetLanguageCode: targetLanguage,
      };
  
      const translateResult = await translateClient.send(
        new TranslateTextCommand(translateParams)
      );
  
      const translatedText = translateResult.TranslatedText;
  
      // 4. Update the DynamoDB item to cache the new translation
      const updateParams = {
        TableName: tableName,
        Key: {
          movieId: Number(movieId),
          reviewId: reviewId,
        },
         UpdateExpression: "SET #translations.#lang = :translatedText",
              ExpressionAttributeNames: {
                  "#translations": "translations",
                  "#lang": targetLanguage,
              },
              ExpressionAttributeValues: {
                  ":translatedText": translatedText,
              },
        ReturnValues: "UPDATED_NEW" as const,
      };
  
      await ddbDocClient.send(new UpdateCommand(updateParams));
      console.log("Translation cached in DynamoDB.");
  
      return {
        statusCode: 200,
        body: JSON.stringify({
          translatedText,
          cached: false,
        }),
      };
    } catch (error) {
      console.error("Error in translation endpoint:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          message: "Internal server error",
          error: (error as Error).message,
        }),
      };
    }
  };
  
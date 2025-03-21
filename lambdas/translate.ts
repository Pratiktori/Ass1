import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { TranslateClient, TranslateTextCommand } from "@aws-sdk/client-translate";

const translateClient = new TranslateClient({ region: process.env.REGION || 'eu-west-1' });

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
    try {
        const { text, language } = JSON.parse(event.body || '{}');
        if (!text) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing text from the body" }),
            };
        }
        if (!language) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: "Missing language from the body" }),
            };
        }
        const translateCommand = new TranslateTextCommand({
            Text: text,
            SourceLanguageCode: 'en', // Assuming source language is English
            TargetLanguageCode: language
        });
        const translationResult = await translateClient.send(translateCommand);
        console.log("Translation Result:", translationResult);
        return {
            statusCode: 200,
            body: JSON.stringify({ TranslatedText: translationResult.TranslatedText }),
        };
    } catch (error) {
        console.error('error in the translation', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "unable to translate the message", error }),
        };
    }
};

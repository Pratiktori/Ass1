// import { APIGatewayProxyHandlerV2 } from "aws-lambda";
// import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
// import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
// import { v4 as uuidv4 } from 'uuid'; // For generating unique review IDs

// const ddbDocClient = createDDbDocClient();

// export const handler: APIGatewayProxyHandlerV2 = async (event) => {
//   try {
//     console.log("[EVENT]", JSON.stringify(event));

//     const movieId = event.pathParameters?.movieId;
//     const reviewerEmail = 'test@example.com'; //event.requestContext.authorizer.jwt.claims.email;
//     const requestBody = JSON.parse(event.body || '{}');
//     const { content, rating } = requestBody;

//     if (!movieId) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ message: "Missing movieId in path" }),
//       };
//     }

//     if (!reviewerEmail) {
//       return {
//         statusCode: 401,
//         body: JSON.stringify({ message: "Unauthorized.  Missing email claim." }),
//       };
//     }

//     if (!content || !rating) {
//       return {
//         statusCode: 400,
//         body: JSON.stringify({ message: "Missing content or rating in request body" }),
//       };
//     }

//     const reviewId = uuidv4(); // Generate unique ID for the review
//     const review = {
//       movieId: parseInt(movieId),
//       reviewId: reviewId,
//       reviewerEmail: reviewerEmail,
//       content: content,
//       rating: rating,
//       reviewDate: new Date().toISOString() // Add timestamp
//     };

//     const putCommand = new PutCommand({
//       TableName: process.env.REVIEWS_TABLE_NAME,
//       Item: review,
//     });

//     await ddbDocClient.send(putCommand);

//     return {
//       statusCode: 201,
//       body: JSON.stringify({ message: "Review added successfully", review: review }),
//     };
//   } catch (error) {
//     console.error("Error:", error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: "Internal server error", error: error }),
//     };
//   }
// };

// function createDDbDocClient() {
//   const ddbClient = new DynamoDBClient({ region: process.env.REGION });
//   return DynamoDBDocumentClient.from(ddbClient);
// }

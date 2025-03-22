## Serverless REST Assignment.

__Name:__ Pratik Mudliyar

__Demo:__ (https://youtu.be/AzZoD7yphWY)

### Overview.

This repository contains the code and infrastructure as code (IaC) definitions for a serverless REST web API. This API enables users to perform Create, Read, Update, and Delete (CRUD) operations on a Movie Reviews database. The API comprises several endpoints, each implemented using AWS Lambda functions, API Gateway, and DynamoDB. The following functionalities are included:

GET Movie Reviews: Retrieve a list of reviews for a specific movie.

POST Movie Review: Add a new review for a movie.

PUT Movie Review: Update an existing movie review.

GET Translated Movie Review: Retrieve a translated version of a movie review, leveraging Amazon Translate.

### App API endpoints.

+ GET /movies/{movieId}/reviews -Retrieves a list of reviews for a specific movie.
+ POST /movies/{movieId}/reviews - Adds a new review for a specific movie.
+ PUT /movies/{movieId}/reviews/{reviewId} - Updates an existing review for a specific movie.
+ GET /movies/{movieID}/reviews/{reviewID}/translation?language={code} - Retrieves a translated version of a movie review.

### Features.

CRUD Operations on Movie Reviews:

Create- Add new movie reviews to the database.

Read- Retrieve movie reviews for a specific movie.

Update- Modify existing movie reviews.

Serverless Architecture:

The application is built using serverless technologies (AWS Lambda, API Gateway, DynamoDB), which provides scalability, cost-efficiency, and reduced operational overhead.

RESTful API Design:

The API follows REST principles, making it easy to understand and use.

Data Persistence with DynamoDB:

Movie review data is stored in a DynamoDB table, providing a NoSQL database solution that is scalable and performant.




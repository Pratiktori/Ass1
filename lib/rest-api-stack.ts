import * as cdk from "aws-cdk-lib";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as custom from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { generateBatch } from "../shared/util";
import { movies, movieCasts } from "../seed/movies";
import * as apig from "aws-cdk-lib/aws-apigateway";
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class RestAPIStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Tables
    const moviesTable = new dynamodb.Table(this, "MoviesTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: dynamodb.AttributeType.NUMBER },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Movies",
    });

    const movieCastsTable = new dynamodb.Table(this, "MovieCastTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "actorName", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "MovieCast",
    });

    movieCastsTable.addLocalSecondaryIndex({
      indexName: "roleIx",
      sortKey: { name: "roleName", type: dynamodb.AttributeType.STRING },
    });

    // NEW: Reviews Table
    const reviewsTable = new dynamodb.Table(this, "ReviewsTable", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "movieId", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "reviewId", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      tableName: "Reviews",
    });

    // Functions
    const getMovieByIdFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieByIdFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieById.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: "us-east-1",
        },
      }
    );

    const getMovieCastMembersFn = new lambdanode.NodejsFunction(
      this,
      "GetCastMemberFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: `${__dirname}/../lambdas/getMovieCastMember.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: movieCastsTable.tableName,
          REGION: "us-east-1",
        },
      }
    );

    const getAllMoviesFn = new lambdanode.NodejsFunction(
      this,
      "GetAllMoviesFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getAllMovies.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: moviesTable.tableName,
          REGION: "us-east-1",
        },
      }
    );

    const newMovieFn = new lambdanode.NodejsFunction(this, "AddMovieFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/addMovie.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: moviesTable.tableName,
        REGION: "us-east-1",
      },
    });

    const getMovieFn = new lambda.Function(this, "GetMovieFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: "getMovie.handler",
      code: lambda.Code.fromAsset("lambdas"),
      environment: {
        MOVIES_TABLE_NAME: moviesTable.tableName,
        CAST_TABLE_NAME: movieCastsTable.tableName,
        REGION: "us-east-1",
      },
    });

    const deleteMovieFn = new lambdanode.NodejsFunction(this, "DeleteMovieFn", {
      architecture: lambda.Architecture.ARM_64,
      runtime: lambda.Runtime.NODEJS_22_X,
      entry: `${__dirname}/../lambdas/deleteMovie.ts`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 128,
      environment: {
        TABLE_NAME: moviesTable.tableName,
        REGION: "us-east-1",
      },
    });

    // NEW: getMovieReviews Lambda
    const getMovieReviewsFn = new lambdanode.NodejsFunction(
      this,
      "GetMovieReviewsFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/getMovieReviews.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          REVIEWS_TABLE_NAME: reviewsTable.tableName,
          REGION: "us-east-1",
        },
      }
    );

    // NEW: postMovieReview Lambda
    const postMovieReviewFn = new lambdanode.NodejsFunction(
      this,
      "PostMovieReviewFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/postMovieReview.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          REVIEWS_TABLE_NAME: reviewsTable.tableName,
          REGION: "us-east-1",
        },
      }
    );

    // NEW: updateMovieReview Lambda
    const updateMovieReviewFn = new lambdanode.NodejsFunction(
      this,
      "UpdateMovieReviewFn",
      {
        architecture: lambda.Architecture.ARM_64,
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: `${__dirname}/../lambdas/updateMovieReview.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          REVIEWS_TABLE_NAME: reviewsTable.tableName,
          REGION: "us-east-1",
        },
      }
    );

    new custom.AwsCustomResource(this, "moviesddbInitData", {
      onCreate: {
        service: "DynamoDB",
        action: "batchWriteItem",
        parameters: {
          RequestItems: {
            [moviesTable.tableName]: generateBatch(movies),
            [movieCastsTable.tableName]: generateBatch(movieCasts),
          },
        },
        physicalResourceId: custom.PhysicalResourceId.of("moviesddbInitData"),
      },
      policy: custom.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [moviesTable.tableArn, movieCastsTable.tableArn],
      }),
    });

    // Permissions
    moviesTable.grantReadData(getMovieByIdFn);
    moviesTable.grantReadData(getAllMoviesFn);
    moviesTable.grantReadWriteData(newMovieFn);
    moviesTable.grantReadWriteData(deleteMovieFn);
    movieCastsTable.grantReadData(getMovieCastMembersFn);
    moviesTable.grantReadData(getMovieFn);
    movieCastsTable.grantReadData(getMovieFn);
    reviewsTable.grantReadData(getMovieReviewsFn);
    reviewsTable.grantReadWriteData(postMovieReviewFn);
    reviewsTable.grantReadWriteData(updateMovieReviewFn);

    const api = new apig.RestApi(this, "RestAPI", {
      description: "demo api",
      deployOptions: {
        stageName: "dev",
      },
      defaultCorsPreflightOptions: {
        allowHeaders: ["Content-Type", "X-Amz-Date", "Authorization"],
        allowMethods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
        allowCredentials: true,
        allowOrigins: ["*"],
      },
    });

    // Movies endpoint
    const moviesEndpoint = api.root.addResource("movies");

    moviesEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getAllMoviesFn, { proxy: true })
    );

    moviesEndpoint.addMethod(
      "POST",
      new apig.LambdaIntegration(newMovieFn, { proxy: true })
    );

    const movieCastEndpoint = moviesEndpoint.addResource("cast");

    movieCastEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieCastMembersFn, { proxy: true })
    );

    // Detail movie endpoint
    const specificMovieEndpoint = moviesEndpoint.addResource("{movieId}");
    specificMovieEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieByIdFn, { proxy: true })
    );
    specificMovieEndpoint.addMethod(
      "DELETE",
      new apig.LambdaIntegration(deleteMovieFn, { proxy: true })
    );

    // NEW: Movie Reviews endpoint
    const movieReviewsEndpoint = specificMovieEndpoint.addResource("reviews");
    movieReviewsEndpoint.addMethod(
      "GET",
      new apig.LambdaIntegration(getMovieReviewsFn, { proxy: true }),
      {
        requestParameters: {
          "method.request.querystring.reviewId": false,
          "method.request.querystring.reviewerEmail": false,
        },
      }
    );

    const specificReviewEndpoint = movieReviewsEndpoint.addResource("{reviewId}");

    // NEW: PUT /movies/{movieId}/reviews/{reviewId}
    specificReviewEndpoint.addMethod(
      "PUT",
      new apig.LambdaIntegration(updateMovieReviewFn, { proxy: true })
    );

    // NEW: POST /movies/{movieId}/reviews
    movieReviewsEndpoint.addMethod('POST', new apig.LambdaIntegration(postMovieReviewFn), {
      authorizer: new apig.CognitoUserPoolsAuthorizer(this, 'UserPoolAuthorizer', {
        cognitoUserPools: [
          cognito.UserPool.fromUserPoolId(this, 'UserPool', process.env.COGNITO_USER_POOL_ID || 'your-user-pool-id')
        ],
        authorizerName: 'MovieReviewsAuthorizer'
      }),
      authorizationType: apig.AuthorizationType.COGNITO,
    });
  }
}

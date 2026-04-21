import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cognito from 'aws-cdk-lib/aws-cognito';

export class ServerlessAssignmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the Cognito User Pool
    const userPool = new cognito.UserPool(this, 'ServerlessAssignmentPool', {
      userPoolName: 'ServerlessAssignmentPool',
      signInAliases: { email: true },
      autoVerify: { email: true },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create the App Client 
    const appClient = new cognito.UserPoolClient(this, 'ServerlessOnboardingAppClient', {
      userPool,
      userPoolClientName: 'ServerlessOnboardingApp',
      authFlows: {
        userPassword: true, 
      },
    });

    // Create the API Gateway Authorizer
    const cognitoAuthorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoBouncer', {
      cognitoUserPools: [userPool],
      authorizerName: 'CognitoBouncer',
      identitySource: 'method.request.header.Authorization',
    });

    // Create S3 Bucket
    const assetBucket = new s3.Bucket(this, 'Dulan-assignment-assets-bucket-2026', {
      // REVIEW: `removalPolicy: DESTROY` and `autoDeleteObjects: true` are fine for dev, but dangerous
      // in production — they will permanently delete all data on `cdk destroy`. These should be driven
      // by an environment config (e.g., DESTROY for dev, RETAIN for prod).
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Upload local files to the S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployAssignmentAssets', {
      sources: [s3deploy.Source.asset('./assets')],
      destinationBucket: assetBucket,
    });

    // Create DynamoDB Table 
    const usersTable = new dynamodb.Table(this, 'Users', {
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda Functions
    // RE: NodejsFunction —`aws-cdk-lib/aws-lambda-nodejs.NodejsFunction` automatically
    // bundles your handler with esbuild (tree-shaking, minification, dependency resolution) so you don't
    // need to manage the runtime or code path manually. It would also solve the shared-bundle issue below.
    // Worth adopting, especially as the number of Lambdas grows.
    const postUserLambda = new lambda.Function(this, 'PostUserLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      // REVIEW: Both Lambdas package the entire `lambda/` directory, meaning each function ships with
      // the other's code. Separate them into `lambda/postUser/` and `lambda/getAssets/` directories,
      // or switch to `NodejsFunction` which handles this automatically via per-handler bundling.
      code: lambda.Code.fromAsset('lambda'),
      handler: 'postUser.handler',
      environment: {
        TABLE_NAME: usersTable.tableName, 
      }
    });

    const getAssetsLambda = new lambda.Function(this, 'GetAssetsLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'getAssets.handler',
      environment: {
        BUCKET_NAME: assetBucket.bucketName, 
      }
    });

    // Set IAM Permissions 
    usersTable.grantWriteData(postUserLambda); 
    assetBucket.grantRead(getAssetsLambda);    

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'OnboardingApi', {
      // REVIEW: Hardcoded name — use an environment-scoped name (e.g., `Onboarding-Service-${env}`)
      // or let CDK auto-generate one, so multiple environments don't collide.
      restApiName: 'Onboarding Service',
      // REVIEW: The assignment's Step 0 warns about Denial of Wallet attacks, currently this API has no
      // throttling. Add rate/burst limits:
      //   deployOptions: { throttlingRateLimit: 10, throttlingBurstLimit: 25 }
      //
    });

    // Connect /users to POST Lambda
    const usersResource = api.root.addResource('users');
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(postUserLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // Connect /assets to GET Lambda
    const assetsResource = api.root.addResource('assets');
    assetsResource.addMethod('GET', new apigateway.LambdaIntegration(getAssetsLambda), {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    });

    // REVIEW: Add resource tags (e.g., project, environment, owner) using `cdk.Tags.of(this).add()`.
    // Tags are essential for cost tracking, resource ownership, and filtering in the AWS console.
  }
}
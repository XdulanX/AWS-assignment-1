import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';

export class ServerlessAssignmentStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 Bucket
    const assetBucket = new s3.Bucket(this, 'Dulan-assignment-assets-bucket-2026', {
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
    const postUserLambda = new lambda.Function(this, 'PostUserLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
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
      restApiName: 'Onboarding Service',
    });

    // Connect /users to POST Lambda
    const usersResource = api.root.addResource('users');
    usersResource.addMethod('POST', new apigateway.LambdaIntegration(postUserLambda));

    // Connect /assets to GET Lambda
    const assetsResource = api.root.addResource('assets');
    assetsResource.addMethod('GET', new apigateway.LambdaIntegration(getAssetsLambda));
  }
}
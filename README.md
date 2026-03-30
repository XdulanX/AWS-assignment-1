# Serverless Onboarding API

An Infrastructure as Code (IaC) project built with AWS CDK and TypeScript to provision a serverless onboarding backend.

## Tech Stack
* **IaC:** AWS CDK (TypeScript)
* **Compute:** AWS Lambda (Node.js 20)
* **Database & Storage:** Amazon DynamoDB, Amazon S3
* **API:** Amazon API Gateway
* **CI/CD:** GitHub Actions

## Architecture
The CDK stack provisions the following resources and routes:

* **`POST /users`**: API Gateway routes to a Lambda function that writes user payloads to a DynamoDB table. (IAM: Write-only access to DynamoDB).
* **`GET /assets`**: API Gateway routes to a Lambda function that lists files from an S3 bucket. (IAM: Read-only access to S3).

## Deployment Instructions

### Option 1: CI/CD via GitHub Actions
This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys the CDK stack to AWS upon pushing to the `main` branch. 

**Required Repository Secrets:**
* `AWS_ACCESS_KEY_ID`
* `AWS_SECRET_ACCESS_KEY`

### Option 2: Local Deployment
To deploy manually from your local machine, ensure you have Node.js (v20+), the AWS CLI, and AWS CDK installed.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Bootstrap the AWS environment:
   ```bash
   cdk bootstrap
   ```
3. Deploy the stack:
   ```bash
   cdk deploy
   ```

## Testing the Endpoints

Once deployed, the API Gateway endpoint will be output in the terminal.

**1. Create a User**
```bash
POST /users
Content-Type: application/json

{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "admin"
}
```
*Expected Response:* `201 Created`

**2. List Assets**
```bash
GET /assets
```
*Expected Response:* `200 OK` (Returns a JSON array of S3 object keys).
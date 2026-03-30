import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from "crypto";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        
        const newUser = {
            userId: body.userId || crypto.randomUUID(),
            name: body.name,
            email: body.email,
            role: body.role
        };

        const params = {
            TableName: process.env.TABLE_NAME, 
            Item: newUser
        };

        await docClient.send(new PutCommand(params));
        
        return {
            statusCode: 201,
            body: JSON.stringify({ message: "User successfully created!", user: newUser })
        };
        
    } catch (err) {
        console.error("Error saving to DynamoDB:", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Could not save user." }) 
        };
    }
};
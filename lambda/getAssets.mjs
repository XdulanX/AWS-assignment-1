import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export const handler = async (event) => {
    const params = {
        Bucket: process.env.BUCKET_NAME 
    };

    try {
        const data = await s3.send(new ListObjectsV2Command(params));
        const fileNames = data.Contents ? data.Contents.map(file => file.Key) : [];

        return {
            statusCode: 200,
            body: JSON.stringify({ assets: fileNames })
        };
        
    } catch (err) {
        console.error("Error fetching from S3:", err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "Could not fetch assets from S3." }) 
        };
    }
};
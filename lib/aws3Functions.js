const {
  S3Client,
  ListBucketsCommand,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");

const initS3Client = () => {
  const client = new S3Client({
    region: process.env.AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: process.env.AWS_PUBLIC_KEY,
      secretAccessKey: process.env.AWSSECRET_KEY,
    },
  });

  return client;
};

module.exports = initS3Client;

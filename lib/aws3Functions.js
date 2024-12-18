const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

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

const client = initS3Client();

const getUrlMultimedia = async (bucket, key) => {
  const objectParams = {
    Bucket: bucket,
    Key: key,
  };

  const command = new GetObjectCommand(objectParams);

  try {
    const url = await getSignedUrl(client, command, {
      expiresIn: 3600,
    });
    return url;
  } catch (error) {
    console.log(error);
  }
};

module.exports = {
  getUrlMultimedia,
  initS3Client,
};

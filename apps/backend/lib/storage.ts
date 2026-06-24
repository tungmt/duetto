import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const AWS_REGION = process.env.AWS_REGION || "ap-southeast-1";
const S3_BUCKET = process.env.AWS_S3_BUCKET || "";
const S3_PUBLIC_BASE_URL = process.env.AWS_S3_PUBLIC_BASE_URL || "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN || "";

const hasAwsEnvCredentials = Boolean(AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY);

const s3Client = new S3Client({
  region: AWS_REGION,
  ...(hasAwsEnvCredentials
    ? {
        credentials: {
          accessKeyId: AWS_ACCESS_KEY_ID,
          secretAccessKey: AWS_SECRET_ACCESS_KEY,
          ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {})
        }
      }
    : {})
});

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildVideoObjectKey(params: {
  userId: string;
  fileType: "source" | "preview" | "thumbnail" | "answer";
  fileName: string;
}) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const safeName = sanitizeFileName(params.fileName || `${params.fileType}.bin`);
  return `videos/${params.userId}/${yyyy}/${mm}/${dd}/${params.fileType}-${Date.now()}-${safeName}`;
}

export function toPublicUrl(key: string) {
  if (S3_PUBLIC_BASE_URL) {
    return `${S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
  }
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;
}

export async function createPresignedUpload(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  if (!S3_BUCKET) {
    throw new Response("Missing AWS_S3_BUCKET", { status: 500 });
  }

  if (!hasAwsEnvCredentials) {
    throw new Response(
      "Missing AWS credentials in env. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (and AWS_SESSION_TOKEN if needed).",
      { status: 500 }
    );
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: params.expiresInSeconds ?? 900
  });

  return {
    uploadUrl,
    key: params.key,
    publicUrl: toPublicUrl(params.key)
  };
}

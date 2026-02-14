import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_REGION = process.env.S3_REGION || "auto";
const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID;
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY;
const S3_PUBLIC_URL = process.env.S3_PUBLIC_URL;
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true";

export function isS3Configured(): boolean {
  return !!(S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID!,
        secretAccessKey: S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: S3_FORCE_PATH_STYLE,
    });
  }
  return s3Client;
}

function generateObjectKey(originalName: string): string {
  const ext = path.extname(originalName);
  const uniqueId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  return `uploads/${uniqueId}${ext}`;
}

export function getPublicUrl(objectKey: string): string {
  if (S3_PUBLIC_URL) {
    return `${S3_PUBLIC_URL.replace(/\/$/, "")}/${objectKey}`;
  }
  const endpoint = S3_ENDPOINT?.replace(/\/$/, "") || "";
  if (S3_FORCE_PATH_STYLE) {
    return `${endpoint}/${S3_BUCKET}/${objectKey}`;
  }
  try {
    const url = new URL(endpoint);
    url.hostname = `${S3_BUCKET}.${url.hostname}`;
    return `${url.origin}/${objectKey}`;
  } catch {
    return `${endpoint}/${S3_BUCKET}/${objectKey}`;
  }
}

export function extractObjectKeyFromUrl(url: string): string | null {
  if (!url || url.startsWith("/uploads/")) return null;
  if (S3_PUBLIC_URL) {
    const base = S3_PUBLIC_URL.replace(/\/$/, "") + "/";
    if (url.startsWith(base)) return url.slice(base.length);
  }
  const match = url.match(/uploads\/[^?#]+/);
  return match ? match[0] : null;
}

export async function getPresignedUploadUrl(
  fileName: string,
  contentType: string
): Promise<{ uploadURL: string; objectKey: string; publicUrl: string }> {
  const client = getS3Client();
  const objectKey = generateObjectKey(fileName);

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET!,
    Key: objectKey,
    ContentType: contentType,
  });

  const uploadURL = await getSignedUrl(client, command, { expiresIn: 900 });

  return {
    uploadURL,
    objectKey,
    publicUrl: getPublicUrl(objectKey),
  };
}

export async function uploadBuffer(
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<{ objectKey: string; publicUrl: string }> {
  const client = getS3Client();
  const objectKey = generateObjectKey(fileName);

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET!,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return {
    objectKey,
    publicUrl: getPublicUrl(objectKey),
  };
}

export async function deleteObject(objectKey: string): Promise<boolean> {
  try {
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: S3_BUCKET!,
        Key: objectKey,
      })
    );
    return true;
  } catch (error) {
    console.error("S3 delete error:", error);
    return false;
  }
}

export async function getPresignedReadUrl(objectKey: string): Promise<string> {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET!,
    Key: objectKey,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function proxyS3Object(objectKey: string, res: Response): Promise<void> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET!,
      Key: objectKey,
    });
    const result = await client.send(command);

    if (result.ContentType) {
      res.setHeader("Content-Type", result.ContentType);
    }
    if (result.ContentLength) {
      res.setHeader("Content-Length", result.ContentLength);
    }
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const stream = result.Body as NodeJS.ReadableStream;
    stream.pipe(res);
  } catch (error) {
    res.status(404).json({ error: "File not found" });
  }
}

const LOCAL_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export function ensureLocalUploadsDir(): void {
  if (!fs.existsSync(LOCAL_UPLOADS_DIR)) {
    fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
  }
}

export function saveLocalFile(
  buffer: Buffer,
  originalName: string
): { filePath: string } {
  ensureLocalUploadsDir();
  const ext = path.extname(originalName);
  const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const fileName = `${uniqueSuffix}${ext}`;
  const fullPath = path.join(LOCAL_UPLOADS_DIR, fileName);
  fs.writeFileSync(fullPath, buffer);
  return { filePath: `/uploads/${fileName}` };
}

export function getLocalUploadsDir(): string {
  return LOCAL_UPLOADS_DIR;
}

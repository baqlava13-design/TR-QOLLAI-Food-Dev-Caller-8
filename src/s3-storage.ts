import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";
import type { Request, Response } from "express";
import { config, isS3Configured as checkS3 } from "./config";

export function isS3Configured(): boolean {
  return checkS3();
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      credentials: {
        accessKeyId: config.s3.accessKeyId,
        secretAccessKey: config.s3.secretAccessKey,
      },
      forcePathStyle: config.s3.forcePathStyle,
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
  if (config.s3.publicBaseUrl) {
    return `${config.s3.publicBaseUrl.replace(/\/$/, "")}/${objectKey}`;
  }
  const endpoint = config.s3.endpoint.replace(/\/$/, "");
  if (config.s3.forcePathStyle) {
    return `${endpoint}/${config.s3.bucket}/${objectKey}`;
  }
  try {
    const url = new URL(endpoint);
    url.hostname = `${config.s3.bucket}.${url.hostname}`;
    return `${url.origin}/${objectKey}`;
  } catch {
    return `${endpoint}/${config.s3.bucket}/${objectKey}`;
  }
}

export function extractObjectKeyFromUrl(url: string): string | null {
  if (!url || url.startsWith("/uploads/")) return null;
  if (config.s3.publicBaseUrl) {
    const base = config.s3.publicBaseUrl.replace(/\/$/, "") + "/";
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
    Bucket: config.s3.bucket,
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
      Bucket: config.s3.bucket,
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
        Bucket: config.s3.bucket,
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
    Bucket: config.s3.bucket,
    Key: objectKey,
  });
  return getSignedUrl(client, command, { expiresIn: 3600 });
}

export async function proxyS3Object(objectKey: string, res: Response): Promise<void> {
  try {
    const client = getS3Client();
    const command = new GetObjectCommand({
      Bucket: config.s3.bucket,
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

const env = process.env;

export const config = {
  nodeEnv: env.NODE_ENV || "development",
  isProduction: env.NODE_ENV === "production",
  port: parseInt(env.PORT || "3000", 10),
  appOrigin: env.APP_ORIGIN || "",

  database: {
    url: env.DATABASE_URL || "",
  },

  session: {
    secret: env.SESSION_SECRET || "",
    name: env.SESSION_NAME || "qollai.sid",
  },

  cookie: {
    domain: env.COOKIE_DOMAIN || undefined,
    maxAge: 1000 * 60 * 60 * 24 * 14,
  },

  trustProxy: env.TRUST_PROXY === "1",

  s3: {
    provider: (env.S3_PROVIDER || "aws") as "aws" | "r2" | "minio",
    endpoint: env.S3_ENDPOINT || "",
    region: env.S3_REGION || "auto",
    bucket: env.S3_BUCKET || "",
    accessKeyId: env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: env.S3_SECRET_ACCESS_KEY || "",
    publicBaseUrl: env.S3_PUBLIC_BASE_URL || env.S3_PUBLIC_URL || "",
    forcePathStyle: env.S3_FORCE_PATH_STYLE === "true" || env.S3_PROVIDER === "minio",
  },

  upload: {
    maxMb: parseInt(env.UPLOAD_MAX_MB || "10", 10),
  },

  logging: {
    level: (env.LOG_LEVEL || "info") as "debug" | "info" | "warn" | "error",
  },
};

export function isS3Configured(): boolean {
  return !!(config.s3.endpoint && config.s3.bucket && config.s3.accessKeyId && config.s3.secretAccessKey);
}

const LOG_LEVELS: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };

export function shouldLog(level: string): boolean {
  return (LOG_LEVELS[level] ?? 1) >= (LOG_LEVELS[config.logging.level] ?? 1);
}

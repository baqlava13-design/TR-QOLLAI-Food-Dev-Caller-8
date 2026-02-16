import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import compression from "compression";
import session from "express-session";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { registerSuperadminRoutes } from "./superadmin-routes";
import { serveStatic } from "./static";
import { seedDatabase } from "./seed";
import { config, shouldLog } from "./config";

const PgSession = connectPgSimple(session);
const { Pool } = pg;

const app = express();

if (config.trustProxy) app.set("trust proxy", 1);

const httpServer = createServer(app);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(compression());

if (!config.database.url) throw new Error("Missing DATABASE_URL");
if (config.isProduction && !config.session.secret) throw new Error("Missing SESSION_SECRET");

const pool = new Pool({
  connectionString: config.database.url,
  ssl: config.database.url.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

app.use(
  session({
    name: config.session.name,
    secret: config.session.secret || "dev-secret-key-change-me",
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProduction,
      maxAge: config.cookie.maxAge,
      domain: config.cookie.domain,
    },
  })
);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: true }));

export function log(message: string, source = "express") {
  if (!shouldLog("info")) return;
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

app.get("/ready", async (_req, res) => {
  try {
    const r = await pool.query("select 1 as ok");
    res.status(200).json({ ok: true, db: r.rows?.[0]?.ok === 1 });
  } catch (e: any) {
    res.status(503).json({ ok: false, db: false, error: e?.message ?? "db_error" });
  }
});

(async () => {
  try {
    await seedDatabase();
  } catch (error) {
    console.error("Error seeding database:", error);
  }

  registerSuperadminRoutes(app);
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  if (config.isProduction) {
    serveStatic(app);
  } else {
    const viteMod = "./vite";
    const { setupVite } = await import(viteMod);
    await setupVite(httpServer, app);
  }

  const port = config.port;
  httpServer.listen(
    { port, host: "0.0.0.0", reusePort: true },
    () => {
      console.log(`[QOLLAI] listening on port ${port} (prod=${config.isProduction})`);
    },
  );
})();

process.on("unhandledRejection", (err) => {
  console.error("UnhandledRejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("UncaughtException:", err);
});

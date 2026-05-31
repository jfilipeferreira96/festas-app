import "dotenv/config";
import cors from "cors";
import path from "path";
import express from "express";
import { auth } from "@festas/auth";
import { toNodeHandler } from "better-auth/node";
import Logger from "./lib/logger";
import { authRateLimiter, apiRateLimiter, publicRateLimiter } from "./middlewares/rateLimiter";
import routes from "./routes";
import { apiSpec } from "./docs";
import { cookieParserMiddleware, i18nMiddleware } from "./i18n/middleware";
import "./i18n/config";

const app = express();

// --- CORS ---
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:4444",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --- Cookie Parser (needed for locale cookie) ---
app.use(cookieParserMiddleware);

// --- Body Parser ---
app.use(express.json());

// --- Serve uploaded profile photos ---
app.use("/api/uploads/profile-photos", express.static(path.resolve(process.cwd(), "uploads", "profile-photos")));

// --- i18n Middleware ---
app.use(i18nMiddleware);

// --- HTTP Request Logger ---
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    Logger.logRequest(req.method, req.originalUrl, res.statusCode, duration, req.ip);
  });
  next();
});

// --- Better Auth handler (with stricter rate limiting) ---
app.use("/api/auth", authRateLimiter, toNodeHandler(auth));

// --- Health check ---
app.get("/", publicRateLimiter, (_req, res) => {
  res.json({ status: "ok", service: "Gestão de Festas Infantis API" });
});

// --- API Routes (with rate limiting) ---
app.use("/api", apiRateLimiter, routes);

// --- Swagger Documentation ---
app.get("/api/docs/swagger.json", publicRateLimiter, (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.json(apiSpec);
});

app.get("/api/docs", publicRateLimiter, (_req, res) => {
  res.setHeader("Content-Type", "text/html");
  res.send(`<!DOCTYPE html>
<html lang="pt-PT">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gestão de Festas Infantis - API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: "/api/docs/swagger.json",
      dom_id: '#swagger-ui',
      presets: [
        SwaggerUIBundle.presets.apis,
        SwaggerUIBundle.SwaggerUIStandalonePreset
      ],
      layout: "BaseLayout",
      persistAuthorization: true,
    });
  </script>
</body>
</html>`);
});

// --- Start server ---
const port = process.env.PORT || 5555;

async function startServer() {
  try {
    app.listen(port, () => {
      Logger.info(`Server is running on port ${port}`);
    });
  } catch (error) {
    Logger.error("Failed to start server", error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", () => {
  Logger.info("SIGTERM received — shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  Logger.info("SIGINT received — shutting down gracefully");
  process.exit(0);
});

startServer();

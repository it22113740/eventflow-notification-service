require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");

const connectDB = require("./config/database");
const swaggerSpec = require("./config/swagger");
const logger = require("./utils/logger");
const healthRoutes = require("./routes/health.routes");
const notificationRoutes = require("./routes/notification.routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// ─── Security & Parsing ────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : "http://localhost:3000"),
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ─── HTTP Request Logging ──────────────────────────────────────────────────
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
    skip: (req) => req.path === "/api/health", // reduce health-check noise
  })
);

// ─── API Docs ──────────────────────────────────────────────────────────────
app.use(
  "/api/docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: "EventFlow Notification Service API",
    swaggerOptions: { persistAuthorization: true },
  })
);

// JSON spec endpoint (useful for code-generation tooling)
app.get("/api/docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ─── Routes ────────────────────────────────────────────────────────────────
app.use(healthRoutes);
app.use(notificationRoutes);

// Redirect root to health
app.get("/", (req, res) => res.redirect("/api/health"));

// ─── Error Handling ────────────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Bootstrap ─────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT || 3004);
const SERVICE_NAME =
  process.env.SERVICE_NAME || "eventflow-notification-service";

const start = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`${SERVICE_NAME} listening on port ${PORT}`);
    logger.info(
      `Swagger UI available at http://localhost:${PORT}/api/docs`
    );
  });
};

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received — shutting down gracefully");
  process.exit(0);
});

start();

module.exports = app; // exported for testing

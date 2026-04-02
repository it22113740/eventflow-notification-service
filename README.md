# eventflow-notification-service

A production-ready Node.js + Express microservice that handles notification delivery for the EventFlow platform. It persists notifications in MongoDB and dispatches transactional emails via Gmail SMTP (Nodemailer).

## Features

- **POST /api/notify** — receive and persist a notification, dispatch email (internal service endpoint)
- **GET /api/notifications/:userId** — paginated notification history (JWT-protected)
- **PUT /api/notifications/:id/read** — mark a notification as read (JWT-protected)
- **GET /api/health** — liveness/readiness check including DB connection state
- Swagger/OpenAPI UI at `/api/docs`
- Winston structured logging with file rotation
- Helmet + CORS security headers
- MongoDB with Mongoose, compound index for fast user queries
- Multi-stage Docker build (non-root user, `node:20-alpine`)
- Docker Compose stack with MongoDB + optional Mongo Express dev UI

## Notification Types

| Type | Description |
|------|-------------|
| `BOOKING_CONFIRMED` | User's booking was confirmed |
| `BOOKING_CANCELLED` | User's booking was cancelled |
| `EVENT_UPDATED` | An event the user booked has been updated |

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd eventflow-notification-service
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values
```

Key variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Must match the auth service's signing secret |
| `SMTP_USER` | Gmail address |
| `SMTP_PASS` | Gmail [App Password](https://myaccount.google.com/apppasswords) |

### 3. Run Locally

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

---

## Docker

### Build & Run with Docker Compose

```bash
# Copy and fill in your env vars
cp .env.example .env

# Start service + MongoDB
docker compose up -d

# Start service + MongoDB + Mongo Express UI
docker compose --profile dev up -d
```

Service ports:
- `3004` — Notification service
- `27017` — MongoDB
- `8081` — Mongo Express (dev profile)

### Build Image Only

```bash
docker build -t eventflow-notification-service:latest .
```

---

## API Reference

### POST /api/notify

Send a notification (no auth required — intended for internal service calls).

**Request body:**
```json
{
  "userId": "user_abc123",
  "userEmail": "user@example.com",
  "type": "BOOKING_CONFIRMED",
  "message": "Your booking for Event XYZ has been confirmed."
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Notification sent successfully",
  "data": { "_id": "...", "userId": "...", "isRead": false, ... }
}
```

---

### GET /api/notifications/:userId

Fetch notifications for a user. JWT `sub` must match `userId` (or `role === "admin"`).

**Headers:** `Authorization: Bearer <token>`

**Query params:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Results per page (max 100) |
| `type` | string | — | Filter by notification type |
| `isRead` | boolean | — | Filter by read status |

---

### PUT /api/notifications/:id/read

Mark a notification as read. JWT `sub` must match the notification's `userId`.

**Headers:** `Authorization: Bearer <token>`

---

### GET /api/health

No auth required.

```json
{
  "status": "ok",
  "service": "eventflow-notification-service",
  "version": "1.0.0",
  "timestamp": "2024-06-04T10:00:00.000Z",
  "uptime": 3600,
  "database": "connected"
}
```

Returns `503` with `"status": "degraded"` if MongoDB is unreachable.

---

## JWT Token Format

The service expects standard JWT claims. The `sub` field is used as the authenticated user ID:

```json
{
  "sub": "user_abc123",
  "role": "user",
  "iat": 1717488000,
  "exp": 1717574400
}
```

---

## Project Structure

```
src/
├── app.js                          # Express app bootstrap
├── config/
│   ├── database.js                 # Mongoose connection
│   └── swagger.js                  # OpenAPI spec definition
├── controllers/
│   ├── health.controller.js
│   └── notification.controller.js
├── middleware/
│   ├── auth.js                     # JWT validation
│   └── errorHandler.js             # Global error & 404 handlers
├── models/
│   └── Notification.js             # Mongoose schema + model
├── routes/
│   ├── health.routes.js
│   └── notification.routes.js      # Routes + Swagger JSDoc
├── services/
│   └── emailService.js             # Nodemailer / Gmail SMTP
└── utils/
    └── logger.js                   # Winston logger
```

---

## Gmail SMTP Setup

1. Enable 2-Step Verification on your Google account.
2. Go to [Google App Passwords](https://myaccount.google.com/apppasswords).
3. Create a new App Password (select "Mail" + "Other").
4. Use that 16-character password as `SMTP_PASS`.

> The service will log a warning and skip email delivery if `SMTP_USER`/`SMTP_PASS` are not set, so the notification is still persisted.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Node environment |
| `PORT` | No | `3004` | HTTP port |
| `SERVICE_NAME` | No | `eventflow-notification-service` | Service identifier in logs |
| `MONGODB_URI` | **Yes** | — | MongoDB connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing secret |
| `SMTP_HOST` | No | `smtp.gmail.com` | SMTP host |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_SECURE` | No | `false` | Use TLS (set `true` for port 465) |
| `SMTP_USER` | No* | — | SMTP username / Gmail address |
| `SMTP_PASS` | No* | — | SMTP password / Gmail App Password |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins |
| `LOG_LEVEL` | No | `info` | Winston log level |

*Email delivery is silently skipped when SMTP credentials are absent.

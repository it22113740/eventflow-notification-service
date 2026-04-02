const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EventFlow Notification Service API",
      version: "1.0.0",
      description:
        "Microservice responsible for sending and managing notifications for the EventFlow platform.",
      contact: {
        name: "EventFlow Team",
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 3004}`,
        description: "Development server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT access token",
        },
      },
      schemas: {
        Notification: {
          type: "object",
          properties: {
            _id: { type: "string", example: "665f1a2b3c4d5e6f7a8b9c0d" },
            userId: { type: "string", example: "user_abc123" },
            userEmail: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            type: {
              type: "string",
              enum: [
                "BOOKING_CONFIRMED",
                "BOOKING_CANCELLED",
                "EVENT_UPDATED",
              ],
              example: "BOOKING_CONFIRMED",
            },
            message: {
              type: "string",
              example: "Your booking for Event XYZ has been confirmed.",
            },
            isRead: { type: "boolean", example: false },
            createdAt: {
              type: "string",
              format: "date-time",
              example: "2024-06-04T10:00:00.000Z",
            },
          },
        },
        NotifyRequest: {
          type: "object",
          required: ["userId", "userEmail", "type", "message"],
          properties: {
            userId: { type: "string", example: "user_abc123" },
            userEmail: {
              type: "string",
              format: "email",
              example: "user@example.com",
            },
            type: {
              type: "string",
              enum: [
                "BOOKING_CONFIRMED",
                "BOOKING_CANCELLED",
                "EVENT_UPDATED",
              ],
              example: "BOOKING_CONFIRMED",
            },
            message: {
              type: "string",
              example: "Your booking for Event XYZ has been confirmed.",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "An error occurred" },
            errors: {
              type: "array",
              items: { type: "object" },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;

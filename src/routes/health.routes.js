const { Router } = require("express");
const { getHealth } = require("../controllers/health.controller");

const router = Router();

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     description: Returns the operational status of the service and its dependencies.
 *     tags: [Health]
 *     security: []
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 service:
 *                   type: string
 *                   example: eventflow-notification-service
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 database:
 *                   type: string
 *                   example: connected
 *       503:
 *         description: Service is degraded (database unreachable)
 */
router.get("/api/health", getHealth);

module.exports = router;

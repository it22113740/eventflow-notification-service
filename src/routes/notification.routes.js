const { Router } = require("express");
const { param } = require("express-validator");
const {
  sendNotification,
  broadcastNewEvent,
  getMyNotifications,
  getUserNotifications,
  markAsRead,
} = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth");

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Notification management endpoints
 */

/**
 * @swagger
 * /api/notify:
 *   post:
 *     summary: Send a notification (internal service call)
 *     tags: [Notifications]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, userEmail, type]
 *             properties:
 *               userId:
 *                 type: string
 *               userEmail:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [BOOKING_CONFIRMED, BOOKING_CANCELLED, EVENT_UPDATED, NEW_EVENT]
 *               eventTitle:
 *                 type: string
 *               bookingId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Notification created
 *       400:
 *         description: Validation error
 */
router.post("/api/notify", sendNotification);

/**
 * @swagger
 * /api/notify/broadcast:
 *   post:
 *     summary: Broadcast a new event notification to all users (internal service call)
 *     tags: [Notifications]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventTitle, eventDate, eventLocation, eventId]
 *             properties:
 *               type:
 *                 type: string
 *               eventTitle:
 *                 type: string
 *               eventDate:
 *                 type: string
 *               eventLocation:
 *                 type: string
 *               eventId:
 *                 type: string
 *     responses:
 *       202:
 *         description: Broadcast queued
 */
router.post("/api/notify/broadcast", broadcastNewEvent);

/**
 * @swagger
 * /api/notifications/my:
 *   get:
 *     summary: Get authenticated user's own notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 */
router.get("/api/notifications/my", authenticate, getMyNotifications);

/**
 * @swagger
 * /api/notifications/{userId}:
 *   get:
 *     summary: Get notifications for a specific user (backward compat)
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of notifications
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  "/api/notifications/:userId",
  authenticate,
  [param("userId").trim().notEmpty().withMessage("userId param is required")],
  getUserNotifications
);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Not found
 */
router.put(
  "/api/notifications/:id/read",
  authenticate,
  [param("id").isMongoId().withMessage("id must be a valid MongoDB ObjectId")],
  markAsRead
);

module.exports = router;

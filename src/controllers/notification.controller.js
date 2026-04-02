const axios = require("axios");
const { Notification } = require("../models/Notification");
const { sendEmail } = require("../services/emailService");
const logger = require("../utils/logger");

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://user-service:3001";

/**
 * Generate a human-readable notification message based on type and payload.
 */
const generateMessage = (type, payload) => {
  switch (type) {
    case "BOOKING_CONFIRMED":
      return `Your booking for "${payload.eventTitle}" has been confirmed. Booking reference: ${payload.bookingId}.`;
    case "BOOKING_CANCELLED":
      return `Your booking for "${payload.eventTitle}" has been cancelled. Booking reference: ${payload.bookingId}.`;
    case "NEW_EVENT":
      return `New event '${payload.eventTitle}' has been added on ${new Date(payload.eventDate).toLocaleDateString()} at ${payload.eventLocation}. Book your spot now!`;
    default:
      return payload.message || "You have a new notification.";
  }
};

/**
 * POST /api/notify
 * Persist a notification and dispatch an email (called by internal services).
 */
const sendNotification = async (req, res, next) => {
  try {
    const { userId, userEmail, type, eventTitle, bookingId, message: explicitMessage } = req.body;

    if (!userId || !userEmail || !type) {
      return res.status(400).json({ success: false, message: "userId, userEmail, and type are required" });
    }

    const message = explicitMessage || generateMessage(type, { eventTitle, bookingId });

    const notification = await Notification.create({
      userId,
      userEmail,
      type,
      message,
    });

    // Fire-and-forget email
    sendEmail(userEmail, type, message).catch((err) =>
      logger.error("Background email error: %s", err.message)
    );

    logger.info(
      "Notification created [id=%s, userId=%s, type=%s]",
      notification._id,
      userId,
      type
    );

    return res.status(201).json({
      success: true,
      message: "Notification sent successfully",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notify/broadcast
 * Called by Event Service when a new event is created.
 * Fetches all users and sends each a notification + email asynchronously.
 */
const broadcastNewEvent = async (req, res, next) => {
  try {
    const { type, eventTitle, eventDate, eventLocation, eventId } = req.body;

    if (!eventTitle) {
      return res.status(400).json({ success: false, message: "eventTitle is required" });
    }

    // Respond immediately; process asynchronously
    res.status(202).json({ success: true, message: "Broadcast queued" });

    // Fetch all users from User Service
    let users = [];
    try {
      const { data } = await axios.get(`${USER_SERVICE_URL}/api/users/all`, { timeout: 5000 });
      users = data.data || data;
    } catch (err) {
      logger.error("Failed to fetch users for broadcast: %s", err.message);
      return;
    }

    const message = generateMessage("NEW_EVENT", { eventTitle, eventDate, eventLocation });

    // Send notifications concurrently in batches
    const tasks = users.map(async (user) => {
      try {
        await Notification.create({
          userId: user._id.toString(),
          userEmail: user.email,
          type: "NEW_EVENT",
          message,
        });
        sendEmail(user.email, "NEW_EVENT", message).catch((err) =>
          logger.warn("Failed to send broadcast email to %s: %s", user.email, err.message)
        );
      } catch (err) {
        logger.warn("Failed to create broadcast notification for user %s: %s", user._id, err.message);
      }
    });

    await Promise.allSettled(tasks);
    logger.info("Broadcast completed for event '%s' to %d users", eventTitle, users.length);
  } catch (error) {
    logger.error("Broadcast error: %s", error.message);
  }
};

/**
 * GET /api/notifications/my
 * Return authenticated user's own notifications.
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/notifications/:userId
 * Return all notifications for a user, newest first (kept for backward compatibility).
 */
const getUserNotifications = async (req, res, next) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: you can only access your own notifications",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.isRead !== undefined) filter.isRead = req.query.isRead === "true";

    const [notifications, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/notifications/:id/read
 * Mark a single notification as read.
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    if (notification.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden: you do not own this notification" });
    }

    if (notification.isRead) {
      return res.status(200).json({
        success: true,
        message: "Notification was already marked as read",
        data: notification,
      });
    }

    notification.isRead = true;
    await notification.save();

    logger.info("Notification [id=%s] marked as read", notification._id);

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { sendNotification, broadcastNewEvent, getMyNotifications, getUserNotifications, markAsRead };

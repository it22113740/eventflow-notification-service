const mongoose = require("mongoose");

const NOTIFICATION_TYPES = [
  "BOOKING_CONFIRMED",
  "BOOKING_CANCELLED",
  "EVENT_UPDATED",
  "NEW_EVENT",
];

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: [true, "userId is required"],
      index: true,
      trim: true,
    },
    userEmail: {
      type: String,
      required: [true, "userEmail is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
    },
    type: {
      type: String,
      required: [true, "Notification type is required"],
      enum: {
        values: NOTIFICATION_TYPES,
        message: `Notification type must be one of: ${NOTIFICATION_TYPES.join(", ")}`,
      },
    },
    message: {
      type: String,
      required: [true, "Message is required"],
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for efficient user-based queries sorted by date
notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };

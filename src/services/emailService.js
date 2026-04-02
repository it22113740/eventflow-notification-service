const nodemailer = require("nodemailer");
const logger = require("../utils/logger");

const EMAIL_SUBJECTS = {
  BOOKING_CONFIRMED: "Booking Confirmed - EventFlow",
  BOOKING_CANCELLED: "Booking Cancelled - EventFlow",
  EVENT_UPDATED: "Event Update - EventFlow",
  NEW_EVENT: "New Event Available - EventFlow",
};

const EMAIL_TEMPLATES = {
  BOOKING_CONFIRMED: (message) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Booking Confirmed!</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">${message}</p>
        <p style="color: #666; margin-top: 20px;">Thank you for using EventFlow!</p>
      </div>
      <div style="background-color: #eee; padding: 15px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">EventFlow Notification Service</p>
      </div>
    </div>
  `,
  BOOKING_CANCELLED: (message) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #F44336; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Booking Cancelled</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">${message}</p>
        <p style="color: #666; margin-top: 20px;">We're sorry for the inconvenience.</p>
      </div>
      <div style="background-color: #eee; padding: 15px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">EventFlow Notification Service</p>
      </div>
    </div>
  `,
  EVENT_UPDATED: (message) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2196F3; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">Event Updated</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">${message}</p>
        <p style="color: #666; margin-top: 20px;">Please review the changes and contact us if you have questions.</p>
      </div>
      <div style="background-color: #eee; padding: 15px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">EventFlow Notification Service</p>
      </div>
    </div>
  `,
  NEW_EVENT: (message) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #7C3AED; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">New Event Available!</h1>
      </div>
      <div style="padding: 30px; background-color: #f9f9f9;">
        <p style="font-size: 16px; color: #333;">${message}</p>
        <p style="color: #666; margin-top: 20px;">Log in to EventFlow to book your spot.</p>
      </div>
      <div style="background-color: #eee; padding: 15px; text-align: center;">
        <p style="color: #999; font-size: 12px; margin: 0;">EventFlow Notification Service</p>
      </div>
    </div>
  `,
};

let transporter = null;

const isBrevoHost = () =>
  String(process.env.SMTP_HOST || "")
    .toLowerCase()
    .includes("brevo");

/**
 * Brevo SMTP login is often *@smtp-brevo.com; the visible From must be a verified sender (SMTP_FROM).
 * Gmail and others can use SMTP_USER as From when SMTP_FROM is unset.
 */
const getMailFrom = () => {
  const address = process.env.SMTP_FROM || process.env.SMTP_USER;
  return `"EventFlow Notifications" <${address}>`;
};

const createTransporter = () => {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "true";

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    // Brevo / most relays on 587 use STARTTLS
    requireTLS: !secure && port === 587,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  return transporter;
};

/**
 * Sends an HTML email notification.
 * @param {string} to       - Recipient email address
 * @param {string} type     - Notification type key (e.g. BOOKING_CONFIRMED)
 * @param {string} message  - Plain-text message body
 * @returns {Promise<void>}
 */
const sendEmail = async (to, type, message) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn(
      "SMTP credentials not configured — skipping email for %s (%s)",
      to,
      type
    );
    return;
  }

  const subject = EMAIL_SUBJECTS[type] || "Notification - EventFlow";
  const htmlBody =
    EMAIL_TEMPLATES[type]?.(message) ||
    `<p>${message}</p>`;

  const mailOptions = {
    from: getMailFrom(),
    to,
    subject,
    html: htmlBody,
    text: message, // plain-text fallback
  };

  if (isBrevoHost() && !process.env.SMTP_FROM) {
    logger.warn(
      "Brevo: set SMTP_FROM to a verified sender email (From cannot be the smtp-brevo.com login)."
    );
  }

  try {
    const info = await createTransporter().sendMail(mailOptions);
    logger.info("Email sent to %s | messageId: %s", to, info.messageId);
  } catch (error) {
    // Log but don't throw — email failure should not block notification persistence
    logger.error("Failed to send email to %s: %s", to, error.message);
  }
};

module.exports = { sendEmail };

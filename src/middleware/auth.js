const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

/**
 * Validates a Bearer JWT from the Authorization header.
 * Attaches decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided.",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error("JWT_SECRET environment variable is not set");
      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token has expired",
      });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    logger.error("JWT verification error: %s", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
    });
  }
};

module.exports = { authenticate };

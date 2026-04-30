const jwt = require('jsonwebtoken');
const logger = require('./logger');

/**
 * Sign an access token (short-lived)
 */
const signAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Sign a refresh token (long-lived)
 */
const signRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
};

/**
 * Verify a refresh token
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    logger.warn(`Refresh token verification failed: ${err.message}`);
    return null;
  }
};

/**
 * Build consistent auth response (tokens + user)
 */
const buildAuthResponse = (user, accessToken, refreshToken) => ({
  success: true,
  accessToken,
  refreshToken,
  user: {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    phone: user.phone,
    role: user.role,
    organization: user.organization,
    profileImage: user.profileImage,
    lastLogin: user.lastLogin,
    loginCount: user.loginCount,
  },
});

module.exports = { signAccessToken, signRefreshToken, verifyRefreshToken, buildAuthResponse };

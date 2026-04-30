const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter, registerLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { signAccessToken, signRefreshToken, verifyRefreshToken, buildAuthResponse } = require('../utils/tokenHelper');
const logger = require('../utils/logger');
const sendEmail = require('../utils/sendEmail');

// Helper to generate 6 digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

/* ─── Validators ─────────────────────────────────────────────── */
const registerValidators = [
  body('firstName').trim().notEmpty().withMessage('First name is required').isLength({ max: 50 }),
  body('lastName').trim().notEmpty().withMessage('Last name is required').isLength({ max: 50 }),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').optional().trim(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/).withMessage('Password must contain at least one number'),
];

const loginValidators = [
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/* ─── POST /api/auth/register ────────────────────────────────── */
router.post('/register', registerLimiter, validate(registerValidators), async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Check existing user
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered. Please login.' });
    }

    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      firstName,
      lastName,
      email,
      phone: phone || '',
      passwordHash: password,
      isVerified: false,
      verificationOtp: otp,
      verificationOtpExpires: otpExpiresAt,
      lastLogin: new Date(),
      loginCount: 0,
    });

    // Send Email
    const emailSent = await sendEmail({
      email: user.email,
      subject: 'Railway Asset Tracking - Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4ade80;">Welcome to Railway Asset Tracking System!</h2>
          <p>Hi ${user.firstName},</p>
          <p>Please use the verification code below to verify your email address and activate your account.</p>
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
            <strong>${otp}</strong>
          </div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    if (!emailSent) {
      // If email fails, we might want to delete the user or handle gracefully.
      // For now, we'll keep the user but they will have to request a new OTP.
      logger.error(`Failed to send verification email to: ${email}`);
    }

    logger.info(`New user registered (pending verification): ${email}`);

    res.status(201).json({
      success: true,
      requireOtp: true,
      email: user.email,
      message: 'Verification code sent to your email.',
    });
  } catch (err) {
    logger.error(`Register error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

/* ─── POST /api/auth/login ───────────────────────────────────── */
router.post('/login', authLimiter, validate(loginValidators), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Include passwordHash explicitly (it's select:false)
    const user = await User.findOne({ email }).select('+passwordHash');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, requireOtp: true, message: 'Please verify your email address first.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      logger.warn(`Failed login attempt for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Update login metadata
    user.lastLogin = new Date();
    user.loginCount += 1;

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    // Clean old tokens, add new
    user.cleanExpiredTokens();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
    user.refreshTokens.push({ token: refreshToken, expiresAt: refreshExpiresAt });
    await user.save();

    logger.info(`User logged in: ${email}`);

    res.status(200).json(buildAuthResponse(user, accessToken, refreshToken));
  } catch (err) {
    logger.error(`Login error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

/* ─── POST /api/auth/verify-otp ──────────────────────────────── */
router.post('/verify-otp', authLimiter, validate([
  body('email').trim().isEmail().normalizeEmail(),
  body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
]), async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    const user = await User.findOne({ email }).select('+verificationOtp +verificationOtpExpires');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Email is already verified. Please login.' });
    }

    if (!user.verificationOtp || user.verificationOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid verification code.' });
    }

    if (user.verificationOtpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new one.' });
    }

    // Mark as verified
    user.isVerified = true;
    user.verificationOtp = undefined;
    user.verificationOtpExpires = undefined;
    user.lastLogin = new Date();
    user.loginCount += 1;

    // Generate tokens
    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);
    
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 30);
    user.refreshTokens.push({ token: refreshToken, expiresAt: refreshExpiresAt });
    
    await user.save();
    
    logger.info(`User verified and logged in: ${email}`);
    
    res.status(200).json(buildAuthResponse(user, accessToken, refreshToken));
  } catch (err) {
    logger.error(`Verify OTP error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

/* ─── POST /api/auth/resend-otp ──────────────────────────────── */
router.post('/resend-otp', authLimiter, validate([
  body('email').trim().isEmail().normalizeEmail()
]), async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal user existence
      return res.status(200).json({ success: true, message: 'If an account exists, a new code has been sent.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: 'Account is already verified. Please login.' });
    }

    const otp = generateOTP();
    user.verificationOtp = otp;
    user.verificationOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendEmail({
      email: user.email,
      subject: 'Railway Asset Tracking - New Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4ade80;">Your New Verification Code</h2>
          <p>Hi ${user.firstName},</p>
          <p>Here is your new verification code:</p>
          <div style="background: #1e293b; color: white; padding: 15px; text-align: center; font-size: 24px; letter-spacing: 5px; border-radius: 8px; margin: 20px 0;">
            <strong>${otp}</strong>
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });

    logger.info(`Resent OTP to: ${email}`);
    res.status(200).json({ success: true, message: 'A new verification code has been sent.' });
  } catch (err) {
    logger.error(`Resend OTP error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to resend code.' });
  }
});

/* ─── GET /api/auth/me ───────────────────────────────────────── */
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.status(200).json({
      success: true,
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
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    logger.error(`/me error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Could not fetch user.' });
  }
});

/* ─── PUT /api/auth/profile ──────────────────────────────────── */
router.put(
  '/profile',
  protect,
  validate([
    body('firstName').optional().trim().notEmpty().isLength({ max: 50 }),
    body('lastName').optional().trim().notEmpty().isLength({ max: 50 }),
    body('phone').optional().trim(),
    body('organization').optional().trim().isLength({ max: 100 }),
  ]),
  async (req, res) => {
    try {
      const { firstName, lastName, phone, organization } = req.body;
      const updates = {};
      if (firstName) updates.firstName = firstName;
      if (lastName) updates.lastName = lastName;
      if (phone !== undefined) updates.phone = phone;
      if (organization !== undefined) updates.organization = organization;

      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      });

      logger.info(`Profile updated for: ${user.email}`);
      res.status(200).json({ success: true, message: 'Profile updated.', user });
    } catch (err) {
      logger.error(`Profile update error: ${err.message}`);
      res.status(500).json({ success: false, message: 'Profile update failed.' });
    }
  }
);

/* ─── PUT /api/auth/role ─────────────────────────────────────── */
router.put('/role', protect, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['viewer', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role. Use viewer or admin.' });
    }
    await User.findByIdAndUpdate(req.user._id, { role });
    res.status(200).json({ success: true, message: `Role updated to ${role}.`, role });
  } catch (err) {
    logger.error(`Role update error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Role update failed.' });
  }
});

/* ─── POST /api/auth/refresh ─────────────────────────────────── */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.id).select('+refreshTokens');
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    // Check token exists in DB (rotation security)
    const tokenExists = user.refreshTokens.some(
      (rt) => rt.token === refreshToken && rt.expiresAt > new Date()
    );
    if (!tokenExists) {
      return res.status(401).json({ success: false, message: 'Refresh token revoked.' });
    }

    // Rotate: remove old, add new
    user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
    const newAccessToken = signAccessToken(user._id);
    const newRefreshToken = signRefreshToken(user._id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    user.refreshTokens.push({ token: newRefreshToken, expiresAt });
    await user.save();

    res.status(200).json({ success: true, accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (err) {
    logger.error(`Token refresh error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Token refresh failed.' });
  }
});

/* ─── POST /api/auth/logout ──────────────────────────────────── */
router.post('/logout', protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id).select('+refreshTokens');

    if (user && refreshToken) {
      // Revoke specific refresh token
      user.refreshTokens = user.refreshTokens.filter((rt) => rt.token !== refreshToken);
      await user.save();
    }

    logger.info(`User logged out: ${req.user.email}`);
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    logger.error(`Logout error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Logout failed.' });
  }
});

/* ─── POST /api/auth/logout-all ─────────────────────────────── */
router.post('/logout-all', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshTokens: [] });
    logger.info(`All sessions cleared for: ${req.user.email}`);
    res.status(200).json({ success: true, message: 'All devices logged out.' });
  } catch (err) {
    logger.error(`Logout-all error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Logout all failed.' });
  }
});

module.exports = router;

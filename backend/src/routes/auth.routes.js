/**
 * auth.routes.js — Auth endpoints (R01)
 * Joi validation applied before controller (R30).
 * Rate limiting applied on signup + login (R29).
 */
const express  = require('express');
const router   = express.Router();

const authController            = require('../controllers/auth.controller');
const { authenticate }          = require('../middleware/authenticate');
const { authLimiter }           = require('../middleware/rate-limit');
const { signupSchema, loginSchema, validate } = require('../auth/auth.validation');

// POST /api/v1/auth/signup  — create org + user
router.post('/signup',   authLimiter, validate(signupSchema), authController.signup);

// POST /api/v1/auth/register — backward-compat alias (Checkpoint 1 tests)
router.post('/register', authLimiter, validate(signupSchema), authController.register);

// POST /api/v1/auth/login
router.post('/login',    authLimiter, validate(loginSchema),  authController.login);

// POST /api/v1/auth/logout
router.post('/logout',   authenticate, authController.logout);

// GET  /api/v1/auth/me
router.get('/me',        authenticate, authController.me);

module.exports = router;

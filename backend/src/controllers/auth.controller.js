/**
 * auth.controller.js — Input validation + HTTP formatting for auth (R02)
 * Cookie: taskflow_session, httpOnly, SameSite=Lax, Secure in production (R27)
 */
const authService = require('../services/auth.service');

const COOKIE_NAME = 'taskflow_session';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'Lax',
  maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path:     '/',
};

async function signup(req, res, next) {
  try {
    const { token, user } = await authService.signup(req.body);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
}

// Alias — keeps existing /register route working
const register = signup;

async function login(req, res, next) {
  try {
    const { token, user } = await authService.login(req.body);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ message: 'Logged out successfully.' });
}

async function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { signup, register, login, logout, me };

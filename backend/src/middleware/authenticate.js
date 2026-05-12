/**
 * authenticate.js — JWT cookie authentication middleware (R27)
 * Reads JWT from req.cookies.taskflow_session.
 * Verifies signature and expiration.
 * Loads fresh user from DB (checks deleted_at R12 + org isolation R13).
 * Attaches req.user = { id, organizationId, email, name, role }.
 * Returns 401 on any failure.
 */
const jwt            = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');

const UNAUTHORIZED = {
  status:  401,
  error:   'unauthorized',
  message: 'Authentication required',
};

async function authenticate(req, res, next) {
  const token = req.cookies?.taskflow_session;

  if (!token) {
    return res.status(401).json(UNAUTHORIZED);
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json(UNAUTHORIZED);
  }

  try {
    const user = await userRepository.findById(payload.organizationId, payload.sub);
    if (!user) return res.status(401).json(UNAUTHORIZED);

    req.user = {
      id:             user.id,
      organizationId: user.organization_id,
      email:          user.email,
      name:           user.name,
      role:           user.role,
    };
    next();
  } catch {
    return res.status(401).json(UNAUTHORIZED);
  }
}

module.exports = { authenticate };

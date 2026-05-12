/**
 * auth.service.js — Business logic for authentication (R03)
 *
 * signup: creates org + admin user, hashes password (bcrypt cost 12), returns JWT
 * login:  verifies credentials — generic error, never reveals which field (R27)
 */
const bcrypt                 = require('bcrypt');
const jwt                    = require('jsonwebtoken');
const userRepository         = require('../repositories/user.repository');
const organizationRepository = require('../repositories/organization.repository');
const { createError }        = require('../middleware/errorHandler');

const BCRYPT_ROUNDS = 12; // R28

async function signup({ orgName, email, password, name }) {
  const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Check for duplicate email within the same org slug (409 Conflict)
  const existingOrg = await organizationRepository.findBySlug(slug);
  if (existingOrg) {
    const existingUser = await userRepository.findByEmail(existingOrg.id, email);
    if (existingUser) throw createError(409, 'An account with this email already exists.');
  }

  const org = await organizationRepository.create({ name: orgName, slug });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await userRepository.create({
    organization_id: org.id,
    email,
    password_hash:   passwordHash,
    name,
    role:            'owner',
  });

  const token = signToken(user);
  return { token, user: sanitizeUser(user) };
}

// Backward-compat alias for existing tests
const register = signup;

async function login({ email, password, organizationSlug }) {
  // Generic error — never reveal which field is wrong (R27)
  const INVALID = createError(401, 'Invalid email or password.');

  let user;

  if (organizationSlug) {
    const org = await organizationRepository.findBySlug(organizationSlug);
    if (!org) throw INVALID;
    user = await userRepository.findByEmail(org.id, email);
  } else {
    // No slug provided → find user globally by email
    user = await userRepository.findByEmailGlobal(email);
  }

  if (!user) throw INVALID;

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw INVALID;

  const token = signToken(user);
  return { token, user: sanitizeUser(user) };
}

function signToken(user) {
  return jwt.sign(
    {
      sub:            user.id,
      organizationId: user.organization_id,
      role:           user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

module.exports = { signup, register, login };

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repository');
const organizationRepository = require('../repositories/organization.repository');
const { createError } = require('../middleware/errorHandler');

const BCRYPT_ROUNDS = 12;

async function register({ orgName, email, password, name }) {
  const slug = orgName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const org = await organizationRepository.create({ name: orgName, slug });

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await userRepository.create({
    organization_id: org.id,
    email,
    password_hash: passwordHash,
    name,
    role: 'owner',
  });

  const token = signToken(user, org);
  return { token, user: sanitizeUser(user) };
}

async function login({ email, password, organizationSlug }) {
  const org = await organizationRepository.findBySlug(organizationSlug);
  if (!org) throw createError(422, 'Invalid credentials');

  const user = await userRepository.findByEmail(org.id, email);
  if (!user) throw createError(422, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw createError(422, 'Invalid credentials');

  const token = signToken(user, org);
  return { token, user: sanitizeUser(user) };
}

function signToken(user, org) {
  return jwt.sign(
    {
      sub: user.id,
      organizationId: user.organization_id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

module.exports = { register, login };

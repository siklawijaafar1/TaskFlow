const organizationRepository = require('../repositories/organization.repository');
const userRepository = require('../repositories/user.repository');
const bcrypt = require('bcrypt');
const { createError } = require('../middleware/errorHandler');

const BCRYPT_ROUNDS = 12;

async function getById(organizationId) {
  const org = await organizationRepository.findById(organizationId);
  if (!org) throw createError(403, 'Organization not found');
  return org;
}

async function update(organizationId, data) {
  return organizationRepository.update(organizationId, data);
}

async function listMembers(organizationId) {
  return userRepository.findAllByOrg(organizationId);
}

async function inviteMember(organizationId, { email, name, role = 'member', password }) {
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  return userRepository.create({
    organization_id: organizationId,
    email,
    name,
    role,
    password_hash: passwordHash,
  });
}

async function removeMember(organizationId, userId) {
  const user = await userRepository.findById(organizationId, userId);
  if (!user) throw createError(403, 'Member not found');
  return userRepository.remove(organizationId, userId);
}

module.exports = { getById, update, listMembers, inviteMember, removeMember };

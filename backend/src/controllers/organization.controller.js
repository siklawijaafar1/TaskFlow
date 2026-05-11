const organizationService = require('../services/organization.service');

async function getMyOrganization(req, res, next) {
  try {
    const org = await organizationService.getById(req.user.organizationId);
    res.json({ organization: org });
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const org = await organizationService.update(req.user.organizationId, req.body);
    res.json({ organization: org });
  } catch (err) {
    next(err);
  }
}

async function listMembers(req, res, next) {
  try {
    const members = await organizationService.listMembers(req.user.organizationId);
    res.json({ members });
  } catch (err) {
    next(err);
  }
}

async function inviteMember(req, res, next) {
  try {
    const member = await organizationService.inviteMember(req.user.organizationId, req.body);
    res.status(201).json({ member });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    await organizationService.removeMember(req.user.organizationId, req.params.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyOrganization, update, listMembers, inviteMember, removeMember };

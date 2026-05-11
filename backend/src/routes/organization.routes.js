const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organization.controller');
const { authenticate } = require('../middleware/authenticate');

router.use(authenticate);

router.get('/', organizationController.getMyOrganization);
router.put('/', organizationController.update);
router.get('/members', organizationController.listMembers);
router.post('/members/invite', organizationController.inviteMember);
router.delete('/members/:userId', organizationController.removeMember);

module.exports = router;

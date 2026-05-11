const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const organizationRoutes = require('./organization.routes');
const projectRoutes = require('./project.routes');
const taskRoutes = require('./task.routes');

router.use('/auth', authRoutes);
router.use('/organizations', organizationRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);

module.exports = router;

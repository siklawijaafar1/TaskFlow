const express = require('express');
const router = express.Router();
const projectController = require('../controllers/project.controller');
const { authenticate } = require('../middleware/authenticate');

router.use(authenticate);

router.get('/', projectController.list);
router.post('/', projectController.create);
router.get('/:id', projectController.getById);
router.put('/:id', projectController.update);
router.delete('/:id', projectController.remove);

module.exports = router;

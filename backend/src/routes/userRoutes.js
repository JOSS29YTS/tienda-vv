const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/authMiddleware');
const { blockWriteInDemo } = require('../middleware/demoMiddleware');

// Get all users requires token (allowed for Admins and Managers to view)
router.get('/', verifyToken, isAdminOrManager, userController.getAllUsers);

// Modifying user roles, stores, deactivation, and deleting requires Admin role
router.put('/:id/role', verifyToken, isAdmin, blockWriteInDemo, userController.updateUserRole);
router.put('/:id/store', verifyToken, isAdmin, blockWriteInDemo, userController.updateUserStore);
router.patch('/:id/activate', verifyToken, isAdmin, blockWriteInDemo, userController.activateUser);
router.delete('/:id', verifyToken, isAdmin, blockWriteInDemo, userController.deleteUser);

module.exports = router;

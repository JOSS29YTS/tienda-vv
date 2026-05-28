const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isAdmin, isAdminOrManager } = require('../middleware/authMiddleware');

// Get all users requires token (allowed for Admins and Managers to view)
router.get('/', verifyToken, isAdminOrManager, userController.getAllUsers);

// Modifying user roles, stores, deactivation, and deleting requires Admin role
router.put('/:id/role', verifyToken, isAdmin, userController.updateUserRole);
router.put('/:id/store', verifyToken, isAdmin, userController.updateUserStore);
router.patch('/:id/activate', verifyToken, isAdmin, userController.activateUser);
router.delete('/:id', verifyToken, isAdmin, userController.deleteUser);

module.exports = router;

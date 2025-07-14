// Routes - User
// backend\routes\user.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const userController = require("../controllers/user.controller");

// GET: Get current user profile
router.get("/me", authMiddleware, userController.getUserProfile);

// PATCH: Update current user profile
router.patch("/me", authMiddleware, userController.updateUserProfile);

// PATCH: Reset current user password
router.patch("/me/password", authMiddleware, userController.updateUserPassword);

// DELETE: Delete current user account
router.delete("/me", authMiddleware, userController.deleteUserAccount);

// GET: To check email validity (for adding a new user (member) into a farm operation)
router.get("/email/:email", authMiddleware, userController.getUserByEmail);

module.exports = router;

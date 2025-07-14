// Routes - Auth
// backend\routes\auth.routes.js

const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");

// POST: Register a new user
router.post("/register", authController.registerUser);

// POST: Login user (returns token)
router.post("/login", authController.loginUser);

// GET: Verify token validity
router.get("/verifyToken", authController.verifyToken);

module.exports = router;

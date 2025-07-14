// Routes - Farm
// backend\routes\farm.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const farmController = require("../controllers/farm.controller");

// POST: Create a new farm
router.post("/", authMiddleware, farmController.createFarm);

// GET: Get all farms (with populated admin and member info)
router.get("/", authMiddleware, farmController.getAllFarms);

// PATCH: Update farm details by _id
router.patch("/:id", authMiddleware, farmController.updateFarm);

// DELETE: Delete a farm by _id
router.delete("/:id", authMiddleware, farmController.deleteFarm);

// POST: Join a farm via farmName and accessCode
router.post("/join", authMiddleware, farmController.joinFarm);

// GET: To check whether a user has any farm (hasSetup)
router.get("/has-setup", authMiddleware, farmController.hasAnyFarm);

module.exports = router;

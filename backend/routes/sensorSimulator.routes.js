// Routes - Sensor Simulator
// backend\routes\sensorSimulator.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const simulatorController = require("../controllers/sensorSimulator.controller");

// All sensor simulator routes require a valid token
router.use(authMiddleware);

// GET: List simulator status for all user farms
router.get("/status", simulatorController.simulatorStatus);

// POST: Start simulator for one farm
router.post("/start/:farmObjectId", simulatorController.startSimulator);

// POST: Stop simulator for one farm
router.post("/stop/:farmObjectId", simulatorController.stopSimulator);

module.exports = router;

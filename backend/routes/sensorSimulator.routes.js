const express             = require("express");
const router              = express.Router();
const authMiddleware      = require("../middleware/auth");
const simulatorController = require("../controllers/sensorSimulator.controller");

// all routes require a valid JWT
router.use(authMiddleware);

// List simulator status for all your farms
router.get("/status", simulatorController.simulatorStatus);

// Start simulator for one farm
router.post("/start/:farmObjectId", simulatorController.startSimulator);

// Stop simulator for one farm
router.post("/stop/:farmObjectId", simulatorController.stopSimulator);

module.exports = router;

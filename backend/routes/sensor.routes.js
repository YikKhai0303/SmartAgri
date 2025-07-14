// Routes - Sensor
// backend\routes\sensor.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const sensorController = require("../controllers/sensor.controller");

// POST: Add a new sensor
router.post("/", authMiddleware, sensorController.addSensor);

// GET: Get sensors (optionally filter by sensorId, sensorName, dataType, isActive, farmObjectId, zoneObjectId)
router.get("/", authMiddleware, sensorController.getSensors);

// PATCH: Update sensor details by _id
router.patch("/:id", authMiddleware, sensorController.updateSensor);

// DELETE: Remove a sensor by _id
router.delete("/:id", authMiddleware, sensorController.deleteSensor);

// GET: Get all active sensors (for sensor simulator) (no auth)
router.get("/public/active", sensorController.getSensorsForSimulator);

module.exports = router;

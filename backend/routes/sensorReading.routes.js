// Routes - SensorReading
// backend\routes\sensorReading.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const readingController = require("../controllers/sensorReading.controller");

// POST: Add a new sensor reading
router.post("/", readingController.addReading);

// BOTH GET: Optionally filter by [sensorId, sensorName],  [farmId, farmName], [zoneId, zoneName], dataType
// GET: Get latest readings
router.get("/latest", authMiddleware, readingController.getLatestReadings);

// POST: Add multiple sensor readings (batch insert)
router.post("/bulk", readingController.addReadingsBulk);

router.get("/zone-aggregated", authMiddleware, readingController.getZoneAggregatedReadings);

router.get("/farm-aggregated", authMiddleware,readingController.getFarmAggregatedReadings);

module.exports = router;

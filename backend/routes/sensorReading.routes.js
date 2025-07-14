// Routes - Sensor Reading
// backend\routes\sensorReading.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const readingController = require("../controllers/sensorReading.controller");

// POST: Add a new sensor reading (for both live sensor simulator operation and user controlled simulator)
router.post("/", readingController.addReading);

// POST: Add multiple sensor readings (batch insert) (for historical data insertion)
router.post("/bulk", readingController.addReadingsBulk);

// GET: Get latest readings (live) (Optionally filter by farmName, zoneName, sensorName, dataType)
router.get("/latest", authMiddleware, readingController.getLatestReadings);

// GET: Get historical readings (zone level summary)
router.get("/zone-aggregated", authMiddleware, readingController.getZoneAggregatedReadings);

// GET: Get historical readings (farm level summary)
router.get("/farm-aggregated", authMiddleware,readingController.getFarmAggregatedReadings);

module.exports = router;

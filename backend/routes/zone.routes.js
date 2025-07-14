// Routes - Zone
// backend\routes\zone.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const zoneController = require("../controllers/zone.controller");

// POST: Create a new zone
router.post("/", authMiddleware, zoneController.createZone);

// GET: Get all zones (with populated farm info)
router.get("/", authMiddleware, zoneController.getAllZones);

// PATCH: Update zone details by _id
router.patch("/:id", authMiddleware, zoneController.updateZone);

// DELETE: Delete a zone by _id
router.delete("/:id", authMiddleware, zoneController.deleteZone);

module.exports = router;

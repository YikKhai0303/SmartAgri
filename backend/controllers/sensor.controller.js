// Controller - Sensor
// backend\controllers\sensor.controller.js

const Sensor = require("../models/Sensor");
const Farm = require("../models/Farm");
const Zone = require("../models/Zone");
const SensorReading = require('../models/SensorReading');
const generateId = require("../utils/idGenerator")

// POST: Add a new sensor
exports.addSensor = async (req, res) => {
  try {
    const { sensorName, dataTypes, isActive, farmObjectId, zoneObjectId } = req.body;

    const farm = await Farm.findById(farmObjectId);
    const zone = await Zone.findById(zoneObjectId);
    if (!farm || !zone) return res.status(404).json({ error: "Associated farm or zone not found." });
    if (!zone.farmObjectId.equals(farm._id)) return res.status(400).json({ error: "Zone does not belong to the selected farm." });

    const isAdmin = farm.members.some(
      m => m.user.equals(req.user._id) && m.role === "admin"
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can add a sensor." });

    const sensorId = generateId("SN");
    const sensor = new Sensor({
      sensorId,
      sensorName,
      dataTypes,
      isActive,
      farmObjectId,
      zoneObjectId,
    });

    await sensor.save();
    res.status(201).json(sensor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET: Get sensors (optionally filter by sensorName, dataType, farmObjectId, zoneObjectId)
exports.getSensors = async (req, res) => {
  try {
    const filter = {};

    if (req.query.sensorId) {
      filter.sensorId = { $regex: req.query.sensorId.trim(), $options: "i" };
    }
    if (req.query.sensorName) {
      filter.sensorName = { $regex: req.query.sensorName.trim(), $options: "i" };
    }

    if (req.query.dataType) {
      const dataTypes = Array.isArray(req.query.dataType)
        ? req.query.dataType
        : [req.query.dataType];
      filter.dataTypes = { $in: dataTypes };
    }

    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    if (req.query.farmId || req.query.farmName) {
      const farmFilter = {};
      if (req.query.farmId) farmFilter.farmId = { $regex: req.query.farmId.trim(), $options: "i" };
      if (req.query.farmName) farmFilter.farmName = { $regex: req.query.farmName.trim(), $options: "i" };
      const farms = await Farm.find(farmFilter);
      if (farms.length === 0) return res.json([]);
      filter.farmObjectId = { $in: farms.map(f => f._id) };
    }

    if (req.query.zoneId || req.query.zoneName) {
      const zoneFilter = {};
      if (req.query.zoneId) zoneFilter.zoneId = { $regex: req.query.zoneId.trim(), $options: "i" };
      if (req.query.zoneName) zoneFilter.zoneName = { $regex: req.query.zoneName.trim(), $options: "i" };
      const zones = await Zone.find(zoneFilter);
      if (zones.length === 0) return res.json([]);
      filter.zoneObjectId = { $in: zones.map(z => z._id) };
    }

    const userFarms = await Farm.find({
      "members.user": req.user._id
    }).select("_id");
    filter.farmObjectId = {
      ...(filter.farmObjectId || {}),
      $in: userFarms.map(f => f._id)
    };

    const sensors = await Sensor.find(filter)
      .populate("farmObjectId", "farmId farmName")
      .populate("zoneObjectId", "zoneId zoneName");

    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH: Update sensor details by _id
exports.updateSensor = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id).populate("farmObjectId");
    if (!sensor) return res.status(404).json({ error: "Sensor not found." });

    const isAdmin = sensor.farmObjectId.members.some(
      m => m.user.equals(req.user._id) && m.role === "admin"
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can update sensor details." });

    const { sensorId: ignoredId, ...updates } = req.body;
    const updatedSensor = await Sensor.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json(updatedSensor);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE: Remove a sensor by _id
exports.deleteSensor = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id)
      .populate("farmObjectId")
      .populate("zoneObjectId");

    if (!sensor) return res.status(404).json({ error: "Sensor not found." });

    const isAdmin = sensor.farmObjectId.members.some(
      m => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can delete a sensor." });

    await SensorReading.deleteMany({ sensorObjectId: sensor._id });
    await sensor.deleteOne();

    res.json({ message: "Sensor and its readings deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: Get all active sensors (no auth) (for sensor simulator related developer use)
exports.getSensorsForSimulator = async (req, res) => {
  try {
    const sensors = await Sensor.find({ isActive: true }).select("_id sensorId sensorName dataTypes");
    res.json(sensors);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve sensors for simulator." });
  }
};

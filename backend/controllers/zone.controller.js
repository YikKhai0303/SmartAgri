// Controller - Zone
// backend\controllers\zone.controller.js

const Zone = require("../models/Zone");
const Farm = require("../models/Farm");
const Sensor = require("../models/Sensor");
const SensorReading = require("../models/SensorReading");
const generateId = require("../utils/idGenerator")

// POST: Create a new zone
exports.createZone = async (req, res) => {
  try {
    const { zoneName, description, farmObjectId } = req.body;

    const farm = await Farm.findById(farmObjectId);
    if (!farm) return res.status(404).json({ error: "Associated farm not found." });

    const isAdmin = farm.members.some(
      m => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can create a zone." });

    const existingZoneName = await Zone.findOne({ zoneName, farmObjectId });
    if (existingZoneName) return res.status(400).json({ error: "Zone name already exists in this farm." });

    const zoneId = generateId("ZN");
    const zone = new Zone({
      zoneId,
      zoneName,
      description,
      farmObjectId,
    });

    await zone.save();
    res.status(201).json(zone);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET: Get all zones (with populated farm info)
exports.getAllZones = async (req, res) => {
  try {
    const userFarms = await Farm.find({
      "members.user": req.user._id
    }).select("_id");
    const farmIds = userFarms.map(f => f._id);

    const zones = await Zone.find({ farmObjectId: { $in: farmIds } })
      .populate("farmObjectId", "farmId farmName");

    res.json(zones);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH: Update zone details by _id
exports.updateZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).populate("farmObjectId");
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const isAdmin = zone.farmObjectId.members.some(
      m => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can update zone details." });

    const { zoneId: ignoredId, zoneName, ...updates } = req.body;
    if (zoneName && zoneName !== zone.zoneName) {
      const existingZoneName = await Zone.findOne({ zoneName, farmObjectId: zone.farmObjectId._id });
      if (existingZoneName && !existingZoneName._id.equals(zone._id)) {
        return res.status(400).json({ error: "Zone name already exists in this farm." });
      }
    }

    const updatedZone = await Zone.findByIdAndUpdate(
      req.params.id,
      { ...(zoneName && { zoneName }), ...updates },
      { new: true, runValidators: true }
    );

    res.json(updatedZone);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE: Delete a zone by _id
exports.deleteZone = async (req, res) => {
  try {
    const zone = await Zone.findById(req.params.id).populate("farmObjectId");
    if (!zone) return res.status(404).json({ error: "Zone not found." });

    const isAdmin = zone.farmObjectId.members.some(
      m => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can delete a zone." });

    const sensors = await Sensor.find({ zoneObjectId: zone._id });
    const sensorIds = sensors.map(s => s._id);

    await SensorReading.deleteMany({ sensorObjectId: { $in: sensorIds } });
    await Sensor.deleteMany({ _id: { $in: sensorIds } });
    await zone.deleteOne();

    res.json({ message: "Zone and all related sensors and readings deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

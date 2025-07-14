// Controller - Farm
// backend\controllers\farm.controller.js

const Farm = require("../models/Farm");
const Zone = require("../models/Zone");
const Sensor = require("../models/Sensor");
const SensorReading = require("../models/SensorReading");
const User = require("../models/User");
const generateId = require("../utils/idGenerator")

// POST: Create a new farm
exports.createFarm = async (req, res) => {
  try {
    const { farmName, location, accessCode } = req.body;

    const existingFarmName = await Farm.findOne({ farmName });
    if (existingFarmName) return res.status(400).json({ error: "Farm name already exists." });

    const farmId = generateId("FM");
    const farm = new Farm({
      farmId,
      farmName,
      location,
      accessCode,
      members: [{ user: req.user._id, role: 'admin' }]
    });

    await farm.save();
    res.status(201).json(farm);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET: Get all farms (with populated admin and member info)
exports.getAllFarms = async (req, res) => {
  try {
    const userId = req.user._id;

    const farms = await Farm.find({
      "members.user": userId
    }).populate("members.user", "userName email");

    res.json(farms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PATCH: Update farm details by _id
exports.updateFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    const isAdmin = farm.members.some(
      m => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can edit farm details." });

    const { farmName, location, accessCode, members = [] } = req.body;

    if (farmName && farmName !== farm.farmName) {
      const existingFarmName = await Farm.findOne({ farmName });
      if (existingFarmName) return res.status(400).json({ error: "Farm name already exists." });
    }

    const emails = members.map(m => m.email.toLowerCase().trim());
    const users = await User.find({ email: { $in: emails } });
    const emailToIdMap = Object.fromEntries(users.map(u => [u.email, u._id]));

    const updatedMembers = [];
    for (const m of members) {
      const userId = emailToIdMap[m.email.toLowerCase().trim()];
      if (!userId) continue;
      updatedMembers.push({ user: userId, role: m.role === 'admin' ? 'admin' : 'member' });
    }

    if (!updatedMembers.some(m => m.role === 'admin')) {
      return res.status(400).json({ error: "At least one admin is required." });
    }

    const updates = {
      ...(farmName && { farmName }),
      ...(location && { location }),
      ...(accessCode && { accessCode }),
      members: updatedMembers
    };

    const updatedFarm = await Farm.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate("members.user", "userName email");

    res.json(updatedFarm);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE: Delete a farm by _id
exports.deleteFarm = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.id);
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    const isAdmin = farm.members.some(
      m => m.user.equals(req.user._id) && m.role === 'admin'
    );
    if (!isAdmin) return res.status(403).json({ error: "Only admins can delete a farm." });

    const zones = await Zone.find({ farmObjectId: farm._id });
    const zoneIds = zones.map(z => z._id);
    const sensors = await Sensor.find({ zoneObjectId: { $in: zoneIds } });
    const sensorIds = sensors.map(s => s._id);

    await SensorReading.deleteMany({ sensorObjectId: { $in: sensorIds } });
    await Sensor.deleteMany({ _id: { $in: sensorIds } });
    await Zone.deleteMany({ _id: { $in: zoneIds } });
    await farm.deleteOne();

    res.json({ message: "Farm and all related zones, sensors, and readings deleted." });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST: Join a farm via farmName and accessCode
exports.joinFarm = async (req, res) => {
  try {
    const { farmName, accessCode } = req.body;
    const userId = req.user._id;

    const farm = await Farm.findOne({ farmName });
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    if (farm.accessCode !== accessCode) return res.status(403).json({ error: "Invalid access code." });

    const alreadyMember = farm.members.some(m => m.user.equals(userId));
    if (alreadyMember) return res.status(400).json({ error: "You are already a member of this farm." });

    farm.members.push({ user: userId, role: "member" });
    await farm.save();

    res.json({ message: `Successfully joined farm ${farmName}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET: To check whether a user has any farm (hasSetup)
exports.hasAnyFarm = async (req, res) => {
  try {
    const farms = await Farm.find({ "members.user": req.user._id }).select("_id");
    res.json({ hasSetup: farms.length > 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

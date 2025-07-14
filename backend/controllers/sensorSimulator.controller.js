// Controller - Sensor Simulator
// backend\controllers\sensorSimulator.controller.js

const Farm = require("../models/Farm");
const SensorSimulator = require("../models/SensorSimulator");
const { start, stop } = require("../services/sensorSimulator.service");

// GET: List simulator status for all user farms
exports.simulatorStatus = async (req, res) => {
  try {
    const userFarms = await Farm.find({ "members.user": req.user._id }).select("_id farmName members");

    const statuses = await SensorSimulator.find({
      farm: { $in: userFarms.map(f => f._id) }
    }).select("farm isRunning");

    const result = userFarms.map(f => {
      const rec = statuses.find(s => s.farm.equals(f._id));
      const isAdmin = f.members.some(
        m => m.user.equals(req.user._id) && m.role === "admin"
      );
      return {
        farmObjectId: f._id.toString(),
        farmName: f.farmName,
        isRunning: rec?.isRunning ?? false,
        isAdmin
      };
    });

    return res.json(result);
  } catch (err) {
    console.error("Simulator status error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// POST: Start simulator for one farm
exports.startSimulator = async (req, res) => {
  const { farmObjectId } = req.params;
  try {
    const farm = await Farm.findById(farmObjectId);
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    const isAdmin = farm.members.some(
      m => m.user.equals(req.user._id) && m.role === "admin"
    );
    if (!isAdmin) return res.status(403).json({ error: "Not an admin." });

    await start(farmObjectId);
    const sim = await SensorSimulator.findOneAndUpdate(
      { farm: farmObjectId },
      { farm: farmObjectId, isRunning: true },
      { upsert: true, new: true }
    );

    return res.json({ message: "Simulator started.", simulator: sim });
  } catch (err) {
    console.error("Start simulator error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// POST: Stop simulator for one farm
exports.stopSimulator = async (req, res) => {
  const { farmObjectId } = req.params;
  try {
    const farm = await Farm.findById(farmObjectId);
    if (!farm) return res.status(404).json({ error: "Farm not found." });

    const isAdmin = farm.members.some(
      m => m.user.equals(req.user._id) && m.role === "admin"
    );
    if (!isAdmin) return res.status(403).json({ error: "Not an admin." });

    stop(farmObjectId);
    await SensorSimulator.updateOne(
      { farm: farmObjectId },
      { isRunning: false }
    );

    return res.json({ message: "Simulator stopped." });
  } catch (err) {
    console.error("Stop simulator error:", err);
    return res.status(500).json({ error: err.message });
  }
};

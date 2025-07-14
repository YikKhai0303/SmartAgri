// backend/controllers/sensorSimulator.controller.js
const Farm             = require("../models/Farm");
const SensorSimulator  = require("../models/SensorSimulator");
const { start, stop }  = require("../services/sensorSimulator.service");

exports.simulatorStatus = async (req, res) => {
  try {
    // 1. Find all farms the user belongs to (grab members so you can check role)
    const userFarms = await Farm.find({ "members.user": req.user._id })
                                .select("_id farmName members");

    // 2. Load any persisted flags
    const statuses = await SensorSimulator.find({
      farm: { $in: userFarms.map(f => f._id) }
    }).select("farm isRunning");

    // 3. Merge into exactly the structure the front-end expects
    const result = userFarms.map(f => {
      const rec = statuses.find(s => s.farm.equals(f._id));
      const isAdmin = f.members.some(
        m => m.user.equals(req.user._id) && m.role === "admin"
      );
      return {
        farmObjectId: f._id.toString(),
        farmName:     f.farmName,
        isRunning:    rec?.isRunning ?? false,
        isAdmin
      };
    });

    return res.json(result);

  } catch (err) {
    console.error("❌ simulatorStatus error:", err);
    return res.status(500).json({ error: err.message });
  }
};

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
    console.error("❌ startSimulator error:", err);
    return res.status(500).json({ error: err.message });
  }
};

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
    console.error("❌ stopSimulator error:", err);
    return res.status(500).json({ error: err.message });
  }
};

// Model (Schema) - Sensor Simulator
// backend\models\SensorSimulator.js

const mongoose = require("mongoose");

const SensorSimulatorSchema = new mongoose.Schema({
  farm: { type: mongoose.Schema.Types.ObjectId, ref: "Farm", required: true, unique: true },
  isRunning: { type: Boolean, default: false }
});

module.exports = mongoose.model("SensorSimulator", SensorSimulatorSchema);

// Model (Schema) - Sensor Reading
// backend\models\SensorReading.js

const mongoose = require("mongoose");

const SensorReadingSchema = new mongoose.Schema({
  sensorObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true },
  sourceSensorObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sensor', required: true },
  dataType: { type: String, required: true },
  value: { type: Number, required: true },
  timestamp: { type: Date, default: Date.now }
});

// Index to speed up latest & history queries
SensorReadingSchema.index({ sensorObjectId: 1, dataType: 1, timestamp: -1 });
SensorReadingSchema.index({ sourceSensorObjectId: 1, dataType: 1, timestamp: -1 });


module.exports = mongoose.model("SensorReading", SensorReadingSchema);

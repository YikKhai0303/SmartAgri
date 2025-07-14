// Model (Schema) - Sensor
// backend\models\Sensor.js

const mongoose = require("mongoose");

const SensorSchema = new mongoose.Schema({
  sensorId: { type: String, required: true, trim: true , unique: true},
  sensorName: { type: String, required: true, trim: true},
  dataTypes: [{ type: String, required: true }],
  isActive: { type: Boolean, default: true },
  farmObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm' },
  zoneObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' }
}, {
  timestamps: true
});

SensorSchema.pre('validate', function (next) {
  if (this.isActive && (!this.farmObjectId || !this.zoneObjectId)) {
    return next(new Error("Active sensors must have both farmObjectId and zoneObjectId."));
  }
  next();
});

SensorSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate();
  const doc = await this.model.findOne(this.getQuery());

  const isActive = update.isActive ?? doc.isActive;
  const farmObjectId = update.farmObjectId ?? doc.farmObjectId;
  const zoneObjectId = update.zoneObjectId ?? doc.zoneObjectId;

  if (isActive && (!farmObjectId || !zoneObjectId)) {
    return next(new Error("Active sensors must have both farmObjectId and zoneObjectId."));
  }
  next();
});

module.exports = mongoose.model("Sensor", SensorSchema);

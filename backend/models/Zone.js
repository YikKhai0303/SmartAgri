// Model (Schema) - Zone
// backend\models\Zone.js

const mongoose = require("mongoose");

const ZoneSchema = new mongoose.Schema({
  zoneId: { type: String, required: true, trim: true , unique: true},
  zoneName: { type: String, required: true, trim: true },
  description: { type: String, required: true, trim: true },
  farmObjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Farm', required: true }
}, {
  timestamps: true
});

module.exports = mongoose.model("Zone", ZoneSchema);

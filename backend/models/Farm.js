// Model (Schema) - Farm
// backend\models\Farm.js

const mongoose = require("mongoose");

// To store the role (member/admin) of each user in a farm
const MemberSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['admin', 'member'], required: true }
}, { _id: false });

const FarmSchema = new mongoose.Schema({
  farmId: { type: String, required: true, trim: true, unique: true },
  farmName: { type: String, required: true, trim: true, unique: true },
  location: { type: String, required: true, trim: true },
  accessCode: { type: String, required: true, trim: true },
  members: [MemberSchema]
}, { timestamps: true });

FarmSchema.pre("validate", function (next) {
  const userIds = this.members.map(m => m.user.toString());
  const hasDuplicate = new Set(userIds).size !== userIds.length;
  if (hasDuplicate) return next(new Error("Duplicate user found in members."));
  next();
});

module.exports = mongoose.model("Farm", FarmSchema);

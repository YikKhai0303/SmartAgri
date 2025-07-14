// Model (Schema) - User
// backend\models\User.js

const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  userId : { type: String, required: true, unique: true, trim: true},
  userName: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, select: false }
}, {
  timestamps: true
});

module.exports = mongoose.model("User", UserSchema);

// Controller - User
// backend\controllers\user.controller.js

const bcrypt = require("bcryptjs");
const User = require("../models/User");

// GET: Get current user profile
exports.getUserProfile = async (req, res) => {
  try {
    const { userId, userName, email, createdAt, updatedAt } = req.user;
    res.json({ userId, userName, email, createdAt, updatedAt });
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve user profile." });
  }
};

// PATCH: Update current user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const { userName, email } = req.body;
    const currentUserId = req.user._id;
    const updates = {};

    if (userName) {
      const userExists = await User.findOne({ userName, _id: { $ne: currentUserId } });
      if (userExists) return res.status(400).json({ error: "Username is already in use." });
      updates.userName = userName;
    }
    if (email) {
      const emailExists = await User.findOne({ email, _id: { $ne: currentUserId } });
      if (emailExists) return res.status(400).json({ error: "Email is already in use." });
      updates.email = email;
    }

    const updatedUser = await User.findByIdAndUpdate(
      currentUserId,
      updates,
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ error: "User not found." });

    const { userId, userName: name, email: mail, createdAt, updatedAt } = updatedUser;
    res.json({ userId, userName: name, email: mail, createdAt, updatedAt });
  } catch (err) {
    res.status(400).json({ error: "Failed to update user profile." });
  }
};

// PATCH: Update current user password (old + new)
exports.updateUserPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Both oldPassword and newPassword are required." });
    }

    // grab the hash so we can compare
    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ error: "User not found." });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ error: "Current password is incorrect." });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to update password." });
  }
};

// DELETE: Delete current user account
exports.deleteUserAccount = async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ userId: req.user.userId });
    if (!deletedUser) return res.status(404).json({ error: "User not found." });
    res.json({ message: "User account deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete user account." });
  }
};



exports.getUserByEmail = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.trim().toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ userName: user.userName, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false }, // Optional for password-free auth
  phone: String,
  avatar: String,
  role: { type: String, default: "customer" }, // Automatically set to "customer" for new signups
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);

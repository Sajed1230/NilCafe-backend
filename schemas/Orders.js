// models/Order.js
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  items: [
    {
      productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
      },
      name: String,
      price: Number,
      quantity: Number,
    },
  ],

  totalPrice: {
    type: Number,
    required: true,
  },

  status: {
    type: String,
    enum: ["pending", "preparing", "ready", "on-the-way", "delivered", "cancelled"],
    default: "pending",
  },

  orderType: {
    type: String,
    enum: ["delivery", "restaurant"],
    required: true,
  },

  deliveryAddress: {
    type: String,
    default: null,
  },

  tableNumber: {
    type: Number,
    default: null,
  },

  preparedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  deliveryPersonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },

  paymentStatus: {
    type: String,
    enum: ["unpaid", "paid"],
    default: "paid", // Assuming payment is processed when order is placed
  },

  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
  },

  doorPhoto: {
    type: String, // Will store base64 encoded image or URL
    default: null,
  },

}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);

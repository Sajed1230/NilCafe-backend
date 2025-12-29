// models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  image: String, // image URL or filename (base64 or URL)
  category: { 
    type: String, 
    enum: ['Coffee', 'Tea', 'Juices', 'Snacks', 'Desserts'],
    required: true 
  },
  menuId: { type: mongoose.Schema.Types.ObjectId, ref: "Menu" },
  isAvailable: { type: Boolean, default: true },
}, { timestamps: true });

// Add indexes for faster queries
productSchema.index({ createdAt: -1 }); // Index for sorting by creation date
productSchema.index({ category: 1 }); // Index for filtering by category
productSchema.index({ isAvailable: 1 }); // Index for filtering by availability

module.exports = mongoose.model("Product", productSchema);

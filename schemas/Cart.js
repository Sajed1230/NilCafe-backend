const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true // One cart per customer
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
      quantity: {
        type: Number,
        default: 1,
        min: 1
      },
      image: String,
      description: String,
      category: String
    }
  ],
}, { timestamps: true });

// Note: updatedAt is automatically managed by Mongoose timestamps option
// No need for pre-save hook

module.exports = mongoose.model("Cart", cartSchema);


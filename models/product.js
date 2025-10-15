// models/product.js
const mongoose = require("mongoose"); // ADD THIS LINE

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String },
  description: { type: String },
  color: { type: String },
  images: { type: [String], default: [] },
  soldOut: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
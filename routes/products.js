const express = require("express");
const router = express.Router();
const Product = require("../models/product");
const multer = require("multer");
const { authenticateAdmin } = require("../middleware/auth"); // Add auth protection

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: 'df8pjutfz',
  api_key: '489545668229642',
  api_secret: '2N50BVr6v11jQ5zjDNn5lheuY90'
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'clothstore/products',
    public_id: (req, file) => {
      return 'img_' + Date.now() + '_' + Math.round(Math.random() * 1e9);
    },
  },
});

const upload = multer({ storage });

// GET all products (public route)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ADD: Update product sold out status (protected route)
router.put("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { soldOut } = req.body;

    const product = await Product.findByIdAndUpdate(
      id,
      { soldOut },
      { new: true } // Return updated product
    );

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// POST new product (protected route)
router.post("/", authenticateAdmin, upload.array("images", 10), async (req, res) => {
  try {
    const { name, price, category, description, color, soldOut } = req.body;
    if (!name || !price) return res.status(400).json({ message: "Name and price required" });

    const uploadedUrls = req.files ? req.files.map(file => file.path) : [];

    const newProduct = new Product({
      name,
      price,
      category,
      description,
      color,
      images: uploadedUrls,
      soldOut: soldOut || false
    });

    await newProduct.save();
    res.status(201).json({ message: "Product added", product: newProduct });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// PUT upload more images (protected route)
router.put("/:id/upload-images", authenticateAdmin, upload.array("images", 10), async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const newImageUrls = req.files.map(file => file.path);
    product.images.push(...newImageUrls);
    await product.save();

    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// DELETE product (protected route)
router.delete("/:id", authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    res.json({ message: "Product deleted", id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
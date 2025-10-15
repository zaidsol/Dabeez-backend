const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
require('dotenv').config();


const authRouter = require('./routes/auth');
const contactRouter = require('./routes/contact');
const adminLoginRouter = require("./routes/authlogin");
const productsRouter = require("./routes/products");


const { authenticateAdmin } = require('./middleware/auth');
const Product = require("./models/product");


const multer = require("multer");
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

const app = express();
app.use(cors());
app.use(express.json());



mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ Connection Error:", err));


// Public routes
app.use("/auth", authRouter);
app.use("/admin/login", adminLoginRouter);
app.use("/products", productsRouter);
app.use("/api/contact", contactRouter); 

// Add this with other route imports
const ordersRouter = require('./routes/order');

// Add this with other route uses
app.use("/api/orders", ordersRouter);


// Protected admin routes
app.delete("/products/:id", authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findByIdAndDelete(id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Product deleted", id });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.post("/products", authenticateAdmin, upload.array("images", 10), async (req, res) => {
  const { name, price, category, description, color } = req.body;
  try {
    if (!name || !price) return res.status(400).json({ message: "Name and price required" });
    
    const uploadedUrls = req.files ? req.files.map(file => file.path) : [];
    const newProduct = new Product({ 
      name, 
      price, 
      category, 
      description, 
      color, 
      images: uploadedUrls 
    });
    await newProduct.save();
    
    res.status(201).json({ message: "Product added", product: newProduct });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

app.put("/products/:id/upload-images", authenticateAdmin, upload.array("images", 10), async (req, res) => {
  const { id } = req.params;
  try {
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

// Start server
app.listen(3001, () => console.log("🚀 Server running on port 3001"));
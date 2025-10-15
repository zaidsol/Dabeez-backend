// routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const adminUser = {
  email: "admin@clothstore.com",
  password: "admin123",
  name: "Admin",
  role: "admin",
};

// Login route
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (email === adminUser.email && password === adminUser.password) {
      const token = jwt.sign(
        { 
          email: adminUser.email, 
          name: adminUser.name, 
          role: adminUser.role 
        }, 
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: "Login successful.",
        token,
        user: { 
          email: adminUser.email, 
          name: adminUser.name, 
          role: adminUser.role 
        },
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Verify token route
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, message: "Token required" });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.status(401).json({ valid: false, message: "Invalid token" });
  }
});

module.exports = router;
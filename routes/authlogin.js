const express = require("express");
const router = express.Router();

// Hardcoded admin credentials
const adminUser = {
  email: "admin@clothstore.com",
  password: "admin123",
  name: "Admin",
  role: "admin",
};

// POST /login
router.post("/", (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    if (email === adminUser.email && password === adminUser.password) {
      return res.status(200).json({
        message: "Login successful.",
        user: { email: adminUser.email, name: adminUser.name, role: adminUser.role },
      });
    } else {
      return res.status(401).json({ message: "Invalid email or password." });
    }
  } catch (err) {
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;

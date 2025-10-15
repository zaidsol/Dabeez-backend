const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Debug: Check if environment variables are loading
console.log('🔍 Debug - Environment Variables:');
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASS length:', process.env.EMAIL_PASS?.length);
console.log('EMAIL_PASS value:', process.env.EMAIL_PASS ? '***' + process.env.EMAIL_PASS.slice(-4) : 'undefined');

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Test the connection
transporter.verify(function(error, success) {
  if (error) {
    console.log('❌ SMTP Connection FAILED:', error);
  } else {
    console.log('✅ SMTP Server is ready to take our messages');
  }
});

// Contact form with real email
router.post('/send', async (req, res) => {
  try {
    const { name, email, message } = req.body;

    console.log('📧 Attempting to send email with:', {
      from: process.env.EMAIL_USER,
      to: email,
      user: process.env.EMAIL_USER,
      passLength: process.env.EMAIL_PASS?.length
    });

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Test with a simple email first
    const testMailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself first
      subject: 'TEST - Contact Form Working',
      text: `Test message: ${name} - ${email} - ${message}`
    };

    console.log('🔄 Sending test email...');
    const result = await transporter.sendMail(testMailOptions);
    console.log('✅ Email sent successfully! Message ID:', result.messageId);

    res.status(200).json({ 
      success: true,
      message: 'Message sent successfully! Check your email for confirmation.',
      messageId: result.messageId
    });

  } catch (error) {
    console.error('❌ Detailed email error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response
    });
    
    res.status(500).json({ 
      error: 'Failed to send message. Please try again later.',
      details: 'Email authentication failed'
    });
  }
});

module.exports = router;
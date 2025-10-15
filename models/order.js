const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    email: String
  },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    productId: {
      type: String, // Changed to String to avoid ObjectId issues
      default: null
    }
  }],
  totalAmount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'easypasa'],
    required: true
  }
}, {
  timestamps: true
});

// Generate order ID before saving - FIXED VERSION
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      console.log('🔢 Generating order ID...');
      const count = await mongoose.model('Order').countDocuments();
      console.log('📊 Current order count:', count);
      this.orderId = `ORD${String(count + 1).padStart(3, '0')}`;
      console.log('✅ Generated order ID:', this.orderId);
    } catch (error) {
      console.error('❌ Error generating order ID:', error);
      // Fallback order ID
      this.orderId = `ORD${Date.now()}`;
    }
  }
  next();
});

// Add index for better performance
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
const express = require('express');
const Order = require('../models/order');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

// CREATE ORDER - From checkout page
router.post('/', async (req, res) => {
  console.log('📦 === NEW ORDER REQUEST ===');
  console.log('📦 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { customer, items, totalAmount, paymentMethod } = req.body;
    
    // Validate required fields
    if (!customer || !customer.name || !customer.phone || !customer.address) {
      console.log('❌ Missing customer fields');
      return res.status(400).json({ 
        success: false,
        message: 'Customer name, phone, and address are required' 
      });
    }
    
    if (!items || items.length === 0) {
      console.log('❌ No items in order');
      return res.status(400).json({ 
        success: false,
        message: 'Order must have at least one item' 
      });
    }

    if (!totalAmount || totalAmount <= 0) {
      console.log('❌ Invalid total amount:', totalAmount);
      return res.status(400).json({ 
        success: false,
        message: 'Valid total amount is required' 
      });
    }

    console.log('✅ All validation passed');
    
    // MANUALLY GENERATE ORDER ID (GUARANTEED TO WORK)
    let orderId;
    try {
      const orderCount = await Order.countDocuments();
      orderId = `ORD${String(orderCount + 1).padStart(3, '0')}`;
      console.log('🔢 Manually generated order ID:', orderId);
    } catch (countError) {
      console.error('❌ Error counting orders, using timestamp ID:', countError);
      orderId = `ORD${Date.now()}`;
    }

    console.log('💾 Creating new order document...');

    // Create order with MANUALLY GENERATED orderId
    const orderData = {
      orderId: orderId, // ← THIS IS THE KEY FIX
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        email: customer.email ? customer.email.trim() : ''
      },
      items: items.map(item => ({
        name: item.name || 'Unknown Product',
        price: Number(item.price) || 0,
        quantity: Number(item.quantity) || 1,
        productId: item.productId || item._id || null
      })),
      totalAmount: Number(totalAmount),
      paymentMethod: paymentMethod || 'cash',
      status: 'pending'
    };

    console.log('📝 Order data prepared with ID:', orderId);

    const order = new Order(orderData);
    console.log('📦 Order instance created with ID:', order.orderId);

    // Save order to database
    console.log('💾 Saving order to database...');
    const savedOrder = await order.save();
    console.log('✅ ORDER SAVED SUCCESSFULLY!');
    console.log('📋 Saved order details:', {
      orderId: savedOrder.orderId,
      _id: savedOrder._id,
      customer: savedOrder.customer.name,
      total: savedOrder.totalAmount,
      items: savedOrder.items.length
    });

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      order: savedOrder
    });

  } catch (error) {
    console.error('❌ ORDER CREATION FAILED:', error);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);
    
    // Handle specific MongoDB errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }
    
    if (error.code === 11000) {
      // If duplicate order ID, generate a new one and retry
      console.log('🔄 Duplicate order ID detected, generating new one...');
      try {
        const orderCount = await Order.countDocuments();
        const newOrderId = `ORD${String(orderCount + 100).padStart(3, '0')}`; // Add 100 to avoid conflicts
        
        // Retry with new order ID
        req.body.manualOrderId = newOrderId;
        return router.post(req, res); // Recursive retry
      } catch (retryError) {
        return res.status(500).json({
          success: false,
          message: 'Duplicate order ID and retry failed',
          error: retryError.message
        });
      }
    }

    res.status(500).json({ 
      success: false,
      message: 'Failed to create order', 
      error: error.message,
      errorType: error.name
    });
  }
});

// GET ALL ORDERS - For admin dashboard
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    console.log('📊 Fetching orders...');
    const { status } = req.query;
    const filter = status && status !== 'all' ? { status } : {};
    
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    console.log(`📊 Found ${orders.length} orders`);
    
    res.json(orders);
  } catch (error) {
    console.error('❌ Error fetching orders:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET ORDER STATS - For admin dashboard
router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    console.log('📈 Fetching order statistics...');
    
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const completedOrders = await Order.countDocuments({ status: 'completed' });
    
    // Today's orders
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaysOrders = await Order.countDocuments({
      createdAt: { $gte: today }
    });
    
    // Total revenue from completed orders
    const revenueResult = await Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    console.log('📈 Stats calculated:', {
      totalOrders,
      pendingOrders,
      completedOrders,
      todaysOrders,
      totalRevenue
    });

    res.json({
      totalOrders,
      pendingOrders,
      completedOrders,
      todaysOrders,
      totalRevenue
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// UPDATE ORDER STATUS
router.patch('/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log(`🔄 Updating order ${id} status to: ${status}`);

    if (!['pending', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!order) {
      console.log(`❌ Order not found: ${id}`);
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log(`✅ Order status updated: ${order.orderId} -> ${status}`);
    res.json(order);
  } catch (error) {
    console.error('❌ Error updating order status:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// GET SINGLE ORDER BY ID
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('❌ Error fetching order:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
});

// TEST ENDPOINT - To check if orders route is working
router.get('/test/connection', async (req, res) => {
  try {
    console.log('🧪 Testing orders endpoint connection...');
    
    // Test database connection
    const dbState = mongoose.connection.readyState;
    const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    // Test Order model
    const orderCount = await Order.countDocuments();
    const sampleOrders = await Order.find().limit(3).select('orderId customer.name status');
    
    res.json({
      success: true,
      message: 'Orders endpoint is working correctly',
      database: {
        state: dbStates[dbState],
        readyState: dbState
      },
      orders: {
        totalCount: orderCount,
        sample: sampleOrders
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Orders test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Orders test failed',
      error: error.message
    });
  }
});

// HEALTH CHECK ENDPOINT
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Orders API is healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

module.exports = router;
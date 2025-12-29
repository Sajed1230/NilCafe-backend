const express = require('express');
const router = express.Router();
const Order = require('../schemas/Orders');
const User = require('../schemas/Users');
const Product = require('../schemas/Product');

// Test endpoint to verify Orders schema is working
router.get('/test', async (req, res) => {
  try {
    // Check if Order model is properly loaded
    const orderCount = await Order.countDocuments();
    res.status(200).json({
      success: true,
      message: 'Orders schema is working correctly',
      collectionName: Order.collection.name,
      totalOrders: orderCount,
      schema: {
        customerId: 'ObjectId (ref: User)',
        items: 'Array of { productId, name, price, quantity }',
        totalPrice: 'Number',
        status: 'Enum: pending, preparing, ready, on-the-way, delivered, cancelled',
        orderType: 'Enum: delivery, restaurant',
        deliveryAddress: 'String (optional)',
        tableNumber: 'Number (optional)',
        email: 'String (required)',
        paymentStatus: 'Enum: unpaid, paid',
        timestamps: 'createdAt, updatedAt'
      }
    });
  } catch (error) {
    console.error('Test orders endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing orders schema',
      error: error.message
    });
  }
});

// Create a new order (when user completes checkout)
router.post('/create', async (req, res) => {
  try {
    const { customerId, items, totalPrice, orderType, deliveryAddress, tableNumber, email, doorPhoto } = req.body;

    console.log('Received order creation request:', {
      customerId,
      itemsCount: items?.length,
      totalPrice,
      orderType
    });

    // Validate required fields
    if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID and items are required'
      });
    }

    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid total price is required'
      });
    }

    if (!orderType || !['delivery', 'restaurant'].includes(orderType)) {
      return res.status(400).json({
        success: false,
        message: 'Order type must be either "delivery" or "restaurant"'
      });
    }

    // Validate email
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Basic email validation
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate delivery address for delivery orders
    if (orderType === 'delivery' && !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: 'Delivery address is required for delivery orders'
      });
    }

    // Validate table number for restaurant orders
    if (orderType === 'restaurant' && !tableNumber) {
      return res.status(400).json({
        success: false,
        message: 'Table number is required for restaurant orders'
      });
    }

    // Verify customer exists
    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify all products exist
    for (const item of items) {
      const productId = item.productId || item.id;
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.name || productId} not found`
        });
      }
    }

    // Create order
    const newOrder = new Order({
      customerId,
      items: items.map(item => ({
        productId: item.productId || item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity
      })),
      totalPrice,
      orderType,
      deliveryAddress: orderType === 'delivery' ? deliveryAddress : null,
      tableNumber: orderType === 'restaurant' ? tableNumber : null,
      email: email || customer.email,
      doorPhoto: doorPhoto || null, // Store door photo (base64 encoded)
      status: 'pending',
      paymentStatus: 'paid'
    });

    console.log('Saving order to database...');
    await newOrder.save();
    console.log('Order saved successfully with ID:', newOrder._id);

    // Populate order with customer and product details
    const populatedOrder = await Order.findById(newOrder._id)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name price image category');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      order: populatedOrder
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during order creation',
      error: error.message
    });
  }
});

// Get all orders for a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const orders = await Order.find({ customerId })
      .populate('items.productId', 'name price image category')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders',
      error: error.message
    });
  }
});

// Get all orders (for admin/staff)
router.get('/all', async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name price image category')
      .populate('preparedBy', 'name email')
      .populate('deliveryPersonId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching orders',
      error: error.message
    });
  }
});

// Get single order by ID
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if this is the test endpoint
    if (orderId === 'test') {
      return; // Already handled above
    }

    const order = await Order.findById(orderId)
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name price image category')
      .populate('preparedBy', 'name email')
      .populate('deliveryPersonId', 'name email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching order',
      error: error.message
    });
  }
});

// Update order status
router.put('/:orderId/status', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, preparedBy, deliveryPersonId } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'on-the-way', 'delivered', 'cancelled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateData = { status };
    if (preparedBy) updateData.preparedBy = preparedBy;
    if (deliveryPersonId) updateData.deliveryPersonId = deliveryPersonId;

    const order = await Order.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true }
    )
      .populate('customerId', 'name email phone')
      .populate('items.productId', 'name price image category');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating order status',
      error: error.message
    });
  }
});

module.exports = router;

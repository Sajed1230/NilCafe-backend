const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Cart = require('../schemas/Cart');
const User = require('../schemas/Users');
const Product = require('../schemas/Product');

// Save/Update cart for a customer
router.post('/save', async (req, res) => {
  try {
    const { customerId, items } = req.body;

    console.log('=== CART SAVE REQUEST ===');
    console.log('Customer ID:', customerId);
    console.log('Items received:', items?.length || 0);
    console.log('Items data:', JSON.stringify(items, null, 2));

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message: 'Customer ID is required'
      });
    }

    // Convert customerId to ObjectId first
    let customerObjectId;
    try {
      customerObjectId = mongoose.Types.ObjectId.isValid(customerId)
        ? new mongoose.Types.ObjectId(customerId)
        : customerId;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid customer ID format: ${customerId}`
      });
    }

    // Verify customer exists
    const customer = await User.findById(customerObjectId);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Validate items
    if (!Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items must be an array'
      });
    }

    // Allow empty cart (to clear it)
    if (items.length === 0) {
      // If items is empty, just delete the cart
      await Cart.findOneAndDelete({ customerId: customerObjectId });
      
      return res.status(200).json({
        success: true,
        message: 'Cart cleared successfully',
        cart: {
          customerId: customerObjectId,
          items: []
        }
      });
    }

    // Verify all products exist and format items for database
    const formattedItems = [];
    for (const item of items) {
      const productId = item.productId || item.id;
      
      console.log(`Processing item: ${item.name || 'Unknown'}, productId: ${productId}`);
      
      // Convert to ObjectId if it's a string
      let productObjectId;
      try {
        if (!productId) {
          console.error('Product ID is missing for item:', item);
          return res.status(400).json({
            success: false,
            message: `Product ID is missing for item: ${item.name || 'Unknown'}`
          });
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
          console.error('Invalid productId format:', productId, 'Type:', typeof productId);
          return res.status(400).json({
            success: false,
            message: `Invalid product ID format: ${productId}`
          });
        }

        productObjectId = new mongoose.Types.ObjectId(productId);
        console.log(`Converted productId to ObjectId: ${productObjectId}`);
      } catch (error) {
        console.error('Error converting productId to ObjectId:', error);
        return res.status(400).json({
          success: false,
          message: `Invalid product ID format: ${productId}`,
          error: error.message
        });
      }

      // Verify product exists
      try {
        const product = await Product.findById(productObjectId);
        if (!product) {
          console.error(`Product not found in database: ${productObjectId}`);
          // Instead of returning error, skip this item and continue
          // This allows cart to save even if one product is missing
          console.warn(`Skipping product ${item.name || productId} - not found in database`);
          continue;
        }
        console.log(`Product found: ${product.name}`);

        // Format item for database - ensure all required fields are present
        const formattedItem = {
          productId: productObjectId,
          name: item.name || product.name || 'Unknown Product',
          price: item.price !== undefined && item.price !== null ? Number(item.price) : Number(product.price) || 0,
          quantity: item.quantity && item.quantity > 0 ? Number(item.quantity) : 1,
          image: item.image || product.image || '',
          description: item.description || product.description || '',
          category: item.category || product.category || ''
        };

        // Validate required fields
        if (!formattedItem.name || !formattedItem.productId || formattedItem.price === undefined || formattedItem.price === null) {
          console.error('Invalid item data:', formattedItem);
          continue; // Skip invalid items
        }

        formattedItems.push(formattedItem);
      } catch (error) {
        console.error('Error finding product:', error);
        // Skip this item and continue with others
        console.warn(`Skipping product ${item.name || productId} due to error: ${error.message}`);
        continue;
      }
    }

    console.log(`Formatted ${formattedItems.length} items for database`);

    // If no valid items after processing, return error
    if (formattedItems.length === 0) {
      console.error('No valid items to save in cart');
      return res.status(400).json({
        success: false,
        message: 'No valid items found to save in cart. Please check that all products exist in the database.'
      });
    }

    // Find existing cart or create new one (customerObjectId already set above)
    console.log('Looking for existing cart for customer:', customerObjectId);
    let cart = await Cart.findOne({ customerId: customerObjectId });
    
    if (cart) {
      console.log('Found existing cart, updating...');
      // Update existing cart
      cart.items = formattedItems;
      await cart.save();
      console.log('Cart updated successfully');
    } else {
      console.log('No existing cart found, creating new one...');
      // Create new cart
      try {
        cart = new Cart({
          customerId: customerObjectId,
          items: formattedItems
        });
        await cart.save();
        console.log('New cart created successfully with ID:', cart._id);
      } catch (saveError) {
        console.error('Error creating cart:', saveError);
        // If unique constraint error, try to find and update instead
        if (saveError.code === 11000) {
          console.log('Unique constraint error, trying to find and update...');
          cart = await Cart.findOne({ customerId: customerObjectId });
          if (cart) {
            cart.items = formattedItems;
            await cart.save();
            console.log('Cart updated after unique constraint error');
          } else {
            throw saveError;
          }
        } else {
          throw saveError;
        }
      }
    }

    // Populate product details
    console.log('Populating cart with product details...');
    const populatedCart = await Cart.findById(cart._id)
      .populate('items.productId', 'name price image category isAvailable');

    console.log('Cart saved successfully!');
    res.status(200).json({
      success: true,
      message: 'Cart saved successfully',
      cart: populatedCart
    });
  } catch (error) {
    console.error('=== SAVE CART ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error saving cart',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get cart for a customer
router.get('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Convert customerId to ObjectId
    let customerObjectId;
    try {
      customerObjectId = mongoose.Types.ObjectId.isValid(customerId)
        ? new mongoose.Types.ObjectId(customerId)
        : customerId;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid customer ID format: ${customerId}`
      });
    }

    const cart = await Cart.findOne({ customerId: customerObjectId })
      .populate('items.productId', 'name price image category isAvailable');

    if (!cart) {
      // Return empty cart if none exists
      return res.status(200).json({
        success: true,
        cart: {
          customerId,
          items: [],
          updatedAt: new Date()
        }
      });
    }

    res.status(200).json({
      success: true,
      cart: cart
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching cart',
      error: error.message
    });
  }
});

// Clear cart for a customer
router.delete('/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    // Convert customerId to ObjectId
    let customerObjectId;
    try {
      customerObjectId = mongoose.Types.ObjectId.isValid(customerId)
        ? new mongoose.Types.ObjectId(customerId)
        : customerId;
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Invalid customer ID format: ${customerId}`
      });
    }

    const cart = await Cart.findOneAndDelete({ customerId: customerObjectId });

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully'
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error clearing cart',
      error: error.message
    });
  }
});

module.exports = router;


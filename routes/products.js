const express = require('express');
const router = express.Router();
const multer = require('multer');
const Product = require('../schemas/Product');

// Configure multer for memory storage (we'll convert to base64)
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// API - Get all products (for frontend)
router.get('/api', async (req, res) => {
  try {
    const categoryFilter = req.query.category;
    const queryFilter = {}; // Show all products (available and unavailable)
    
    if (categoryFilter && categoryFilter !== 'all') {
      const validCategories = ['Coffee', 'Tea', 'Juices', 'Snacks', 'Desserts'];
      if (validCategories.includes(categoryFilter)) {
        queryFilter.category = categoryFilter;
      }
    }
    
    const products = await Product.find(queryFilter)
      .select('name description price category image isAvailable')
      .sort({ createdAt: -1 })
      .lean();
    
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching products API:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
});

// API - Get single product image (for lazy loading)
router.get('/api/image/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).select('image').lean();
    if (!product || !product.image) {
      return res.status(404).json({ success: false, message: 'Image not found' });
    }
    res.json({ success: true, image: product.image });
  } catch (error) {
    console.error('Error fetching product image:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch image', error: error.message });
  }
});

// GET - Render the add product form page
router.get('/add', (req, res) => {
  res.render('add-product', { 
    title: 'Add New Product',
    message: null,
    error: null
  });
});

// Helper function to compress and convert image to base64
const compressImage = (buffer, maxWidth = 800, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    // For now, we'll just convert to base64
    // In production, you might want to use sharp or jimp for actual compression
    const base64 = buffer.toString('base64');
    const mimeType = 'image/jpeg'; // Default, or detect from buffer
    const dataUrl = `data:${mimeType};base64,${base64}`;
    resolve(dataUrl);
  });
};

// POST - Handle product creation with file upload
router.post('/add', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, isAvailable } = req.body;

    // Debug: Log received data
    console.log('Received form data:', { name, description, price, category, isAvailable });
    console.log('Request body:', req.body);

    // Validate required fields with specific error messages
    if (!name || name.trim() === '') {
      return res.render('add-product', {
        title: 'Add New Product',
        message: null,
        error: 'Product name is required'
      });
    }

    if (!price || price.trim() === '') {
      return res.render('add-product', {
        title: 'Add New Product',
        message: null,
        error: 'Price is required'
      });
    }

    if (!category || category.trim() === '') {
      return res.render('add-product', {
        title: 'Add New Product',
        message: null,
        error: 'Product type (category) is required. Please select Coffee, Tea, Juices, Snacks, or Desserts'
      });
    }

    // Validate category
    const validCategories = ['Coffee', 'Tea', 'Juices', 'Snacks', 'Desserts'];
    if (!validCategories.includes(category)) {
      return res.render('add-product', {
        title: 'Add New Product',
        message: null,
        error: 'Invalid category. Please select a valid product type.'
      });
    }

    // Validate price is a number
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.render('add-product', {
        title: 'Add New Product',
        message: null,
        error: 'Price must be a valid positive number'
      });
    }

    // Handle image upload
    let imageBase64 = '';
    if (req.file) {
      try {
        imageBase64 = await compressImage(req.file.buffer);
      } catch (imgError) {
        console.error('Image processing error:', imgError);
        return res.render('add-product', {
          title: 'Add New Product',
          message: null,
          error: 'Failed to process image. Please try again.'
        });
      }
    } else if (req.body.image) {
      // If image was provided as base64 string (from text input)
      imageBase64 = req.body.image;
    }

    // Create new product
    const newProduct = new Product({
      name,
      description: description || '',
      price: priceNum,
      category: category,
      image: imageBase64,
      isAvailable: isAvailable === 'true' || isAvailable === true
    });

    await newProduct.save();

    res.render('add-product', {
      title: 'Add New Product',
      message: `Product "${name}" has been added successfully!`,
      error: null
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.render('add-product', {
      title: 'Add New Product',
      message: null,
      error: error.message || 'Failed to create product. Please try again.'
    });
  }
});

// GET - View all products
router.get('/list', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Get category filter from query parameter
    const categoryFilter = req.query.category;
    
    // Build query filter
    const queryFilter = {};
    if (categoryFilter && categoryFilter !== 'all') {
      // Validate category
      const validCategories = ['Coffee', 'Tea', 'Juices', 'Snacks', 'Desserts'];
      if (validCategories.includes(categoryFilter)) {
        queryFilter.category = categoryFilter;
      }
    }
    
    // Limit to 50 products max for better performance
    const limit = 50;
    
    // Fetch products with images - limit to 30 for better performance with images
    const optimizedLimit = 30;
    const products = await Product.find(queryFilter)
      .select('name description price category image isAvailable createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(optimizedLimit)
      .lean(); // Use lean() for faster queries

    // Include images but they'll load lazily in the browser
    const productsWithImages = products.map(product => ({
      ...product,
      hasImage: !!(product.image && product.image.length > 0)
    }));

    const queryTime = Date.now() - startTime;
    console.log(`Fetched ${products.length} products in ${queryTime}ms${categoryFilter ? ` (filtered by: ${categoryFilter})` : ''} - Images excluded for performance`);

    // Get category counts for filter UI (optimized - no image data)
    const categoryCounts = await Product.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    res.render('products-list', {
      title: categoryFilter && categoryFilter !== 'all' ? `${categoryFilter} Products` : 'All Products',
      products: productsWithImages,
      message: req.query.message || null,
      totalProducts: products.length,
      currentCategory: categoryFilter || 'all',
      categoryCounts: categoryCounts
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.render('products-list', {
      title: 'All Products',
      products: [],
      error: 'Failed to load products',
      currentCategory: 'all',
      categoryCounts: []
    });
  }
});

// GET - Edit product form
router.get('/edit/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.redirect('/products/list?message=Product not found');
    }
    res.render('edit-product', {
      title: 'Edit Product',
      product: product,
      message: null,
      error: null
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.redirect('/products/list?message=Error loading product');
  }
});

// POST - Update product
router.post('/edit/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, isAvailable } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.render('edit-product', {
        title: 'Edit Product',
        product: null,
        message: null,
        error: 'Product not found'
      });
    }

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.render('edit-product', {
        title: 'Edit Product',
        product: product,
        message: null,
        error: 'Product name is required'
      });
    }

    if (!price || price.trim() === '') {
      return res.render('edit-product', {
        title: 'Edit Product',
        product: product,
        message: null,
        error: 'Price is required'
      });
    }

    if (!category || category.trim() === '') {
      return res.render('edit-product', {
        title: 'Edit Product',
        product: product,
        message: null,
        error: 'Product type (category) is required'
      });
    }

    // Validate category
    const validCategories = ['Coffee', 'Tea', 'Juices', 'Snacks', 'Desserts'];
    if (!validCategories.includes(category)) {
      return res.render('edit-product', {
        title: 'Edit Product',
        product: product,
        message: null,
        error: 'Invalid category. Please select a valid product type.'
      });
    }

    // Validate price
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.render('edit-product', {
        title: 'Edit Product',
        product: product,
        message: null,
        error: 'Price must be a valid positive number'
      });
    }

    // Handle image upload
    let imageBase64 = product.image; // Keep existing image by default
    if (req.file) {
      try {
        imageBase64 = await compressImage(req.file.buffer);
      } catch (imgError) {
        console.error('Image processing error:', imgError);
        return res.render('edit-product', {
          title: 'Edit Product',
          product: product,
          message: null,
          error: 'Failed to process image. Please try again.'
        });
      }
    } else if (req.body.image && req.body.image.trim() !== '') {
      imageBase64 = req.body.image;
    }

    // Update product
    product.name = name;
    product.description = description || '';
    product.price = priceNum;
    product.category = category;
    product.image = imageBase64;
    product.isAvailable = isAvailable === 'true' || isAvailable === true;

    await product.save();

    res.redirect('/products/list?message=Product updated successfully');
  } catch (error) {
    console.error('Error updating product:', error);
    res.render('edit-product', {
      title: 'Edit Product',
      product: req.body,
      message: null,
      error: error.message || 'Failed to update product. Please try again.'
    });
  }
});

// DELETE - Delete product
router.post('/delete/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.redirect('/products/list?message=Product not found');
    }
    res.redirect('/products/list?message=Product deleted successfully');
  } catch (error) {
    console.error('Error deleting product:', error);
    res.redirect('/products/list?message=Error deleting product');
  }
});

// API - Toggle product availability
router.put('/api/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    if (typeof isAvailable !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAvailable must be a boolean value'
      });
    }

    const product = await Product.findByIdAndUpdate(
      id,
      { isAvailable },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: `Product ${isAvailable ? 'enabled' : 'disabled'} successfully`,
      product: {
        _id: product._id,
        name: product.name,
        isAvailable: product.isAvailable
      }
    });
  } catch (error) {
    console.error('Error updating product availability:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating product availability',
      error: error.message
    });
  }
});

// API - Get all products (for admin - includes unavailable)
router.get('/api/all', async (req, res) => {
  try {
    const products = await Product.find({})
      .select('_id name description price category image isAvailable')
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Fetched ${products.length} products for admin dashboard`);
    res.json({ success: true, products });
  } catch (error) {
    console.error('Error fetching all products:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products', error: error.message });
  }
});

module.exports = router;


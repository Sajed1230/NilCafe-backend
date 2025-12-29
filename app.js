const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const cartRoutes = require('./routes/cart');
const receiptRoutes = require('./routes/receipts');

// Security middleware
const { sanitizeBody, sanitizeQueryParams } = require('./middleware/validation');
const { apiRateLimiter, authRateLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Security: CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000']; // Default development origins

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Security: Rate limiting
app.use('/api/auth', authRateLimiter); // Stricter rate limit for auth endpoints
app.use('/api', apiRateLimiter); // Standard rate limit for API endpoints

// Security: Body parsing with limits (must be before sanitization)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Trust proxy for accurate IP addresses (if behind reverse proxy)
app.set('trust proxy', 1);

// Security: Input sanitization
app.use(sanitizeBody);
app.use(sanitizeQueryParams);

// Security: Helmet-like headers (basic)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/receipts', receiptRoutes);

app.get('/', (req, res) => {
  res.send("Hello, this is the backend for Nile Cafe");
});

// Start server
const startServer = async () => {
  const dbConnection = await connectDB();
  
  if (!dbConnection.success) {
    console.error('Failed to connect to MongoDB. Server not started.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ MongoDB Connected: ${dbConnection.host}`);
    console.log(`✅ Database: ${dbConnection.database}`);
    console.log('='.repeat(50));
  });
};

startServer();

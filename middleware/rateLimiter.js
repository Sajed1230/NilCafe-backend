// Rate Limiting Middleware

/**
 * Simple in-memory rate limiter
 * For production, use redis-based rate limiter (express-rate-limit with Redis)
 */

const rateLimitStore = new Map()

/**
 * Clear old entries periodically
 */
setInterval(() => {
  const now = Date.now()
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

/**
 * Rate limiter middleware
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests per window
 */
const rateLimiter = (windowMs = 60000, maxRequests = 100) => {
  return (req, res, next) => {
    // Get client identifier (IP address)
    const clientId = req.ip || 
                     req.headers['x-forwarded-for']?.split(',')[0] || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress ||
                     'unknown'
    
    const now = Date.now()
    const key = `${clientId}:${req.path}`
    const record = rateLimitStore.get(key)
    
    if (!record || now > record.resetTime) {
      // Create new record
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs
      })
      return next()
    }
    
    // Increment count
    record.count++
    
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      })
    }
    
    next()
  }
}

/**
 * Strict rate limiter for authentication endpoints
 */
const authRateLimiter = rateLimiter(15 * 60 * 1000, 5) // 5 requests per 15 minutes

/**
 * Standard API rate limiter
 */
const apiRateLimiter = rateLimiter(60000, 100) // 100 requests per minute

module.exports = {
  rateLimiter,
  authRateLimiter,
  apiRateLimiter
}

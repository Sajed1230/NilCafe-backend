// Authentication and Authorization Middleware

/**
 * Middleware to verify user authentication
 * Currently checks for user in request (can be extended with JWT/sessions)
 */
const authenticate = (req, res, next) => {
  // In a real application, you would verify JWT token or session
  // For now, this is a placeholder that can be extended
  
  // If using JWT:
  // const token = req.headers.authorization?.split(' ')[1]
  // if (!token) {
  //   return res.status(401).json({ success: false, message: 'Authentication required' })
  // }
  // const decoded = jwt.verify(token, process.env.JWT_SECRET)
  // req.user = decoded
  
  // For now, pass through (can be extended later)
  next()
}

/**
 * Middleware to verify user has required role(s)
 * @param {string|string[]} roles - Required role(s) (e.g., 'admin' or ['admin', 'staff'])
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // Get user from request (set by authenticate middleware or from session)
    const userRole = req.user?.role || req.body?.role || req.query?.role
    
    if (!userRole) {
      return res.status(401).json({
        success: false,
        message: 'Authorization required. Please provide user role.'
      })
    }
    
    // Check if user has required role
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      })
    }
    
    next()
  }
}

/**
 * Middleware to verify admin access
 */
const requireAdmin = authorize('admin')

/**
 * Middleware to verify staff access (admin or staff)
 */
const requireStaff = authorize('admin', 'staff')

/**
 * Middleware to verify delivery access (admin or delivery)
 */
const requireDelivery = authorize('admin', 'delivery')

module.exports = {
  authenticate,
  authorize,
  requireAdmin,
  requireStaff,
  requireDelivery
}



// Input Validation and Sanitization Middleware

/**
 * Sanitize string input to prevent XSS and injection attacks
 */
const sanitizeString = (str) => {
  if (typeof str !== 'string') return str
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .slice(0, 1000) // Limit length
}

/**
 * Validate and sanitize email
 */
const validateEmail = (email) => {
  if (!email || typeof email !== 'string') return false
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim().toLowerCase())
}

/**
 * Validate and sanitize phone number
 */
const validatePhone = (phone) => {
  if (!phone || typeof phone !== 'string') return false
  // Allow digits, spaces, dashes, and parentheses
  const phoneRegex = /^[\d\s\-()]+$/
  return phoneRegex.test(phone.trim()) && phone.replace(/\D/g, '').length >= 10
}

/**
 * Validate MongoDB ObjectId
 */
const validateObjectId = (id) => {
  if (!id || typeof id !== 'string') return false
  const objectIdRegex = /^[0-9a-fA-F]{24}$/
  return objectIdRegex.test(id)
}

/**
 * Sanitize MongoDB query to prevent NoSQL injection
 */
const sanitizeQuery = (query) => {
  if (typeof query !== 'object' || query === null) return {}
  
  const sanitized = {}
  for (const [key, value] of Object.entries(query)) {
    // Remove dangerous operators
    if (key.startsWith('$')) {
      continue // Skip MongoDB operators in keys
    }
    
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value)
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects (but skip MongoDB operators)
      const nested = sanitizeQuery(value)
      if (Object.keys(nested).length > 0) {
        sanitized[key] = nested
      }
    } else {
      sanitized[key] = value
    }
  }
  
  return sanitized
}

/**
 * Middleware to sanitize request body
 */
const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Sanitize string fields
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeString(value)
      }
    }
  }
  next()
}

/**
 * Middleware to sanitize request query parameters
 */
const sanitizeQueryParams = (req, res, next) => {
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeQuery(req.query)
  }
  next()
}

/**
 * Validate required fields
 */
const validateRequired = (fields) => {
  return (req, res, next) => {
    const missing = []
    
    for (const field of fields) {
      if (!req.body[field] || (typeof req.body[field] === 'string' && !req.body[field].trim())) {
        missing.push(field)
      }
    }
    
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missing.join(', ')}`
      })
    }
    
    next()
  }
}

/**
 * Validate email format
 */
const validateEmailFormat = (req, res, next) => {
  if (req.body.email && !validateEmail(req.body.email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    })
  }
  next()
}

/**
 * Validate phone format
 */
const validatePhoneFormat = (req, res, next) => {
  if (req.body.phone && !validatePhone(req.body.phone)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid phone number format'
    })
  }
  next()
}

/**
 * Validate number range
 */
const validateNumberRange = (field, min, max) => {
  return (req, res, next) => {
    const value = req.body[field]
    if (value !== undefined) {
      const num = Number(value)
      if (isNaN(num) || num < min || num > max) {
        return res.status(400).json({
          success: false,
          message: `${field} must be a number between ${min} and ${max}`
        })
      }
    }
    next()
  }
}

/**
 * Validate enum values
 */
const validateEnum = (field, allowedValues) => {
  return (req, res, next) => {
    const value = req.body[field]
    if (value !== undefined && !allowedValues.includes(value)) {
      return res.status(400).json({
        success: false,
        message: `${field} must be one of: ${allowedValues.join(', ')}`
      })
    }
    next()
  }
}

/**
 * Validate MongoDB ObjectId in params
 */
const validateObjectIdParam = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName]
    if (!validateObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      })
    }
    next()
  }
}

module.exports = {
  sanitizeString,
  validateEmail,
  validatePhone,
  validateObjectId,
  sanitizeQuery,
  sanitizeBody,
  sanitizeQueryParams,
  validateRequired,
  validateEmailFormat,
  validatePhoneFormat,
  validateNumberRange,
  validateEnum,
  validateObjectIdParam
}



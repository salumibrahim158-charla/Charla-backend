// Admin Middleware - Protects admin-only routes
const adminMiddleware = (req, res, next) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'Please login to access this resource' 
    });
  }

  // Check if user is administrator
  if (req.user.category !== 'administrator') {
    return res.status(403).json({ 
      error: 'Admin access required',
      message: 'This resource requires administrator privileges' 
    });
  }

  // User is admin - allow access
  next();
};

module.exports = adminMiddleware;

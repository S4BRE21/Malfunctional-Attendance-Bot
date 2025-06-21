// passthrough/middleware/auth.js

// Middleware to check if the user is authenticated
export function isAuthenticated(req, res, next) {
  if (req.session?.user) {
    return next();
  }
  return res.status(401).json({ message: 'Not logged in' });
}

// Middleware to check if the user is an admin
export function isAdmin(req, res, next) {
  if (req.session.user?.is_admin) {
    return next();
  }
  return res.status(403).json({ message: 'Admin only' });
}

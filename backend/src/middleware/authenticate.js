const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    // Expose `id` comme alias de `sub` pour que les controllers puissent
    // utiliser req.user.id sans connaître la convention JWT.
    req.user = { ...payload, id: payload.sub };
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { authenticate };

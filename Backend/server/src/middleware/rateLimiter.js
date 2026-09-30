const requestCounts = new Map();

const rateLimiter = (maxRequests = 20, windowMs = 60 * 1000) => {
  return (req, res, next) => {
    const key = req.user?.id || req.ip;
    const now = Date.now();

    const entry = requestCounts.get(key) || { count: 0, windowStart: now };

    if (now - entry.windowStart > windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    entry.count += 1;
    requestCounts.set(key, entry);

    if (entry.count > maxRequests) {
      return res.status(429).json({ message: 'Too many requests, slow down.' });
    }

    next();
  };
};

module.exports = rateLimiter;
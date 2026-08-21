import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Not authenticated' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await query('SELECT id, name, email, role, is_frozen FROM users WHERE id=$1', [decoded.id]);
    if (!rows[0]) return res.status(401).json({ error: 'User not found' });
    if (rows[0].is_frozen) return res.status(403).json({ error: 'Account frozen by admin' });

    req.user = rows[0];
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

export const requireSeller = (req, res, next) => {
  if (!['seller', 'admin'].includes(req.user?.role)) return res.status(403).json({ error: 'Seller access required' });
  next();
};

export const optionalAuth = async (req, res, next) => {
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const { rows } = await query('SELECT id, name, email, role FROM users WHERE id=$1', [decoded.id]);
      if (rows[0]) req.user = rows[0];
    }
  } catch { /* silent */ }
  next();
};

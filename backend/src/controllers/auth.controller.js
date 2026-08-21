import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const setCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
};

// POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = await query('SELECT id FROM users WHERE email=$1', [email.toLowerCase()]);
    if (existing.rows[0]) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, is_verified)
       VALUES ($1, $2, $3, true) RETURNING id, name, email, role, balance, currency`,
      [name.trim(), email.toLowerCase(), password_hash]
    );

    const token = signToken(rows[0].id);
    setCookie(res, token);
    res.status(201).json({ user: rows[0], token });
  } catch (err) { next(err); }
};

// POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const { rows } = await query(
      'SELECT id, name, email, role, password_hash, is_frozen, balance, currency FROM users WHERE email=$1',
      [email.toLowerCase()]
    );
    const user = rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.is_frozen) return res.status(403).json({ error: 'Account suspended. Contact support.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user.id);
    setCookie(res, token);

    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) { next(err); }
};

// POST /api/auth/logout
export const logout = (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
};

// GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT id, name, email, role, avatar_url, balance, currency, all_time_topup, telegram_username, created_at FROM users WHERE id=$1',
      [req.user.id]
    );
    res.json({ user: rows[0] });
  } catch (err) { next(err); }
};

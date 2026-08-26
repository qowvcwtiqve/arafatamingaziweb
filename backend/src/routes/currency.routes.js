import express from 'express';
import { fetchLiveExchangeRates } from '../services/currency.service.js';

const router = express.Router();

// GET /api/currency/rates - Public endpoint returning real-time exchange rates
router.get('/rates', async (req, res) => {
  try {
    const data = await fetchLiveExchangeRates();
    res.json(data);
  } catch (err) {
    console.error('Error fetching currency rates:', err);
    res.status(500).json({ error: 'Failed to fetch currency rates' });
  }
});

export default router;

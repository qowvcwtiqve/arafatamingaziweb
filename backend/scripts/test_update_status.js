import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function run() {
  const token = jwt.sign(
    { id: 'usr-admin-001', email: 'arafatamingazi@gmail.com', role: 'admin' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1d' }
  );

  console.log('Sending PUT status request for QXD-630770 to localhost:5000...');
  try {
    const res = await fetch('http://localhost:5000/api/admin/orders/QXD-630770/status', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'Delivered',
        credentials: 'TEST-KEY-XXXX-YYYY',
        admin_notes: 'Verified live test'
      })
    });
    const data = await res.json();
    console.log('Update Response status:', res.status, data);
  } catch (err) {
    console.error('Fetch error:', err.message);
  }
}

run();

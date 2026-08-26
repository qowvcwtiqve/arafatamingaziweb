import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_DB_PATH = path.join(__dirname, '../data/local_db.json');

const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
const db = JSON.parse(raw);
console.log('Orders in local_db.json:', JSON.stringify(db.orders, null, 2));

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// MySQL Pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'u133448110_estimator',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'u133448110_roalux_est',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Seed Initial Data
async function initDB() {
  try {
    const connection = await pool.getConnection();
    
    // Create tables
    await connection.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        code VARCHAR(255),
        country VARCHAR(255),
        email VARCHAR(255),
        color VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS raw_materials (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        supplier VARCHAR(255),
        price FLOAT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR(255) PRIMARY KEY,
        code VARCHAR(255),
        name VARCHAR(255),
        cat VARCHAR(255),
        batchSize FLOAT,
        \`desc\` TEXT,
        status VARCHAR(255),
        batches JSON
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id INT AUTO_INCREMENT PRIMARY KEY,
        msg TEXT,
        color VARCHAR(255),
        time VARCHAR(255)
      )
    `);

    // Seed suppliers
    const [supplierRows] = await connection.query('SELECT COUNT(*) as count FROM suppliers');
    if (supplierRows[0].count === 0) {
      const suppliers = [
        ["s1", "Sigma-Aldrich", "SA", "Germany", "orders@sigma.com", "#3B82F6"],
        ["s2", "BASF India", "BI", "India", "india@basf.com", "#8B5CF6"],
        ["s3", "Brenntag", "BR", "Netherlands", "info@brenntag.nl", "#10B981"],
        ["s4", "Univar Solutions", "UV", "USA", "sales@univar.com", "#F59E0B"]
      ];
      await connection.query('INSERT INTO suppliers (id, name, code, country, email, color) VALUES ?', [suppliers]);
      
      const rms = [
        ["rm1", "DM Water", "s3", 2.50],
        ["rm2", "SHMP", "s1", 45.00],
        ["rm3", "PMO-ICP", "s2", 120.00],
        ["rm4", "Alphox", "s4", 85.00],
        ["rm5", "Thickner PU300", "s1", 350.00]
      ];
      await connection.query('INSERT INTO raw_materials (id, name, supplier, price) VALUES ?', [rms]);

      const batches = JSON.stringify([
        {
          id: "b1", bid: "PRO-001-T01", name: "Trial 1 — Initial Mix", size: 100, type: "formula",
          status: "testing", notes: "Check viscosity and hiding power.",
          gloss: "", viscosity: "",
          formula: [
            { rmId: "rm1", qty: 40, pct: 40 },
            { rmId: "rm2", qty: 0.5, pct: 0.5 },
            { rmId: "rm3", qty: 10, pct: 10 },
            { rmId: "rm4", qty: 2, pct: 2 },
            { rmId: "rm5", qty: 1, pct: 1 }
          ]
        }
      ]);
      const products = [
        ["p1", "PRO-001", "PRO40 White", "Paint", 1000, "Premium interior white emulsion.", "trial", batches]
      ];
      await connection.query('INSERT INTO products (id, code, name, cat, batchSize, `desc`, status, batches) VALUES ?', [products]);

      const activity = [
        ["Created initial batch PRO-001-T01 for PRO40 White", "#3B82F6", "Just now"]
      ];
      await connection.query('INSERT INTO activity (msg, color, time) VALUES ?', [activity]);
    }
    
    connection.release();
    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
}

initDB();

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    const [suppliers] = await pool.query('SELECT * FROM suppliers');
    const [rms] = await pool.query('SELECT * FROM raw_materials');
    const [productsRaw] = await pool.query('SELECT * FROM products');
    const [activity] = await pool.query('SELECT * FROM activity ORDER BY id DESC');

    const products = productsRaw.map(p => ({
      ...p,
      batches: typeof p.batches === 'string' ? JSON.parse(p.batches) : p.batches
    }));

    res.json({ suppliers, rms, products, activity });
  } catch (err) {
    console.error("Fetch Data Error:", err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.post('/api/save', async (req, res) => {
  const { products, rms, activity } = req.body;
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    if (products && products.length > 0) {
      for (const p of products) {
        const batchesJson = JSON.stringify(p.batches);
        await connection.query(`
          INSERT INTO products (id, code, name, cat, batchSize, \`desc\`, status, batches) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          code=VALUES(code), name=VALUES(name), cat=VALUES(cat), batchSize=VALUES(batchSize), 
          \`desc\`=VALUES(\`desc\`), status=VALUES(status), batches=VALUES(batches)
        `, [p.id, p.code, p.name, p.cat, p.batchSize, p.desc, p.status, batchesJson]);
      }
    }

    if (rms && rms.length > 0) {
      for (const r of rms) {
        await connection.query(`
          INSERT INTO raw_materials (id, name, supplier, price) 
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          name=VALUES(name), supplier=VALUES(supplier), price=VALUES(price)
        `, [r.id, r.name, r.supplier, r.price]);
      }
      
      const rmIds = rms.map(r => r.id);
      if (rmIds.length > 0) {
        await connection.query('DELETE FROM raw_materials WHERE id NOT IN (?)', [rmIds]);
      }
    } else if (rms && rms.length === 0) {
      await connection.query('DELETE FROM raw_materials');
    }

    if (activity && activity.length > 0) {
      await connection.query('DELETE FROM activity');
      // Fix: Activity msg could be anything, so we use multiple inserts or batch insert
      const actValues = activity.map(a => [a.msg, a.color, a.time]);
      await connection.query('INSERT INTO activity (msg, color, time) VALUES ?', [actValues]);
    }

    await connection.commit();
    connection.release();
    res.json({ success: true });
  } catch (err) {
    console.error("Save Data Error:", err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// The "catchall" handler
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend API running on port ${port}`);
});

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const rateLimit = require('express-rate-limit');

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 3001;

// Custom security headers (Helmet alternative)
app.use((req, res, next) => {
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    res.setHeader('X-Download-Options', 'noopen');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '0');
    next();
});

app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '50kb' })); // protect against large payloads

// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests from this IP.' }
});
app.use('/api', apiLimiter);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

// MySQL Pool configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
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

const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');


const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
let currentOTP = null;
let otpExpires = 0;
let otpAttempts = 0;

const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 5, // 5 requests per IP
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes.' }
});

const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many verification attempts from this IP, please try again later.' }
});

// Auth Middleware
const authMiddleware = (req, res, next) => {
  if (req.path === '/request-otp' || req.path === '/verify-otp') return next();
  
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token format' });
  }
  
  const token = authHeader.split(' ')[1];
  if (!token || token.length > 500) {
    return res.status(401).json({ error: 'Unauthorized: Token exceeds length limits' });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

app.use('/api', authMiddleware);

app.post('/api/request-otp', otpRequestLimiter, async (req, res) => {
  try {
    currentOTP = Math.floor(100000 + Math.random() * 900000).toString();
    otpExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    otpAttempts = 0;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_EMAIL_APP_PASSWORD;

    if (!adminEmail || !adminPass) {
      console.warn("⚠️ SMTP Credentials missing! OTP is:", currentOTP);
      return res.json({ success: true, message: "Email not configured. Check server logs for OTP." });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: adminEmail, pass: adminPass }
    });

    await transporter.sendMail({
      from: `"Roalux Estimator" <${adminEmail}>`,
      to: adminEmail,
      subject: "Admin Login OTP",
      html: `<h2>Roalux Security Alert</h2>
             <p>Someone is trying to access the Roalux Estimator application.</p>
             <p>Your one-time password is: <b style="font-size:24px; color:#3B82F6;">${currentOTP}</b></p>
             <p>This code expires in 5 minutes.</p>`
    });

    res.json({ success: true });
  } catch (err) {
    console.error("OTP send error:", err);
    res.status(500).json({ error: "Failed to send OTP email" });
  }
});

app.post('/api/verify-otp', otpVerifyLimiter, (req, res) => {
  const { otp } = req.body;
  
  // Strict Validation: Ensure OTP is exactly a 6-digit string
  if (!otp || typeof otp !== 'string' || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ error: "Invalid OTP format. Must be a 6-digit number." });
  }

  if (!currentOTP || Date.now() > otpExpires) {
    return res.status(400).json({ error: "OTP expired or not requested" });
  }
  
  if (otp === currentOTP) {
    currentOTP = null; // Invalidate
    otpAttempts = 0;
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '30d' });
    return res.json({ success: true, token });
  }
  
  otpAttempts++;
  if (otpAttempts >= 5) {
    currentOTP = null;
    return res.status(400).json({ error: "Too many failed attempts. OTP invalidated." });
  }
  
  res.status(400).json({ error: "Invalid OTP" });
});

// API Routes
app.get('/api/data', async (req, res) => {
  try {
    const [suppliers] = await pool.query('SELECT * FROM suppliers');
    const [rms] = await pool.query('SELECT * FROM raw_materials');
    const [productsRaw] = await pool.query('SELECT * FROM products');
    const [activity] = await pool.query('SELECT * FROM activity ORDER BY id DESC');

    const cleanStr = (str) => {
      if (typeof str !== 'string') return str;
      let clean = str;
      while (clean.includes('&amp;')) clean = clean.replace(/&amp;/g, '&');
      return clean.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    };

    const cleanObj = (obj) => {
      const newObj = { ...obj };
      for (const key in newObj) {
        if (typeof newObj[key] === 'string') {
          newObj[key] = cleanStr(newObj[key]);
        }
      }
      return newObj;
    };

    const cleanSuppliers = suppliers.map(cleanObj);
    const cleanRms = rms.map(cleanObj);

    const products = productsRaw.map(p => {
      let parsed = [];
      try {
        parsed = typeof p.batches === 'string' ? JSON.parse(p.batches) : p.batches;
      } catch (e) {}
      return {
        ...cleanObj(p),
        batches: Array.isArray(parsed) ? parsed : []
      };
    });

    res.json({ suppliers: cleanSuppliers, rms: cleanRms, products, activity });
  } catch (err) {
    console.error("Fetch Data Error:", err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Input sanitization helper (Protects against XSS)
const sanitizeStr = (val) => {
  if (typeof val !== 'string') return '';
  let clean = val.trim();
  // Decode any previously double-encoded HTML entities to fix corrupted data (e.g. SOMU &amp;amp; CO -> SOMU & CO)
  while (clean.includes('&amp;')) {
    clean = clean.replace(/&amp;/g, '&');
  }
  clean = clean.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
  return clean;
};

app.post('/api/save', async (req, res) => {
  const { products, rms, activity } = req.body;
  
  // Strict Type Enforcement
  if (products !== undefined && !Array.isArray(products)) return res.status(400).json({ error: "Invalid payload: products must be an array" });
  if (rms !== undefined && !Array.isArray(rms)) return res.status(400).json({ error: "Invalid payload: rms must be an array" });
  if (activity !== undefined && !Array.isArray(activity)) return res.status(400).json({ error: "Invalid payload: activity must be an array" });

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    if (products && products.length > 0) {
      for (const p of products) {
        if (!p.id || typeof p.id !== 'string') continue;
        const batchesJson = JSON.stringify(p.batches || []);
        await connection.query(`
          INSERT INTO products (id, code, name, cat, batchSize, \`desc\`, status, batches) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          code=VALUES(code), name=VALUES(name), cat=VALUES(cat), batchSize=VALUES(batchSize), 
          \`desc\`=VALUES(\`desc\`), status=VALUES(status), batches=VALUES(batches)
        `, [
          sanitizeStr(p.id), sanitizeStr(p.code), sanitizeStr(p.name), sanitizeStr(p.cat), 
          Number(p.batchSize) || 0, sanitizeStr(p.desc), sanitizeStr(p.status), batchesJson
        ]);
      }
      
      const pIds = products.map(p => String(p.id));
      if (pIds.length > 0) {
        await connection.query('DELETE FROM products WHERE id NOT IN (?)', [pIds]);
      }
    } else if (products && products.length === 0) {
      await connection.query('DELETE FROM products');
    }

    if (rms && rms.length > 0) {
      for (const r of rms) {
        if (!r.id || typeof r.id !== 'string') continue;
        await connection.query(`
          INSERT INTO raw_materials (id, name, supplier, price) 
          VALUES (?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
          name=VALUES(name), supplier=VALUES(supplier), price=VALUES(price)
        `, [sanitizeStr(r.id), sanitizeStr(r.name), sanitizeStr(r.supplier), Number(r.price) || 0]);
      }
      
      const rmIds = rms.map(r => String(r.id));
      if (rmIds.length > 0) {
        await connection.query('DELETE FROM raw_materials WHERE id NOT IN (?)', [rmIds]);
      }
    } else if (rms && rms.length === 0) {
      await connection.query('DELETE FROM raw_materials');
    }

    if (activity && activity.length > 0) {
      await connection.query('DELETE FROM activity');
      const actValues = activity
        .filter(a => a.msg && typeof a.msg === 'string')
        .map(a => [sanitizeStr(a.msg), sanitizeStr(a.color), sanitizeStr(a.time)]);
        
      if (actValues.length > 0) {
        await connection.query('INSERT INTO activity (msg, color, time) VALUES ?', [actValues]);
      }
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

import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const db = new Database('database.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT,
    code TEXT,
    country TEXT,
    email TEXT,
    color TEXT
  );
  
  CREATE TABLE IF NOT EXISTS raw_materials (
    id TEXT PRIMARY KEY,
    name TEXT,
    supplier TEXT,
    price REAL
  );
  
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT,
    cat TEXT,
    batchSize REAL,
    desc TEXT,
    status TEXT,
    batches TEXT
  );
  
  CREATE TABLE IF NOT EXISTS activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    msg TEXT,
    color TEXT,
    time TEXT
  );
`);

// Seed data if empty
const suppliersCount = db.prepare('SELECT COUNT(*) as count FROM suppliers').get();
if (suppliersCount.count === 0) {
  const insertSupplier = db.prepare('INSERT INTO suppliers (id, name, code, country, email, color) VALUES (@id, @name, @code, @country, @email, @color)');
  const suppliers = [
    { id: "s1", name: "Sigma-Aldrich", code: "SA", country: "Germany", email: "orders@sigma.com", color: "#3B82F6" },
    { id: "s2", name: "BASF India", code: "BI", country: "India", email: "india@basf.com", color: "#8B5CF6" },
    { id: "s3", name: "Brenntag", code: "BR", country: "Netherlands", email: "info@brenntag.nl", color: "#10B981" },
    { id: "s4", name: "Univar Solutions", code: "UV", country: "USA", email: "sales@univar.com", color: "#F59E0B" }
  ];
  suppliers.forEach(s => insertSupplier.run(s));

  const insertRM = db.prepare('INSERT INTO raw_materials (id, name, supplier, price) VALUES (@id, @name, @supplier, @price)');
  const rms = [
    { id: "rm1", name: "DM Water", supplier: "s3", price: 2.50 },
    { id: "rm2", name: "SHMP", supplier: "s1", price: 45.00 },
    { id: "rm3", name: "PMO-ICP", supplier: "s2", price: 120.00 },
    { id: "rm4", name: "Alphox", supplier: "s4", price: 85.00 },
    { id: "rm5", name: "Thickner PU300", supplier: "s1", price: 350.00 }
  ];
  rms.forEach(r => insertRM.run(r));

  const insertProduct = db.prepare('INSERT INTO products (id, code, name, cat, batchSize, desc, status, batches) VALUES (@id, @code, @name, @cat, @batchSize, @desc, @status, @batches)');
  const products = [
    {
        id: "p1", code: "PRO-001", name: "PRO40 White", cat: "Paint", batchSize: 1000,
        desc: "Premium interior white emulsion.",
        status: "trial",
        batches: [
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
        ]
    }
  ];
  products.forEach(p => insertProduct.run({ ...p, batches: JSON.stringify(p.batches) }));

  const insertActivity = db.prepare('INSERT INTO activity (msg, color, time) VALUES (@msg, @color, @time)');
  const activities = [
    { msg: "Created initial batch PRO-001-T01 for PRO40 White", color: "#3B82F6", time: "Just now" }
  ];
  activities.forEach(a => insertActivity.run(a));
}

// Routes
app.get('/api/data', (req, res) => {
  const suppliers = db.prepare('SELECT * FROM suppliers').all();
  const rms = db.prepare('SELECT * FROM raw_materials').all();
  const products = db.prepare('SELECT * FROM products').all().map(p => ({ ...p, batches: JSON.parse(p.batches) }));
  const activity = db.prepare('SELECT * FROM activity ORDER BY id DESC').all();
  res.json({ suppliers, rms, products, activity });
});

// Sync whole state to DB
app.post('/api/save', (req, res) => {
  const { products, rms, activity } = req.body;
  
  if (products) {
      const updateProduct = db.prepare('UPDATE products SET name=@name, cat=@cat, batchSize=@batchSize, desc=@desc, status=@status, batches=@batches WHERE id=@id');
      const insertProduct = db.prepare('INSERT OR IGNORE INTO products (id, code, name, cat, batchSize, desc, status, batches) VALUES (@id, @code, @name, @cat, @batchSize, @desc, @status, @batches)');
      
      db.transaction(() => {
        products.forEach(p => {
          const pData = { ...p, batches: JSON.stringify(p.batches) };
          const info = updateProduct.run(pData);
          if (info.changes === 0) insertProduct.run(pData);
        });
      })();
  }

  if (rms) {
      const updateRM = db.prepare('UPDATE raw_materials SET name=@name, supplier=@supplier, price=@price WHERE id=@id');
      const insertRM = db.prepare('INSERT OR IGNORE INTO raw_materials (id, name, supplier, price) VALUES (@id, @name, @supplier, @price)');
      db.transaction(() => {
        rms.forEach(r => {
          const info = updateRM.run(r);
          if (info.changes === 0) insertRM.run(r);
        });
      })();
  }

  if (activity) {
      db.prepare('DELETE FROM activity').run();
      const insertActivity = db.prepare('INSERT INTO activity (msg, color, time) VALUES (@msg, @color, @time)');
      db.transaction(() => {
        activity.forEach(a => insertActivity.run(a));
      })();
  }

  res.json({ success: true });
});

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});

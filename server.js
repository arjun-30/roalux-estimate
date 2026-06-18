const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'dist')));

const dbFile = path.join(__dirname, 'database.json');

// Seed data
const defaultData = {
  suppliers: [
    { id: "s1", name: "Sigma-Aldrich", code: "SA", country: "Germany", email: "orders@sigma.com", color: "#3B82F6" },
    { id: "s2", name: "BASF India", code: "BI", country: "India", email: "india@basf.com", color: "#8B5CF6" },
    { id: "s3", name: "Brenntag", code: "BR", country: "Netherlands", email: "info@brenntag.nl", color: "#10B981" },
    { id: "s4", name: "Univar Solutions", code: "UV", country: "USA", email: "sales@univar.com", color: "#F59E0B" }
  ],
  rms: [
    { id: "rm1", name: "DM Water", supplier: "s3", price: 2.50 },
    { id: "rm2", name: "SHMP", supplier: "s1", price: 45.00 },
    { id: "rm3", name: "PMO-ICP", supplier: "s2", price: 120.00 },
    { id: "rm4", name: "Alphox", supplier: "s4", price: 85.00 },
    { id: "rm5", name: "Thickner PU300", supplier: "s1", price: 350.00 }
  ],
  products: [
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
  ],
  activity: [
    { id: 1, msg: "Created initial batch PRO-001-T01 for PRO40 White", color: "#3B82F6", time: "Just now" }
  ]
};

// Initialize DB file if it doesn't exist
if (!fs.existsSync(dbFile)) {
  fs.writeFileSync(dbFile, JSON.stringify(defaultData, null, 2));
}

// Helper to read DB
const readDB = () => {
  try {
    const data = fs.readFileSync(dbFile, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return defaultData;
  }
};

// Helper to write DB
const writeDB = (data) => {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Error writing database:", err);
  }
};

// Routes
app.get('/api/data', (req, res) => {
  const dbData = readDB();
  res.json(dbData);
});

// Sync whole state to DB
app.post('/api/save', (req, res) => {
  const { products, rms, activity } = req.body;
  const dbData = readDB();
  
  if (products) dbData.products = products;
  if (rms) dbData.rms = rms;
  if (activity) dbData.activity = activity;
  
  writeDB(dbData);
  res.json({ success: true });
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend API running on port ${port}`);
});

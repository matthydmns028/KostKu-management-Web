const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
// Set text limit tinggi agar HTML tabel cukup disimpan
app.use(express.json({ limit: '10mb' }));
// Mengeksekusi file statis frontend langsung dari folder yang sama
app.use(express.static(__dirname));

// Konfigurasi Database SQLite
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error saat menyambungkan database:', err.message);
  } else {
    console.log('Terkoneksi ke Database SQLite.');
    initDB();
  }
});

// Inisialisasi Tabel SQLite (Konsep Penyimpanan Front-end API)
function initDB() {
  db.run(`
    CREATE TABLE IF NOT EXISTS page_data (
      db_key TEXT PRIMARY KEY,
      html_content TEXT
    )
  `, (err) => {
    if (err) console.error("Gagal membuat tabel:", err.message);
    else console.log("Tabel 'page_data' siap.");
  });
}

// 1. API: Simpan Data (CREATE/UPDATE)
app.post('/api/save', (req, res) => {
  const { key, html } = req.body;
  if (!key || !html) return res.status(400).json({ error: "Key atau HTML kosong." });

  // Insert atau Update jika data untuk db_key tersbeut sudah ada
  const sql = `
    INSERT INTO page_data (db_key, html_content) 
    VALUES (?, ?)
    ON CONFLICT(db_key) DO UPDATE SET html_content = ?
  `;
  
  db.run(sql, [key, html, html], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, message: "Berhasil disimpan ke SQLite." });
  });
});

// 2. API: Baca Data (READ)
app.get('/api/load/:key', (req, res) => {
  const key = req.params.key;
  
  db.get('SELECT html_content FROM page_data WHERE db_key = ?', [key], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Jika data ada, kembalikan HTML-nya. Jika tidak ada, kembalikan null.
    res.json({ html: row ? row.html_content : null });
  });
});

// Menjalankan Server Backend
app.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`Berhasil! Server Backend berjalan di port ${PORT}`);
  console.log(`Buka aplikasi Anda di -> http://localhost:${PORT}`);
  console.log(`===========================================`);
});

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname));

// Upload config
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
app.use('/uploads', express.static(uploadDir));
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('DB Error:', err.message);
  else { console.log('Connected to SQLite.'); initDB(); }
});

// Promisify db methods
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); });
});
const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); });
});
const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); });
});

function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama TEXT NOT NULL,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'penghuni',
      email TEXT DEFAULT '',
      telepon TEXT DEFAULT ''
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS kamar (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nomor TEXT UNIQUE NOT NULL,
      tipe TEXT DEFAULT 'Standard',
      fasilitas TEXT DEFAULT '',
      harga REAL DEFAULT 0,
      status TEXT DEFAULT 'Kosong'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS penghuni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      kamar_id INTEGER,
      nama TEXT NOT NULL,
      telepon TEXT DEFAULT '',
      tanggal_masuk TEXT DEFAULT '',
      jatuh_tempo TEXT DEFAULT '',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(kamar_id) REFERENCES kamar(id) ON DELETE SET NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pembayaran (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      penghuni_id INTEGER,
      kamar_nomor TEXT DEFAULT '',
      bulan TEXT DEFAULT '',
      tanggal_bayar TEXT DEFAULT '',
      jumlah REAL DEFAULT 0,
      bukti TEXT DEFAULT '',
      status TEXT DEFAULT 'Menunggu',
      trx_id TEXT DEFAULT '',
      FOREIGN KEY(penghuni_id) REFERENCES penghuni(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS pengaduan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      penghuni_id INTEGER,
      kamar_nomor TEXT DEFAULT '',
      penghuni_nama TEXT DEFAULT '',
      jenis TEXT DEFAULT '',
      deskripsi TEXT DEFAULT '',
      tanggal TEXT DEFAULT '',
      status TEXT DEFAULT 'Baru',
      FOREIGN KEY(penghuni_id) REFERENCES penghuni(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS notifikasi (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      penerima_kamar TEXT DEFAULT '',
      pesan TEXT DEFAULT '',
      tanggal TEXT DEFAULT '',
      status TEXT DEFAULT 'sent'
    )`);

    // Drop old page_data table if exists
    db.run(`DROP TABLE IF EXISTS page_data`);

    // Seed default admin if not exists
    db.get(`SELECT id FROM users WHERE username = 'admin'`, [], (err, row) => {
      if (!row) {
        db.run(`INSERT INTO users (nama, username, password, role, email, telepon) VALUES (?, ?, ?, ?, ?, ?)`,
          ['Administrator', 'admin', 'admin123', 'admin', 'admin@kosku.com', '081234567890']);
        console.log('Default admin created (admin / admin123)');
      }
    });

    // Seed sample kamar if empty
    db.get(`SELECT COUNT(*) as c FROM kamar`, [], (err, row) => {
      if (row && row.c === 0) {
        db.run(`INSERT INTO kamar (nomor, tipe, fasilitas, harga, status) VALUES (?, ?, ?, ?, ?)`,
          ['A-1', 'Standard', 'Wifi, AC, Kamar Mandi Dalam', 1200000, 'Terisi']);
        db.run(`INSERT INTO kamar (nomor, tipe, fasilitas, harga, status) VALUES (?, ?, ?, ?, ?)`,
          ['A-2', 'Standard', 'Wifi, AC, Kamar Mandi Dalam', 1200000, 'Terisi']);
        db.run(`INSERT INTO kamar (nomor, tipe, fasilitas, harga, status) VALUES (?, ?, ?, ?, ?)`,
          ['A-3', 'Deluxe', 'Wifi, AC, Kamar Mandi Dalam, TV', 1500000, 'Kosong']);
      }
    });

    console.log('All tables ready.');
  });
}

// ========== AUTH ==========
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username dan password diperlukan.' });
    const user = await dbGet('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (user) {
      res.json({ success: true, message: 'Login berhasil.', user: { id: user.id, nama: user.nama, username: user.username, role: user.role } });
    } else {
      res.status(401).json({ error: 'Username atau password salah.' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== USERS ==========
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    let sql = 'SELECT id, nama, username, role, email, telepon FROM users';
    let params = [];
    if (role) { sql += ' WHERE role = ?'; params.push(role); }
    sql += ' ORDER BY id DESC';
    const users = await dbAll(sql, params);
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const { nama, username, password, role, email, telepon } = req.body;
    if (!nama || !username || !password || !role) return res.status(400).json({ error: 'Field wajib: nama, username, password, role.' });
    await dbRun('INSERT INTO users (nama, username, password, role, email, telepon) VALUES (?,?,?,?,?,?)',
      [nama, username, password, role, email || '', telepon || '']);
    res.json({ success: true, message: 'User berhasil dibuat.' });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username sudah digunakan.' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  try {
    const { nama, username, email, telepon, role, password } = req.body;
    let sql, params;
    if (password) {
      sql = 'UPDATE users SET nama=?, username=?, email=?, telepon=?, role=?, password=? WHERE id=?';
      params = [nama, username, email || '', telepon || '', role, password, req.params.id];
    } else {
      sql = 'UPDATE users SET nama=?, username=?, email=?, telepon=?, role=? WHERE id=?';
      params = [nama, username, email || '', telepon || '', role, req.params.id];
    }
    await dbRun(sql, params);
    // Also update penghuni nama/telepon if linked
    await dbRun('UPDATE penghuni SET nama=?, telepon=? WHERE user_id=?', [nama, telepon || '', req.params.id]);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username sudah digunakan.' });
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    // Remove linked penghuni first
    const penghuni = await dbGet('SELECT kamar_id FROM penghuni WHERE user_id=?', [req.params.id]);
    if (penghuni && penghuni.kamar_id) {
      await dbRun('UPDATE kamar SET status="Kosong" WHERE id=?', [penghuni.kamar_id]);
    }
    await dbRun('DELETE FROM penghuni WHERE user_id=?', [req.params.id]);
    await dbRun('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== KAMAR ==========
app.get('/api/kamar', async (req, res) => {
  try {
    const kamar = await dbAll('SELECT * FROM kamar ORDER BY nomor ASC');
    res.json(kamar);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/kamar', async (req, res) => {
  try {
    const { nomor, tipe, fasilitas, harga, status } = req.body;
    if (!nomor) return res.status(400).json({ error: 'Nomor kamar wajib diisi.' });
    await dbRun('INSERT INTO kamar (nomor, tipe, fasilitas, harga, status) VALUES (?,?,?,?,?)',
      [nomor, tipe || 'Standard', fasilitas || '', harga || 0, status || 'Kosong']);
    res.json({ success: true });
  } catch (e) {
    if (e.message.includes('UNIQUE')) return res.status(400).json({ error: 'Nomor kamar sudah ada.' });
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/kamar/:id', async (req, res) => {
  try {
    const { nomor, tipe, fasilitas, harga, status } = req.body;
    await dbRun('UPDATE kamar SET nomor=?, tipe=?, fasilitas=?, harga=?, status=? WHERE id=?',
      [nomor, tipe, fasilitas, harga, status, req.params.id]);
    // Update kamar_nomor in related tables
    await dbRun('UPDATE pembayaran SET kamar_nomor=? WHERE kamar_nomor=(SELECT nomor FROM kamar WHERE id=?)', [nomor, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/kamar/:id', async (req, res) => {
  try {
    // Check if occupied
    const penghuni = await dbGet('SELECT id FROM penghuni WHERE kamar_id=?', [req.params.id]);
    if (penghuni) return res.status(400).json({ error: 'Kamar masih terisi. Keluarkan penghuni terlebih dahulu.' });
    await dbRun('DELETE FROM kamar WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PENGHUNI ==========
app.get('/api/penghuni', async (req, res) => {
  try {
    const penghuni = await dbAll(`
      SELECT p.*, k.nomor as kamar_nomor, k.tipe as kamar_tipe, k.harga as kamar_harga,
        (SELECT CASE
          WHEN EXISTS(SELECT 1 FROM pembayaran WHERE penghuni_id=p.id AND status='Lunas' AND bulan=strftime('%m/%Y','now'))
          THEN 'Lunas'
          WHEN EXISTS(SELECT 1 FROM pembayaran WHERE penghuni_id=p.id AND status='Menunggu' AND bulan=strftime('%m/%Y','now'))
          THEN 'Menunggu'
          ELSE 'Belum Bayar'
        END) as status_bayar
      FROM penghuni p
      LEFT JOIN kamar k ON p.kamar_id = k.id
      ORDER BY p.id DESC
    `);
    res.json(penghuni);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/penghuni/by-user/:userId', async (req, res) => {
  try {
    const p = await dbGet(`
      SELECT p.*, k.nomor as kamar_nomor, k.tipe as kamar_tipe, k.harga as kamar_harga
      FROM penghuni p LEFT JOIN kamar k ON p.kamar_id = k.id
      WHERE p.user_id = ?
    `, [req.params.userId]);
    res.json(p || null);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/penghuni', async (req, res) => {
  try {
    const { nama, telepon, kamar_id, tanggal_masuk, jatuh_tempo, username, password } = req.body;
    if (!nama || !kamar_id) return res.status(400).json({ error: 'Nama dan kamar wajib diisi.' });

    // Check kamar available
    const kamar = await dbGet('SELECT * FROM kamar WHERE id=?', [kamar_id]);
    if (!kamar) return res.status(400).json({ error: 'Kamar tidak ditemukan.' });
    if (kamar.status === 'Terisi') return res.status(400).json({ error: 'Kamar sudah terisi.' });

    // Create user account
    const uname = username || nama.toLowerCase().replace(/\s+/g, '');
    const pwd = password || 'kost123';
    let userId = null;
    try {
      const result = await dbRun('INSERT INTO users (nama, username, password, role, telepon) VALUES (?,?,?,?,?)',
        [nama, uname, pwd, 'penghuni', telepon || '']);
      userId = result.lastID;
    } catch (e) {
      if (e.message.includes('UNIQUE')) return res.status(400).json({ error: `Username "${uname}" sudah digunakan. Pilih username lain.` });
      throw e;
    }

    // Create penghuni
    await dbRun('INSERT INTO penghuni (user_id, kamar_id, nama, telepon, tanggal_masuk, jatuh_tempo) VALUES (?,?,?,?,?,?)',
      [userId, kamar_id, nama, telepon || '', tanggal_masuk || '', jatuh_tempo || '']);

    // Update kamar status
    await dbRun('UPDATE kamar SET status="Terisi" WHERE id=?', [kamar_id]);

    res.json({ success: true, message: `Penghuni ditambahkan. Username: ${uname}, Password: ${pwd}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/penghuni/:id', async (req, res) => {
  try {
    const { nama, telepon, tanggal_masuk, jatuh_tempo } = req.body;
    await dbRun('UPDATE penghuni SET nama=?, telepon=?, tanggal_masuk=?, jatuh_tempo=? WHERE id=?',
      [nama, telepon, tanggal_masuk, jatuh_tempo, req.params.id]);
    // Sync with user
    const p = await dbGet('SELECT user_id FROM penghuni WHERE id=?', [req.params.id]);
    if (p && p.user_id) {
      await dbRun('UPDATE users SET nama=?, telepon=? WHERE id=?', [nama, telepon, p.user_id]);
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/penghuni/:id', async (req, res) => {
  try {
    const p = await dbGet('SELECT user_id, kamar_id FROM penghuni WHERE id=?', [req.params.id]);
    if (p) {
      if (p.kamar_id) await dbRun('UPDATE kamar SET status="Kosong" WHERE id=?', [p.kamar_id]);
      if (p.user_id) await dbRun('DELETE FROM users WHERE id=?', [p.user_id]);
    }
    await dbRun('DELETE FROM penghuni WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PEMBAYARAN ==========
app.get('/api/pembayaran', async (req, res) => {
  try {
    const { penghuni_id } = req.query;
    let sql = `SELECT pb.*, p.nama as penghuni_nama FROM pembayaran pb
      LEFT JOIN penghuni p ON pb.penghuni_id = p.id`;
    let params = [];
    if (penghuni_id) { sql += ' WHERE pb.penghuni_id = ?'; params.push(penghuni_id); }
    sql += ' ORDER BY pb.id DESC';
    res.json(await dbAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pembayaran', async (req, res) => {
  try {
    const { penghuni_id, kamar_nomor, bulan, tanggal_bayar, jumlah, status } = req.body;
    const trx_id = 'TRX-' + Math.floor(100000 + Math.random() * 900000);
    await dbRun('INSERT INTO pembayaran (penghuni_id, kamar_nomor, bulan, tanggal_bayar, jumlah, status, trx_id) VALUES (?,?,?,?,?,?,?)',
      [penghuni_id, kamar_nomor || '', bulan || '', tanggal_bayar || '', jumlah || 0, status || 'Menunggu', trx_id]);
    res.json({ success: true, trx_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pembayaran/upload', upload.single('bukti'), async (req, res) => {
  try {
    const { penghuni_id, kamar_nomor, bulan, jumlah } = req.body;
    const bukti = req.file ? '/uploads/' + req.file.filename : '';
    const tanggal_bayar = new Date().toLocaleDateString('id-ID');
    const trx_id = 'TRX-' + Math.floor(100000 + Math.random() * 900000);
    await dbRun('INSERT INTO pembayaran (penghuni_id, kamar_nomor, bulan, tanggal_bayar, jumlah, bukti, status, trx_id) VALUES (?,?,?,?,?,?,?,?)',
      [penghuni_id, kamar_nomor, bulan, tanggal_bayar, jumlah, bukti, 'Menunggu', trx_id]);
    res.json({ success: true, trx_id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/pembayaran/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await dbRun('UPDATE pembayaran SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pembayaran/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM pembayaran WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== PENGADUAN ==========
app.get('/api/pengaduan', async (req, res) => {
  try {
    const { penghuni_id } = req.query;
    let sql = 'SELECT * FROM pengaduan';
    let params = [];
    if (penghuni_id) { sql += ' WHERE penghuni_id = ?'; params.push(penghuni_id); }
    sql += ' ORDER BY id DESC';
    res.json(await dbAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/pengaduan', async (req, res) => {
  try {
    const { penghuni_id, kamar_nomor, penghuni_nama, jenis, deskripsi } = req.body;
    const tanggal = new Date().toLocaleDateString('id-ID');
    await dbRun('INSERT INTO pengaduan (penghuni_id, kamar_nomor, penghuni_nama, jenis, deskripsi, tanggal, status) VALUES (?,?,?,?,?,?,?)',
      [penghuni_id || null, kamar_nomor || '', penghuni_nama || '', jenis, deskripsi, tanggal, 'Baru']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/pengaduan/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    await dbRun('UPDATE pengaduan SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/pengaduan/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM pengaduan WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== NOTIFIKASI ==========
app.get('/api/notifikasi', async (req, res) => {
  try {
    const { kamar } = req.query;
    let sql = 'SELECT * FROM notifikasi';
    let params = [];
    if (kamar) { sql += ' WHERE penerima_kamar = ?'; params.push(kamar); }
    sql += ' ORDER BY id DESC';
    res.json(await dbAll(sql, params));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notifikasi', async (req, res) => {
  try {
    const { penerima_kamar, pesan } = req.body;
    if (!penerima_kamar || !pesan) return res.status(400).json({ error: 'Penerima dan pesan wajib diisi.' });
    const tanggal = new Date().toLocaleDateString('id-ID');
    await dbRun('INSERT INTO notifikasi (penerima_kamar, pesan, tanggal, status) VALUES (?,?,?,?)',
      [penerima_kamar, pesan, tanggal, 'sent']);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/notifikasi/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM notifikasi WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== DASHBOARD ==========
app.get('/api/dashboard', async (req, res) => {
  try {
    const totalKamar = (await dbGet('SELECT COUNT(*) as c FROM kamar')).c;
    const kamarTerisi = (await dbGet("SELECT COUNT(*) as c FROM kamar WHERE status='Terisi'")).c;
    const kamarKosong = totalKamar - kamarTerisi;
    const pembayaranTertunda = (await dbGet("SELECT COUNT(*) as c FROM pembayaran WHERE status='Menunggu'")).c;
    const belumBayar = kamarTerisi - (await dbGet(`SELECT COUNT(DISTINCT penghuni_id) as c FROM pembayaran WHERE status IN ('Lunas','Menunggu')`)).c;
    const recentPayments = await dbAll(`
      SELECT pb.*, p.nama as penghuni_nama FROM pembayaran pb
      LEFT JOIN penghuni p ON pb.penghuni_id = p.id
      ORDER BY pb.id DESC LIMIT 5
    `);
    res.json({ totalKamar, kamarTerisi, kamarKosong: kamarKosong < 0 ? 0 : kamarKosong, pembayaranTertunda, belumBayar: belumBayar < 0 ? 0 : belumBayar, recentPayments });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ========== LAPORAN ==========
app.get('/api/laporan', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT bulan, SUM(jumlah) as pendapatan FROM pembayaran
      WHERE status = 'Lunas'
      GROUP BY bulan ORDER BY bulan
    `);
    const totalPendapatan = rows.reduce((sum, r) => sum + r.pendapatan, 0);
    res.json({ rows, totalPendapatan });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Start
app.listen(PORT, () => {
  console.log('===========================================');
  console.log(`Server berjalan di -> http://localhost:${PORT}`);
  console.log('===========================================');
});

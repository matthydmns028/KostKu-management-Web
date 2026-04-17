<h1 align="center">🏠 KosKu Management Web</h1>
<p align="center">
  Sistem Informasi Manajemen Kos-kosan Berbasis Web dengan integrasi Node.js & SQLite.
</p>

---

## 🚀 Tentang Proyek
**KosKu Management** adalah sebuah aplikasi berbasis web yang dirancang untuk mempermudah pemilik kos (Admin) dalam mengelola properti mereka, serta memberikan kenyamanan bagi para penghuni kos dalam memonitor status tagihan dan melakukan pengaduan secara digital.

## ✨ Fitur Utama
Proyek ini dibagi menjadi dua antarmuka (Role-Based Access System):

### 👨‍💼 Fitur Admin
- **Dashboard Analytics:** Pantau statistik kamar, total penghuni, dan pendapatan.
- **Manajemen Kamar & Penghuni:** Tambah, edit, hapus, dan atur ketersediaan setiap kamar kos.
- **Manajemen Pembayaran:** Verifikasi atau tolak bukti transfer pembayaran secara real-time.
- **Sistem Pengaduan:** Tanggapi keluhan, masalah kamar (A/C, kebocoran, dll) dari penghuni.
- **Notifikasi:** Kirim pesan peringatan tunggal maupun broadcast kepada penghuni.

### 👤 Fitur Penghuni (User)
- **User Dashboard:** Tinjau kembali tanggal masuk, status pembayaran bulan ini, dan estimasi jatuh tempo berikutnya.
- **Pembayaran:** Upload bukti transfer dengan mudah (UI interaktif).
- **Pengaduan (Ticketing):** Buat laporan kerusakan fasilitas kos dan pantau progres perbaikannya.
- **Notifikasi Pribadi:** Terima pemberitahuan atau balasan langsung dari pemilik kos/admin.

## 🛠️ Teknologi yang Digunakan
- **Frontend / UI:** HTML5, Custom CSS3, Vanilla Javascript
- **Backend / API:** Node.js, Express.js, CORS
- **Database:** SQLite3 (Auto-generated `database.sqlite`)
- **Icons & Assets:** FontAwesome 6

## 💻 Panduan Instalasi & Penggunaan

Ikuti langkah-langkah di bawah ini untuk menjalankan aplikasi mode *local development*:

1. **Pastikan Node.js sudah terinstal**
   Bila belum, unduh dan instal Node.js dari [situs resminya](https://nodejs.org/).
   
2. **Kloning Repositori (Opsional jika Anda sudah punya foldernya)**
   ```bash
   git clone https://github.com/username/KostKu-management-Web.git
   cd "Project Kewirausahaan"
   ```

3. **Instal Dependensi (NPM Packages)**
   Buka Terminal/CMD di folder project ini dan instal semua library yang dibutuhkan:
   ```bash
   npm install
   ```

4. **Jalankan Server Backend**
   ```bash
   node server.js
   ```
   Akan muncul log bahwa database siap dan server berjalan di port `3000`.

5. **Buka Aplikasi**
   Buka browser (Google Chrome / Edge) dan tuju alamat berikut:
   **[http://localhost:3000/login.html](http://localhost:3000/login.html)**

## 🔐 Panduan Testing Akun
Tidak diperlukan konfigurasi *SQL dump*, karena sistem akan otomatis membangun tabel di memori ketika server menyala pertama kali. Kamu bisa langsung mencobanya dengan:
- **Daftar Sebagai Admin:** melalui menu `Register` untuk melihat desain panel kendali utama.
- **Daftar Sebagai Penghuni:** melalui menu `Register` untuk merasakan perspektif penyewa/penghuni kos.

---
<p align="center"><i>Dibuat untuk keperluan Project Kewirausahaan/Pemrograman Web 📈</i></p>
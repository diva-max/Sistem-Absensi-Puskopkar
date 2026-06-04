# 🏢 Backend Sistem Absensi — Puskopkar Karawang

Backend REST API untuk sistem absensi karyawan Puskopkar Karawang.  
Dibangun dengan **Node.js + Express + SQLite (better-sqlite3)**.

---

## 📁 Struktur Proyek

```
absensi-puskopkar/
├── server.js               # Entry point
├── package.json
├── db/
│   └── database.js         # Inisialisasi SQLite + schema
├── routes/
│   ├── absensi.js          # CRUD absensi, stats, rekap, export CSV
│   └── karyawan.js         # CRUD master karyawan
├── middleware/
│   └── errorHandler.js     # Response helper & error handler
├── public/
│   └── index.html          # Frontend (sudah terhubung ke API)
└── data/
    └── absensi.db          # File database (dibuat otomatis)
```

---

## 🚀 Cara Menjalankan

### 1. Install dependensi
```bash
npm install
```

### 2. Jalankan server
```bash
# Mode produksi
npm start

# Mode development (auto-restart)
npm run dev
```

Server berjalan di: **http://localhost:3000**  
Buka browser → langsung tampil halaman absensi.

---

## 🔌 Endpoint API

### Health Check
| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/health` | Cek status server |

---

### Absensi (`/api/absensi`)

| Method | Path | Keterangan |
|--------|------|------------|
| POST | `/api/absensi` | Catat absensi masuk/keluar |
| GET | `/api/absensi` | Ambil log absensi (dengan filter) |
| GET | `/api/absensi/stats` | Statistik hari ini |
| GET | `/api/absensi/rekap` | Rekap per karyawan per hari |
| GET | `/api/absensi/export/csv` | Download CSV |
| DELETE | `/api/absensi/:id` | Hapus record absensi |

#### POST `/api/absensi` — Body
```json
{
  "nip": "PKK-001",
  "nama": "Budi Santoso",
  "divisi": "Keuangan & Akuntansi",
  "type": "in",
  "keterangan": ""
}
```

#### GET `/api/absensi` — Query Params
| Param | Contoh | Keterangan |
|-------|--------|------------|
| `search` | `budi` | Cari nama atau NIP |
| `type` | `in` atau `out` | Filter status |
| `divisi` | `Keuangan & Akuntansi` | Filter divisi |
| `tanggal` | `2025-06-04` | Filter satu hari |
| `tanggal_dari` | `2025-06-01` | Filter rentang (dari) |
| `tanggal_sampai` | `2025-06-30` | Filter rentang (sampai) |
| `limit` | `100` | Jumlah data (default: 200) |
| `offset` | `0` | Paginasi |

---

### Karyawan (`/api/karyawan`)

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/api/karyawan` | Daftar semua karyawan |
| GET | `/api/karyawan/:nip` | Detail satu karyawan |
| POST | `/api/karyawan` | Tambah karyawan baru |
| PUT | `/api/karyawan/:nip` | Update data karyawan |
| DELETE | `/api/karyawan/:nip` | Hapus karyawan |

#### POST `/api/karyawan` — Body
```json
{
  "nip": "PKK-001",
  "nama": "Budi Santoso",
  "divisi": "Keuangan & Akuntansi"
}
```

---

## 📊 Struktur Database (SQLite)

### Tabel `karyawan`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | INTEGER PK | Auto increment |
| nip | TEXT UNIQUE | NIP karyawan |
| nama | TEXT | Nama lengkap |
| divisi | TEXT | Divisi/unit kerja |
| aktif | INTEGER | 1=aktif, 0=nonaktif |
| created_at | TEXT | Waktu dibuat |
| updated_at | TEXT | Waktu diperbarui |

### Tabel `absensi`
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| id | INTEGER PK | Auto increment |
| nip | TEXT | NIP karyawan (FK) |
| nama | TEXT | Nama karyawan |
| divisi | TEXT | Divisi |
| type | TEXT | `in` atau `out` |
| keterangan | TEXT | Keterangan opsional |
| tanggal | TEXT | Format: `YYYY-MM-DD` |
| waktu | TEXT | Format: `HH:MM` |
| recorded_at | TEXT | Timestamp pencatatan |

---

## ⚙️ Konfigurasi

Ubah variabel environment sesuai kebutuhan:

```bash
PORT=3000   # default port server
```

Untuk deployment, edit bagian CORS di `server.js`:
```js
app.use(cors({
  origin: 'https://domain-anda.com',  // ganti dari '*'
  ...
}));
```

---

## 🛠️ Teknologi

- **Node.js** — runtime
- **Express** — web framework
- **better-sqlite3** — database SQLite (synchronous, cepat)
- **helmet** — security headers
- **cors** — Cross-Origin Resource Sharing
- **morgan** — HTTP request logger
- **express-rate-limit** — rate limiting

// db/database.js
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DB_DIR, 'absensi.db');

// Pastikan folder data ada
if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Aktifkan WAL mode untuk performa lebih baik
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  /* Tabel karyawan (master) */
  CREATE TABLE IF NOT EXISTS karyawan (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nip        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    nama       TEXT    NOT NULL,
    divisi     TEXT    NOT NULL,
    aktif      INTEGER NOT NULL DEFAULT 1,
    created_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
  );

  /* Tabel log absensi */
  CREATE TABLE IF NOT EXISTS absensi (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nip         TEXT    NOT NULL COLLATE NOCASE,
    nama        TEXT    NOT NULL,
    divisi      TEXT    NOT NULL,
    type        TEXT    NOT NULL CHECK(type IN ('in','out')),
    keterangan  TEXT    NOT NULL DEFAULT '',
    tanggal     TEXT    NOT NULL,   -- format: YYYY-MM-DD
    waktu       TEXT    NOT NULL,   -- format: HH:MM
    recorded_at TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (nip) REFERENCES karyawan(nip) ON UPDATE CASCADE
  );

  /* Index untuk query yang sering dipakai */
  CREATE INDEX IF NOT EXISTS idx_absensi_nip      ON absensi(nip);
  CREATE INDEX IF NOT EXISTS idx_absensi_tanggal  ON absensi(tanggal);
  CREATE INDEX IF NOT EXISTS idx_absensi_type     ON absensi(type);
`);

module.exports = db;

// routes/karyawan.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { sendSuccess, sendError } = require('../middleware/errorHandler');

const DIVISI_VALID = [
  'Administrasi & Umum',
  'Keuangan & Akuntansi',
  'Simpan Pinjam',
  'Usaha & Perdagangan',
  'SDM & Pengembangan',
  'IT & Sistem Informasi',
  'Pengawas',
  'Direksi',
];

// ── GET /api/karyawan ─────────────────────────────────────────────────────────
// Query params: ?search=&divisi=&aktif=1
router.get('/', (req, res, next) => {
  try {
    const { search = '', divisi = '', aktif = '' } = req.query;

    let sql    = 'SELECT * FROM karyawan WHERE 1=1';
    const args = [];

    if (search.trim()) {
      sql += ' AND (LOWER(nama) LIKE ? OR LOWER(nip) LIKE ?)';
      const q = `%${search.trim().toLowerCase()}%`;
      args.push(q, q);
    }
    if (divisi.trim()) {
      sql += ' AND divisi = ?';
      args.push(divisi.trim());
    }
    if (aktif !== '') {
      sql += ' AND aktif = ?';
      args.push(aktif === '1' ? 1 : 0);
    }

    sql += ' ORDER BY nama ASC';

    const rows = db.prepare(sql).all(...args);
    return sendSuccess(res, { data: rows, total: rows.length });
  } catch (err) { next(err); }
});

// ── GET /api/karyawan/:nip ────────────────────────────────────────────────────
router.get('/:nip', (req, res, next) => {
  try {
    const karyawan = db.prepare('SELECT * FROM karyawan WHERE nip = ?').get(req.params.nip);
    if (!karyawan) return sendError(res, 'Karyawan tidak ditemukan.', 404);
    return sendSuccess(res, { data: karyawan });
  } catch (err) { next(err); }
});

// ── POST /api/karyawan ────────────────────────────────────────────────────────
router.post('/', (req, res, next) => {
  try {
    const { nip, nama, divisi } = req.body;

    if (!nip?.trim())   return sendError(res, 'NIP wajib diisi.');
    if (!nama?.trim())  return sendError(res, 'Nama wajib diisi.');
    if (!divisi?.trim()) return sendError(res, 'Divisi wajib diisi.');
    if (!DIVISI_VALID.includes(divisi.trim()))
      return sendError(res, `Divisi tidak valid. Pilihan: ${DIVISI_VALID.join(', ')}`);

    const stmt   = db.prepare('INSERT INTO karyawan (nip, nama, divisi) VALUES (?, ?, ?)');
    const result = stmt.run(nip.trim().toUpperCase(), nama.trim(), divisi.trim());

    const created = db.prepare('SELECT * FROM karyawan WHERE id = ?').get(result.lastInsertRowid);
    return sendSuccess(res, { message: 'Karyawan berhasil ditambahkan.', data: created }, 201);
  } catch (err) { next(err); }
});

// ── PUT /api/karyawan/:nip ────────────────────────────────────────────────────
router.put('/:nip', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM karyawan WHERE nip = ?').get(req.params.nip);
    if (!existing) return sendError(res, 'Karyawan tidak ditemukan.', 404);

    const { nama, divisi, aktif } = req.body;

    const newNama   = nama?.trim()   || existing.nama;
    const newDivisi = divisi?.trim() || existing.divisi;
    const newAktif  = aktif !== undefined ? (aktif ? 1 : 0) : existing.aktif;

    if (divisi && !DIVISI_VALID.includes(newDivisi))
      return sendError(res, `Divisi tidak valid.`);

    db.prepare(`
      UPDATE karyawan
      SET nama = ?, divisi = ?, aktif = ?, updated_at = datetime('now','localtime')
      WHERE nip = ?
    `).run(newNama, newDivisi, newAktif, req.params.nip);

    const updated = db.prepare('SELECT * FROM karyawan WHERE nip = ?').get(req.params.nip);
    return sendSuccess(res, { message: 'Data karyawan diperbarui.', data: updated });
  } catch (err) { next(err); }
});

// ── DELETE /api/karyawan/:nip ─────────────────────────────────────────────────
router.delete('/:nip', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM karyawan WHERE nip = ?').get(req.params.nip);
    if (!existing) return sendError(res, 'Karyawan tidak ditemukan.', 404);

    db.prepare('DELETE FROM karyawan WHERE nip = ?').run(req.params.nip);
    return sendSuccess(res, { message: 'Karyawan berhasil dihapus.' });
  } catch (err) { next(err); }
});

module.exports = router;

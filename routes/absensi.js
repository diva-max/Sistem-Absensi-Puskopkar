// routes/absensi.js
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { sendSuccess, sendError } = require('../middleware/errorHandler');

// ── Helper: tanggal hari ini (YYYY-MM-DD) ─────────────────────────────────────
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

function nowTimeStr() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

// ── POST /api/absensi ─────────────────────────────────────────────────────────
// Body: { nip, nama, divisi, type: 'in'|'out', keterangan? }
router.post('/', (req, res, next) => {
  try {
    let { nip, nama, divisi, type, keterangan = '' } = req.body;

    // Validasi
    if (!nip?.trim())   return sendError(res, 'NIP / ID karyawan wajib diisi.');
    if (!nama?.trim())  return sendError(res, 'Nama karyawan wajib diisi.');
    if (!divisi?.trim()) return sendError(res, 'Divisi wajib dipilih.');
    if (!['in','out'].includes(type)) return sendError(res, "Type harus 'in' atau 'out'.");

    nip  = nip.trim().toUpperCase();
    nama = nama.trim();
    divisi = divisi.trim();

    const tanggal = todayStr();
    const waktu   = nowTimeStr();

    // Cek duplikat absen masuk
    if (type === 'in') {
      const sudahMasuk = db.prepare(
        "SELECT id FROM absensi WHERE nip = ? AND type = 'in' AND tanggal = ?"
      ).get(nip, tanggal);
      if (sudahMasuk) return sendError(res, `${nama} sudah absen masuk hari ini.`, 409);
    }

    // Cek absen keluar: harus ada absen masuk dulu
    if (type === 'out') {
      const adaMasuk = db.prepare(
        "SELECT id FROM absensi WHERE nip = ? AND type = 'in' AND tanggal = ?"
      ).get(nip, tanggal);
      if (!adaMasuk) return sendError(res, `${nama} belum absen masuk hari ini.`, 422);

      const sudahKeluar = db.prepare(
        "SELECT id FROM absensi WHERE nip = ? AND type = 'out' AND tanggal = ?"
      ).get(nip, tanggal);
      if (sudahKeluar) return sendError(res, `${nama} sudah absen keluar hari ini.`, 409);
    }

    // Upsert karyawan (simpan ke master jika belum ada)
    const adaKaryawan = db.prepare('SELECT id FROM karyawan WHERE nip = ?').get(nip);
    if (!adaKaryawan) {
      db.prepare('INSERT INTO karyawan (nip, nama, divisi) VALUES (?, ?, ?)').run(nip, nama, divisi);
    }

    // Catat absensi
    const result = db.prepare(`
      INSERT INTO absensi (nip, nama, divisi, type, keterangan, tanggal, waktu)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(nip, nama, divisi, type, keterangan.trim(), tanggal, waktu);

    const record = db.prepare('SELECT * FROM absensi WHERE id = ?').get(result.lastInsertRowid);
    const msg    = type === 'in'
      ? `${nama} berhasil absen masuk pukul ${waktu}`
      : `${nama} berhasil absen keluar pukul ${waktu}`;

    return sendSuccess(res, { message: msg, data: record }, 201);
  } catch (err) { next(err); }
});

// ── GET /api/absensi ──────────────────────────────────────────────────────────
// Query: ?search=&type=in|out&divisi=&tanggal=YYYY-MM-DD&tanggal_dari=&tanggal_sampai=&limit=100&offset=0
router.get('/', (req, res, next) => {
  try {
    const {
      search = '', type = '', divisi = '',
      tanggal = '', tanggal_dari = '', tanggal_sampai = '',
      limit = 200, offset = 0,
    } = req.query;

    let sql    = 'SELECT * FROM absensi WHERE 1=1';
    const args = [];

    if (search.trim()) {
      sql += ' AND (LOWER(nama) LIKE ? OR LOWER(nip) LIKE ?)';
      const q = `%${search.trim().toLowerCase()}%`;
      args.push(q, q);
    }
    if (type === 'in' || type === 'out') {
      sql += ' AND type = ?';
      args.push(type);
    }
    if (divisi.trim()) {
      sql += ' AND divisi = ?';
      args.push(divisi.trim());
    }
    if (tanggal.trim()) {
      sql += ' AND tanggal = ?';
      args.push(tanggal.trim());
    } else {
      if (tanggal_dari.trim()) {
        sql += ' AND tanggal >= ?';
        args.push(tanggal_dari.trim());
      }
      if (tanggal_sampai.trim()) {
        sql += ' AND tanggal <= ?';
        args.push(tanggal_sampai.trim());
      }
    }

    // Hitung total dulu
    const countSql  = sql.replace('SELECT *', 'SELECT COUNT(*) as cnt');
    const { cnt }   = db.prepare(countSql).get(...args);

    sql += ' ORDER BY tanggal DESC, waktu DESC LIMIT ? OFFSET ?';
    args.push(Number(limit), Number(offset));

    const rows = db.prepare(sql).all(...args);
    return sendSuccess(res, { data: rows, total: cnt, limit: Number(limit), offset: Number(offset) });
  } catch (err) { next(err); }
});

// ── GET /api/absensi/stats ────────────────────────────────────────────────────
// Statistik hari ini: hadir, sudah_pulang, masih_di_kantor
router.get('/stats', (req, res, next) => {
  try {
    const tanggal = req.query.tanggal || todayStr();

    const masuk  = db.prepare("SELECT DISTINCT nip FROM absensi WHERE type='in'  AND tanggal=?").all(tanggal);
    const keluar = db.prepare("SELECT DISTINCT nip FROM absensi WHERE type='out' AND tanggal=?").all(tanggal);

    const nipsKeluar   = new Set(keluar.map(r => r.nip));
    const masihKantor  = masuk.filter(r => !nipsKeluar.has(r.nip));

    return sendSuccess(res, {
      tanggal,
      data: {
        hadir:          masuk.length,
        sudah_pulang:   keluar.length,
        masih_di_kantor: masihKantor.length,
      }
    });
  } catch (err) { next(err); }
});

// ── GET /api/absensi/rekap ────────────────────────────────────────────────────
// Rekap per karyawan untuk satu hari: jam masuk, jam keluar, durasi kerja, status
router.get('/rekap', (req, res, next) => {
  try {
    const tanggal = req.query.tanggal || todayStr();

    // Ambil semua record hari itu
    const rows = db.prepare(
      "SELECT nip, nama, divisi, type, waktu FROM absensi WHERE tanggal = ? ORDER BY waktu ASC"
    ).all(tanggal);

    // Kelompokkan per NIP
    const byNip = {};
    for (const r of rows) {
      if (!byNip[r.nip]) byNip[r.nip] = { nip: r.nip, nama: r.nama, divisi: r.divisi, masuk: null, keluar: null };
      if (r.type === 'in'  && !byNip[r.nip].masuk)  byNip[r.nip].masuk  = r.waktu;
      if (r.type === 'out' && !byNip[r.nip].keluar) byNip[r.nip].keluar = r.waktu;
    }

    // Hitung durasi
    const hasil = Object.values(byNip).map(p => {
      let durasi_menit = null;
      if (p.masuk && p.keluar) {
        const [hm, mm] = p.masuk.split(':').map(Number);
        const [hk, mk] = p.keluar.split(':').map(Number);
        durasi_menit = (hk * 60 + mk) - (hm * 60 + mm);
      }
      return {
        ...p,
        durasi_menit,
        status: p.masuk && p.keluar ? 'selesai' : p.masuk ? 'di_kantor' : 'tidak_hadir',
      };
    });

    return sendSuccess(res, { tanggal, data: hasil, total: hasil.length });
  } catch (err) { next(err); }
});

// ── GET /api/absensi/export/csv ───────────────────────────────────────────────
// Query params sama dengan GET /api/absensi (tanpa limit/offset)
router.get('/export/csv', (req, res, next) => {
  try {
    const {
      search = '', type = '', divisi = '',
      tanggal = '', tanggal_dari = '', tanggal_sampai = '',
    } = req.query;

    let sql    = 'SELECT * FROM absensi WHERE 1=1';
    const args = [];

    if (search.trim()) {
      sql += ' AND (LOWER(nama) LIKE ? OR LOWER(nip) LIKE ?)';
      const q = `%${search.trim().toLowerCase()}%`;
      args.push(q, q);
    }
    if (type === 'in' || type === 'out') { sql += ' AND type = ?'; args.push(type); }
    if (divisi.trim())   { sql += ' AND divisi = ?'; args.push(divisi.trim()); }
    if (tanggal.trim())  { sql += ' AND tanggal = ?'; args.push(tanggal.trim()); }
    else {
      if (tanggal_dari.trim())    { sql += ' AND tanggal >= ?'; args.push(tanggal_dari.trim()); }
      if (tanggal_sampai.trim())  { sql += ' AND tanggal <= ?'; args.push(tanggal_sampai.trim()); }
    }
    sql += ' ORDER BY tanggal DESC, waktu DESC';

    const rows = db.prepare(sql).all(...args);

    // Buat CSV (dengan BOM untuk Excel)
    const header = 'Tanggal,Waktu,NIP,Nama,Divisi,Status,Keterangan\r\n';
    const csvRows = rows.map(r =>
      [r.tanggal, r.waktu, r.nip, r.nama, r.divisi, r.type === 'in' ? 'Masuk' : 'Keluar', r.keterangan]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ).join('\r\n');

    const today    = todayStr().replace(/-/g, '');
    const filename = `absensi_puskopkar_${today}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send('\uFEFF' + header + csvRows);
  } catch (err) { next(err); }
});

// ── DELETE /api/absensi/:id ───────────────────────────────────────────────────
router.delete('/:id', (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return sendError(res, 'ID tidak valid.');

    const record = db.prepare('SELECT * FROM absensi WHERE id = ?').get(id);
    if (!record) return sendError(res, 'Record absensi tidak ditemukan.', 404);

    db.prepare('DELETE FROM absensi WHERE id = ?').run(id);
    return sendSuccess(res, { message: 'Record absensi dihapus.' });
  } catch (err) { next(err); }
});

module.exports = router;

// server.js  —  Backend Sistem Absensi Puskopkar Karawang
'use strict';

const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const absensiRoutes   = require('./routes/absensi');
const karyawanRoutes  = require('./routes/karyawan');
const { globalErrorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Security & utility middleware ─────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS — izinkan semua origin (sesuaikan di production)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting — maks 200 request/menit per IP
app.use(rateLimit({
  windowMs : 60 * 1000,
  max      : 200,
  message  : { success: false, message: 'Terlalu banyak request, coba lagi sebentar.' },
  standardHeaders: true,
  legacyHeaders  : false,
}));

// ── Sajikan file frontend statis ──────────────────────────────────────────────
// Letakkan file HTML di folder `public/`
app.use(express.static(path.join(__dirname, 'public')));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/absensi',  absensiRoutes);
app.use('/api/karyawan', karyawanRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Server berjalan normal.', timestamp: new Date().toISOString() });
});

// ── 404 & Global Error ────────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Sistem Absensi Puskopkar Karawang — Backend   ║
║   Server berjalan di  http://localhost:${PORT}      ║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app;

// middleware/errorHandler.js

/**
 * Kirim response JSON yang konsisten
 */
function sendSuccess(res, data = {}, statusCode = 200) {
  return res.status(statusCode).json({ success: true, ...data });
}

function sendError(res, message, statusCode = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

/**
 * Global error handler (letakkan di akhir middleware stack)
 */
function globalErrorHandler(err, req, res, next) {
  console.error('[ERROR]', err.message);
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return sendError(res, 'Data sudah ada / duplikat.', 409);
  }
  return sendError(res, 'Terjadi kesalahan pada server.', 500);
}

/**
 * 404 handler
 */
function notFoundHandler(req, res) {
  return sendError(res, `Route ${req.method} ${req.path} tidak ditemukan.`, 404);
}

module.exports = { sendSuccess, sendError, globalErrorHandler, notFoundHandler };

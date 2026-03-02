/**
 * proxy.conf.js
 *
 * Two rules:
 *  1. /api  → forwarded to the .NET backend (port 5000)
 *  2. *     → bypass: serve Angular's own index.html
 *             This is the "historyApiFallback" equivalent for webpack-dev-server.
 *             It means refreshing /notes, /questions, etc. always serves the app shell
 *             instead of returning "Cannot GET /path".
 *
 * Production (nginx / Firebase) already handles this with its own rewrites.
 */
const PROXY_CONFIG = [
  // ── Rule 1: Forward /api to .NET backend ──────────────────────────────────
  {
    context: ['/api'],
    target: 'http://localhost:5000',
    secure: false,
    changeOrigin: true,
    logLevel: 'info',
    headers: {
      'X-API-Key': 'b49d1564ed136964b91428cae724b08110043caa66fc83d32977fb41'
    }
  },

  // ── Rule 2: Serve index.html for all unknown paths (SPA fallback) ─────────
  {
    context: '**',                       // match everything
    target: 'http://localhost:4200',     // webpack-dev-server itself
    secure: false,
    bypass: function (req) {
      // Let webpack serve its own static assets (.js, .css, .ico, .json, etc.)
      // Returning req.url tells webpack-dev-server: "serve this yourself" (no proxy loop).
      if (
        req.url.startsWith('/api') ||
        req.url.match(/\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|map)(\?|$)/)
      ) {
        return req.url; // serve directly from webpack in-memory FS
      }
      // All Angular SPA routes → serve index.html → Angular router takes over
      return '/index.html';
    }
  }
];

module.exports = PROXY_CONFIG;

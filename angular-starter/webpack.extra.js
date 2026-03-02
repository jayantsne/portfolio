/**
 * webpack.extra.js  –  merged into Angular CLI's webpack config via
 * @angular-builders/custom-webpack.
 *
 * The only thing we add here is historyApiFallback so the webpack dev-server
 * serves index.html for every path that doesn't match a real file or /api.
 * This fixes "Cannot GET /path" on browser refresh during local development.
 *
 * Production (nginx / Firebase) already handles this natively.
 */
module.exports = {
  devServer: {
    historyApiFallback: {
      // Forward everything EXCEPT /api/* to index.html
      rewrites: [
        { from: /^\/api\//, to: '/api/' },
      ],
      index: '/index.html',
    },
  },
};

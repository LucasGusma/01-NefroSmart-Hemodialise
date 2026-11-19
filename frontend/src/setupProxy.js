const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function configureApiProxy(app) {
  app.use(createProxyMiddleware('/api', {
    target: 'http://127.0.0.1:5000',
    changeOrigin: true,
    proxyTimeout: 20000,
    onError(error, request, response) {
      response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: 'API local indisponível. Inicie o site pelo arquivo ABRIR-SITE.cmd.' }));
    },
  }));
};

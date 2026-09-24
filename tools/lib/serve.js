// 本地静态服务器：浏览器预览、试玩脚本、截图脚本共用。
// 直接运行：node tools/lib/serve.js [端口]，默认 8080，打开 http://localhost:8080/ 即 preview.html。
const http = require('http');
const path = require('path');
const fs = require('fs');

const root = path.resolve(__dirname, '..', '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ttf': 'font/ttf', '.woff2': 'font/woff2'
};

function serve(port) {
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]);
    if (u === '/') u = '/preview.html';
    const f = path.join(root, u);
    if (!f.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); res.end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise(resolve => server.listen(port || 0, () => resolve(server)));
}

// 统一的无头 Chromium 启动参数：用软件 WebGL，保证 CI 与本地截图一致。
const CHROMIUM_ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

module.exports = { serve, root, CHROMIUM_ARGS };

if (require.main === module) {
  serve(+process.argv[2] || 8080).then(s => console.log(`预览：http://localhost:${s.address().port}/`));
}

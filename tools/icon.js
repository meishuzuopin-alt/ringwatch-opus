// 生成安装包图标：node tools/icon.js → build/icon.ico（Windows）、build/icon.png（Linux / macOS）
// 图标由 desktop/icon.js 用代码画出来，build/ 不入库，每次打包前重新生成。
const fs = require('fs');
const path = require('path');
const icon = require('../desktop/icon.js');

const out = path.resolve(__dirname, '..', 'build');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'icon.ico'), icon.ico([256, 128, 64, 48, 32, 16]));
fs.writeFileSync(path.join(out, 'icon.png'), icon.png(1024));
console.log('图标 → build/icon.ico、build/icon.png');

// 游戏里会显示的字：js/ 和 preview.html 里去掉注释后的所有非 ASCII 字符，加上全部可打印 ASCII。
// tools/fonts.js（生成字体子集）和 tools/check.js（缺字检查）共用，保证口径一致。
const fs = require('fs');
const path = require('path');

// 去掉 /* */ 块注释和行尾 // 注释（// 前面是行首或空白才算，避开字符串里的网址）
// Windows 上 core.autocrlf=true 会把源码检出成 CRLF。按 \n 切开后行尾还留着 \r，
// 而 JS 的 . 不匹配 \r、$ 也不认单独的行尾 \r，行注释就剥不掉，注释里的字会被当成缺字。
function stripComments(src) {
  src = String(src).replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  return src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map(l => l.replace(/(^|\s)\/\/[^\n]*/, '$1')).join('\n');
}
function usedChars(root) {
  const set = new Set();
  for (let c = 0x20; c < 0x7f; c++) set.add(String.fromCharCode(c));
  const files = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).map(f => path.join(root, 'js', f));
  files.push(path.join(root, 'preview.html'));
  for (const f of files) for (const ch of stripComments(fs.readFileSync(f, 'utf8'))) if (ch.codePointAt(0) > 0x7f && !/\s/.test(ch)) set.add(ch);
  return [...set].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join('');
}
module.exports = { usedChars, stripComments };

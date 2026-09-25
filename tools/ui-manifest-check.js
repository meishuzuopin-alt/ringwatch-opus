#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var root = path.resolve(__dirname, '..');
var file = path.join(root, 'assets/ui/manifest.json');
var data = JSON.parse(fs.readFileSync(file, 'utf8'));
var allowed = Object.keys(data.palette).map(function(k){ return data.palette[k].toUpperCase(); });
var expectedCounts = {
  'title-nav': 5, heroes: 10, maps: 4, danger: 6, mutators: 8, hud: 6,
  weapons: 11, skills: 14, upgrades: 37, blessings: 24, 'flame-forms': 3,
  towers: 4, barracks: 3, settings: 4, keys: 4, results: 3,
  achievements: 42, guide: 3, stats: 35
};
var errors = [];
var seen = {};
var counts = {};
data.icons.forEach(function(icon){
  if (seen[icon.id]) errors.push('重复 ID：'+icon.id);
  seen[icon.id] = true;
  counts[icon.category] = (counts[icon.category] || 0) + 1;
  [16,24,32,48].forEach(function(size){
    var rel = icon.files[size];
    if (!rel || !fs.existsSync(path.join(root, rel))) errors.push(icon.id+' 缺少 '+size+'px');
  });
  if (icon.states.length !== 8) errors.push(icon.id+' 状态声明不完整');
});
Object.keys(expectedCounts).forEach(function(k){
  if (counts[k] !== expectedCounts[k]) errors.push(k+' 数量 '+(counts[k]||0)+' / '+expectedCounts[k]);
});
if (data.icons.length !== 226) errors.push('覆盖率 '+data.icons.length+' / 226');
data.kit.forEach(function(item){
  if (!fs.existsSync(path.join(root,item.file))) errors.push('套件文件缺失：'+item.id);
});
data.icons.concat(data.kit).forEach(function(item){
  var files = item.files ? Object.keys(item.files).map(function(k){return item.files[k];}) : [item.file];
  files.forEach(function(rel){
    var text = fs.readFileSync(path.join(root,rel),'utf8');
    (text.match(/#[0-9A-Fa-f]{6}/g)||[]).forEach(function(hex){
      if (allowed.indexOf(hex.toUpperCase()) < 0) errors.push(rel+' 使用色表外颜色 '+hex);
    });
    if (/linearGradient|radialGradient|feGaussianBlur|filter=/.test(text)) errors.push(rel+' 使用禁用的渐变／外发光');
    if (/\brx=|\bry=/.test(text)) errors.push(rel+' 使用禁用的圆角矩形');
  });
});
if (errors.length){ console.error(errors.join('\n')); process.exit(1); }
console.log('UI manifest：226 / 226；904 个尺寸文件存在；32 个套件存在；色表与去贴纸化规则通过');

#!/usr/bin/env node
'use strict';

/* 关键 16px 剪影、语义亮度和文字对比度的离线量化验收。 */
var points={
  'holy-fire':'8,1 10,6 13,5 14,11 11,15 5,15 2,11 5,6 6,9', health:'2,5 5,3 8,6 11,3 14,5 13,10 8,15 3,10',
  mana:'8,1 14,7 12,13 8,16 3,13 1,7', coin:'5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5',
  attack:'1,13 4,15 8,11 6,9 14,1 15,2 8,10 6,8', armor:'4,2 8,1 12,2 13,7 11,12 8,15 5,12 3,7',
  critical:'1,6 6,6 5,1 9,5 13,2 11,7 16,9 11,11 12,16 8,12 4,15 5,10 0,9', speed:'1,3 9,2 6,6 15,6 10,10 15,11 5,15 7,10 1,11 4,7',
  sentry:'5,15 6,7 7,6 7,2 9,4 10,1 11,5 13,4 12,7 13,8 12,15', 'boss-skull':'0,5 3,1 6,4 8,1 10,4 13,1 16,5 14,8 11,9 12,15 9,12 7,16 5,12 3,15 4,9 1,8',
  chest:'1,9 4,6 12,6 15,9 14,15 2,15', settings:'6,0 10,0 10,5 16,5 16,10 11,10 11,16 6,16 6,11 0,11 0,6 5,6'
};
function poly(s){return s.split(' ').map(function(p){return p.split(',').map(Number);});}
function inside(x,y,p){var yes=false,j=p.length-1;for(var i=0;i<p.length;j=i++){if(((p[i][1]>y)!==(p[j][1]>y))&&(x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))yes=!yes;}return yes;}
function mask(s){var p=poly(s),m=[];for(var y=0;y<16;y++)for(var x=0;x<16;x++)if(inside(x+.5,y+.5,p))m.push(y*16+x);return m;}
var keys=Object.keys(points), max={v:0,a:'',b:''};
for(var i=0;i<keys.length;i++)for(var j=i+1;j<keys.length;j++){var a=mask(points[keys[i]]),b=mask(points[keys[j]]),sa=new Set(a),inter=b.filter(function(x){return sa.has(x);}).length,u=new Set(a.concat(b)).size,v=inter/u;if(v>max.v)max={v:v,a:keys[i],b:keys[j]};}
function lum(hex){var v=[1,3,5].map(function(i){var c=parseInt(hex.slice(i,i+2),16)/255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4);});return .2126*v[0]+.7152*v[1]+.0722*v[2];}
function ratio(a,b){var x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
var flame='#FFB547', earth='#C9A27A', night='#1E2A4A', pale='#D2C8B4';
var warmRatio=lum(earth)/lum(flame), textRatio=ratio(pale,night), panelLuma=Math.round(lum(night)*255);
console.log('关键剪影最大 IoU：'+max.v.toFixed(3)+' ('+max.a+' / '+max.b+')，门槛 ≤ 0.700');
console.log('黄铜／圣火相对亮度：'+warmRatio.toFixed(3)+'，门槛 ≤ 0.800');
console.log('正文／夜蓝对比度：'+textRatio.toFixed(2)+':1，门槛 ≥ 4.50:1');
console.log('HUD 夜蓝相对亮度：'+panelLuma+'/255，门槛 ≤ 50/255');
if(max.v>.7||warmRatio>.8||textRatio<4.5||panelLuma>50)process.exit(1);

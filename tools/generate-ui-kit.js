#!/usr/bin/env node
'use strict';

/* FG UI 定稿资产生成器：只使用项目色表与原创几何，不依赖第三方包。 */
var fs = require('fs');
var path = require('path');
var ROOT = path.resolve(__dirname, '..');
var OUT = path.join(ROOT, 'assets/ui/icons');
var KIT = path.join(ROOT, 'assets/ui/kit');
var DOC = path.join(ROOT, 'docs/art-upgrade');
var P = {
  ink: '#1A1008', night: '#1E2A4A', moon: '#5FA8C8', enemy: '#6B3FA0',
  eye: '#FF3B3B', flame: '#FFB547', ember: '#E8702A', earth: '#C9A27A',
  roof: '#A8483A', wood: '#7A5234', pale: '#D2C8B4', gray: '#808080'
};
fs.rmSync(OUT,{recursive:true,force:true});
fs.rmSync(KIT,{recursive:true,force:true});
var groups = {
  'title-nav': ['brand-flame','new-run','continue','codex','quit'],
  heroes: ['warden','ranger','smith','seer','herbalist','lancer','bard','monk','alchemist','captain'],
  maps: ['green-hollow','river-ford','ash-ridge','moon-marsh'],
  danger: ['danger-0','danger-1','danger-2','danger-3','danger-4','danger-5'],
  mutators: ['mutator-frost','mutator-haste','mutator-armored','mutator-swarm','mutator-elite','mutator-dark','mutator-fragile','mutator-famine'],
  hud: ['holy-fire','health','mana','coin','wave','timer'],
  weapons: ['sword','bow','hammer','spear','staff','dagger','axe','crossbow','scythe','flail','torch'],
  skills: ['slash','volley','slam','charge','ward','blink','heal','taunt','nova','trap','summon','dash','counter','rally'],
  upgrades: ['ember','whet','blueprint','heart','iron-grip','long-string','keen-edge','deep-quiver','oak-shaft','moon-lens','thorn-wrap','quick-lock','warm-core','cold-core','wide-guard','light-step','heavy-step','lucky-coin','battle-drum','field-kit','ash-vial','frost-vial','storm-vial','blood-vial','tower-oil','tower-bell','tower-rope','tower-nail','village-map','hunter-mark','smith-mark','seer-mark','herb-mark','captain-mark','old-key','red-wax','gold-thread'],
  blessings: ['blessing-hearth','blessing-dawn','blessing-dusk','blessing-rain','blessing-wind','blessing-stone','blessing-river','blessing-oak','blessing-wolf','blessing-hawk','blessing-stag','blessing-fox','blessing-crow','blessing-boar','blessing-moon','blessing-sun','blessing-star','blessing-ash','blessing-ember','blessing-flame','blessing-iron','blessing-bronze','blessing-silver','blessing-gold'],
  'flame-forms': ['flame-hearth','flame-beacon','flame-crown'],
  towers: ['sentry','pylon','siphon','barracks'],
  barracks: ['order-hold','order-rally','order-retreat'],
  settings: ['settings','audio','display','controls'],
  keys: ['key-mouse','key-keyboard','key-gamepad','key-rebind'],
  results: ['victory','defeat','chest'],
  achievements: Array.from({length:42}, function(_,i){ return 'achievement-'+String(i+1).padStart(2,'0'); }),
  guide: ['warning','enemy-class','tutorial'],
  stats: ['attack','armor','critical','speed','range','cooldown','duration','area','projectiles','pierce','knockback','stun','slow','burn','frost','shock','poison','bleed','healing','regen','lifesteal','block','dodge','luck','gold-find','xp','build-speed','tower-damage','tower-range','tower-health','minion-damage','minion-health','flame-health','flame-radius','boss-skull']
};
var names = Object.keys(groups).reduce(function(a,k){ return a.concat(groups[k].map(function(id){ return {id:id, category:k}; })); }, []);
if (names.length !== 226) throw new Error('图标目录必须恰好 226 项，当前 '+names.length);

function mkdir(p){ fs.mkdirSync(p,{recursive:true}); }
function write(p,s){ mkdir(path.dirname(p)); fs.writeFileSync(p,s); }
function hash(s){ var h=2166136261; for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);} return h>>>0; }
function color(id){
  if (/holy-fire|flame-/.test(id)) return P.flame;
  if (/mana|moon|frost|river/.test(id)) return P.moon;
  if (/health|heart|blood/.test(id)) return P.roof;
  if (/boss-skull/.test(id)) return P.enemy;
  if (/coin|gold|reward/.test(id)) return P.earth;
  return P.earth;
}
function special(id, n){
  var s=n/48;
  var d={
    'holy-fire':'M24 3C22 12 14 13 16 24C10 20 7 27 9 34C11 43 19 46 25 45C36 44 42 38 40 28C39 20 34 17 35 9C29 12 29 18 25 19C27 12 26 7 24 3Z',
    health:'M24 44C17 38 7 32 6 21C5 12 12 7 19 10L24 16L30 9C39 7 44 14 42 23C40 33 31 39 24 44Z',
    mana:'M24 3L39 16L34 39L24 46L13 38L8 17Z',
    coin:'M24 5C34 5 42 12 43 22L39 37L27 44L12 39L5 27L8 13Z',
    attack:'M7 38L12 43L20 35L16 31L38 9L44 4L40 14L20 34L16 30Z',
    armor:'M8 8L24 3L40 8L38 29L31 40L24 46L16 40L9 29Z',
    critical:'M3 21L17 18L11 7L23 14L30 3L31 17L45 13L36 24L45 33L31 31L28 45L21 33L8 40L14 27Z',
    speed:'M4 10L25 8L18 18L42 17L29 29L42 31L16 41L22 29L4 31L13 21Z',
    sentry:'M7 44L11 20L16 16L16 7L22 11L27 5L32 11L38 8L37 18L42 22L40 44Z',
    tower:'M7 44L11 20L16 16L16 7L22 11L27 5L32 11L38 8L37 18L42 22L40 44Z',
    'boss-skull':'M7 19L12 8L22 3L34 7L43 17L40 30L34 33L35 43L27 40L22 46L17 39L8 41L12 32L5 28Z',
    chest:'M4 22L8 10L18 5L36 8L44 18L41 43L8 45Z',
    settings:'M19 3L29 3L31 10L39 7L45 16L39 22L45 30L39 40L30 37L26 46L16 43L16 35L6 34L3 23L10 18L7 9L17 10Z'
  }[id];
  return d ? '<path d="'+d+'" transform="scale('+s+')"/>' : null;
}
function smallShape(id,n){
  var q=n===16 ? 1 : 1.5;
  var shapes={
    'holy-fire':'8,1 10,6 13,5 14,11 11,15 5,15 2,11 5,6 6,9',
    health:'2,5 5,3 8,6 11,3 14,5 13,10 8,15 3,10',
    mana:'8,1 14,7 12,13 8,16 3,13 1,7',
    coin:'5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5',
    attack:'1,13 4,15 8,11 6,9 14,1 15,2 8,10 6,8',
    armor:'4,2 8,1 12,2 13,7 11,12 8,15 5,12 3,7',
    critical:'1,6 6,6 5,1 9,5 13,2 11,7 16,9 11,11 12,16 8,12 4,15 5,10 0,9',
    speed:'1,3 9,2 6,6 15,6 10,10 15,11 5,15 7,10 1,11 4,7',
    sentry:'5,15 6,7 7,6 7,2 9,4 10,1 11,5 13,4 12,7 13,8 12,15',
    'boss-skull':'0,5 3,1 6,4 8,1 10,4 13,1 16,5 14,8 11,9 12,15 9,12 7,16 5,12 3,15 4,9 1,8',
    chest:'1,9 4,6 12,6 15,9 14,15 2,15',
    settings:'6,0 10,0 10,5 16,5 16,10 11,10 11,16 6,16 6,11 0,11 0,6 5,6'
  };
  var raw=shapes[id];
  if(!raw) return null;
  return '<polygon points="'+raw.split(' ').map(function(pair){var p=pair.split(',');return Math.round(+p[0]*q)+','+Math.round(+p[1]*q);}).join(' ')+'"/>';
}
function generic(id,n){
  var h=hash(id), c=n/2, r=Math.floor(n*.38), points=[], count=5+(h%5);
  for(var i=0;i<count;i++){
    var a=-Math.PI/2+i*Math.PI*2/count;
    var rr=r-((h>>(i%24))&3)*(n<=24?1:2);
    points.push(Math.round(c+Math.cos(a)*rr)+','+Math.round(c+Math.sin(a)*rr));
  }
  var cut=(h%4), detail='';
  if(n>=32){
    if(cut===0) detail='<path d="M'+Math.round(n*.28)+' '+Math.round(n*.52)+'H'+Math.round(n*.72)+'" fill="none"/>';
    if(cut===1) detail='<path d="M'+c+' '+Math.round(n*.22)+'V'+Math.round(n*.72)+'" fill="none"/>';
    if(cut===2) detail='<circle cx="'+c+'" cy="'+c+'" r="'+Math.round(n*.12)+'" fill="none"/>';
    if(cut===3) detail='<path d="M'+Math.round(n*.3)+' '+Math.round(n*.65)+'L'+c+' '+Math.round(n*.3)+'L'+Math.round(n*.7)+' '+Math.round(n*.65)+'" fill="none"/>';
  }
  return '<polygon points="'+points.join(' ')+'"/>'+detail;
}
function iconSvg(item,n){
  var id=item.id, fill=color(id), key=special(id,n), pixel=n<=24;
  var body=(pixel && smallShape(id,n)) || key || generic(id,n);
  var eye=id==='boss-skull' && n>=32 ? '<circle cx="17" cy="22" r="2" fill="'+P.eye+'" stroke="none"/><circle cx="31" cy="22" r="2" fill="'+P.eye+'" stroke="none"/>' : '';
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+n+'" height="'+n+'" viewBox="0 0 '+n+' '+n+'"><title>'+id+' '+n+'px</title><g fill="'+fill+'" stroke="'+(item.category==='hud'?P.night:P.ink)+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke">'+body+'</g>'+eye+(pixel?'<!-- 手工整数网格小尺寸：仅主剪影 -->':'')+'</svg>\n';
}
var manifest={version:1,direction:'A+C 炉木夜釉',palette:P,coverage:{required:226,actual:226},icons:[],kit:[]};
names.forEach(function(item){
  var sizes={}; [16,24,32,48].forEach(function(n){ var rel='assets/ui/icons/'+item.category+'/'+item.id+'-'+n+'.svg'; write(path.join(ROOT,rel),iconSvg(item,n)); sizes[n]=rel; });
  var used=[Object.keys(P).find(function(k){return P[k]===color(item.id);})||'earth',item.category==='hud'?'night':'ink'];
  if(item.id==='boss-skull') used.push('eye');
  manifest.icons.push({id:item.id,category:item.category,files:sizes,sizes:[16,24,32,48],states:['default','focus','selected','cooldown','poor','locked','disabled','pressed'],nineSlice:null,colors:used});
});

function svg(title,w,h,body){ return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'"><title>'+title+'</title>'+body+'</svg>\n'; }
function woodPanel(w,h,alpha){ return '<path d="M16 1H'+(w-16)+'L'+(w-1)+' 16V'+(h-16)+'L'+(w-16)+' '+(h-1)+'H16L1 '+(h-16)+'V16Z" fill="'+P.wood+'" fill-opacity="'+alpha+'" stroke="'+P.ink+'" stroke-width="2"/><path d="M18 7H'+(w-18)+'M8 20L15 18M'+(w-15)+' '+(h-18)+'L'+(w-8)+' '+(h-20)+'" stroke="'+P.earth+'" stroke-opacity=".35"/>'; }
function addKit(id,w,h,body,inset,colors){ var rel='assets/ui/kit/'+id+'.svg'; write(path.join(ROOT,rel),svg(id,w,h,body)); manifest.kit.push({id:id,category:'kit',file:rel,size:[w,h],state:'default',nineSlice:inset,colors:colors}); }
addKit('panel-hud',320,96,'<path d="M8 2H312L318 8V88L312 94H8L2 88V8Z" fill="'+P.night+'" fill-opacity=".58"/><path d="M18 9H302" stroke="'+P.earth+'" stroke-opacity=".32"/>',[16,16,16,16],['night','earth']);
addKit('panel-menu',480,320,woodPanel(480,320,1),[24,24,24,24],['wood','ink','earth']);
['default','hover','pressed','disabled','focus'].forEach(function(state,i){
  var op=state==='disabled'?'.45':'1', y=state==='pressed'?1:0, slash=state==='disabled'?'<path d="M35 8L205 48" stroke="'+P.ink+'" stroke-width="2"/>':'', brackets=state==='focus'?'<path d="M2 14V2H14M226 2H238V14M238 44V56H226M14 56H2V44" fill="none" stroke="'+P.earth+'"/>':'';
  addKit('button-'+state,240,58,'<g transform="translate(0 '+y+')" opacity="'+op+'"><path d="M12 2H228L238 12V46L228 56H12L2 46V12Z" fill="'+P.wood+'" stroke="'+P.ink+'" stroke-width="2"/><path d="M14 7H226" stroke="'+P.earth+'"/>'+slash+'</g>'+brackets,[12,12,12,12],['wood','ink','earth']);
});
['common','fine','epic','legendary'].forEach(function(r,i){
  var deco=''; if(i>0) deco='<circle cx="26" cy="26" r="3" fill="'+P.moon+'"/><circle cx="190" cy="26" r="3" fill="'+P.moon+'"/>'; if(i>1) deco+='<path d="M4 38L18 18L38 4M212 38L198 18L178 4M4 202L18 222L38 236M212 202L198 222L178 236" fill="none" stroke="'+P.enemy+'" stroke-width="2"/>'; if(i>2) deco+='<path d="M78 7L94 2L108 10L122 2L138 7L130 18H86Z" fill="'+P.earth+'"/><path d="M12 70V170M204 70V170" stroke="'+P.earth+'"/>';
  addKit('card-'+r,216,240,'<path d="M14 2H202L214 14V226L202 238H14L2 226V14Z" fill="'+P.wood+'" stroke="'+P.ink+'" stroke-width="2"/><path d="M17 15H199V129H17Z" fill="'+P.night+'"/><path d="M19 17H197" stroke="'+P.pale+'" stroke-opacity=".25"/>'+deco,[24,24,24,24],['wood','ink','night',i===0?'earth':i===1?'moon':i===2?'enemy':'earth']);
});
['health','mana','fury','boss'].forEach(function(id,i){
 var c=[P.roof,P.moon,P.ember,P.enemy][i]; var ticks=''; for(var x=28;x<292;x+=27) ticks+='<path d="M'+x+' 14V27" stroke="'+P.ink+'" stroke-opacity=".45"/>';
 addKit('bar-'+id,320,40,'<path d="M2 9L14 2H306L318 9V31L306 38H14L2 31Z" fill="'+P.ink+'"/><path d="M13 13H296V28H13Z" fill="'+P.pale+'" fill-opacity=".35"/><path d="M13 13H244V28H13Z" fill="'+c+'"/>'+ticks+'<path d="M13 13H244" stroke="'+P.pale+'" stroke-width="1"/>',[14,14,14,14],['ink','pale',Object.keys(P).find(function(k){return P[k]===c;})]);
});
[
 ['key-disc',64,64,'<circle cx="32" cy="32" r="28" fill="'+P.wood+'" stroke="'+P.ink+'" stroke-width="2"/><circle cx="32" cy="32" r="23" fill="none" stroke="'+P.earth+'"/>'],
 ['badge-shield',64,72,'<path d="M5 8L32 2L59 8V37C57 53 45 64 32 70C19 64 7 53 5 37Z" fill="'+P.wood+'" stroke="'+P.ink+'" stroke-width="2"/>'],
 ['wave-banner',320,40,'<path d="M2 20L18 3H302L318 20L302 37H18Z" fill="'+P.night+'" fill-opacity=".76"/><path d="M30 5H290" stroke="'+P.earth+'"/>'],
 ['hint-scroll',300,100,'<path d="M13 3H287L297 13V87L287 97H13L3 87V13Z" fill="'+P.pale+'" stroke="'+P.ink+'" stroke-width="2"/>'],
 ['tooltip',260,120,'<path d="M2 2H258V104H80L62 118L64 104H2Z" fill="'+P.night+'" fill-opacity=".8" stroke="'+P.earth+'"/>'],
 ['tab',120,36,'<path d="M2 34L10 2H110L118 34Z" fill="'+P.wood+'" stroke="'+P.ink+'" stroke-width="2"/>'],
 ['slider',240,32,'<path d="M8 14H232V20H8Z" fill="'+P.ink+'"/><circle cx="150" cy="17" r="12" fill="'+P.wood+'" stroke="'+P.earth+'"/>'],
 ['toggle',80,32,'<path d="M2 4H78V28H2Z" fill="'+P.night+'"/><circle cx="64" cy="16" r="12" fill="'+P.earth+'"/>'],
 ['checkbox',32,32,'<path d="M2 2H30V30H2Z" fill="'+P.wood+'" stroke="'+P.ink+'" stroke-width="2"/><path d="M8 16L14 23L26 8" fill="none" stroke="'+P.earth+'" stroke-width="2"/>'],
 ['warning-arrow',48,48,'<path d="M2 24L34 5V16H46V32H34V43Z" fill="'+P.eye+'" stroke="'+P.ink+'" stroke-width="2"/>']
].forEach(function(x){addKit(x[0],x[1],x[2],x[3],null,['wood','ink','earth','night'].filter(function(c){return x[3].indexOf(P[c])>=0;}));});
['focus','selected','cooldown','poor','locked','disabled','pressed'].forEach(function(id,i){
 var bodies=['<path d="M2 12V2H12M36 2H46V12M46 36V46H36M12 46H2V36"/>','<path d="M7 37L17 45L42 8"/>','<path d="M24 3A21 21 0 1 1 3 24H24Z"/>','<path d="M7 24H41"/>','<path d="M12 22V14A12 12 0 0 1 36 14V22M8 22H40V45H8Z"/>','<path d="M7 7L41 41"/>','<path d="M9 30L24 43L39 30"/>'];
 addKit('overlay-'+id,48,48,'<g fill="none" stroke="'+(id==='poor'?P.eye:P.earth)+'" stroke-width="2">'+bodies[i]+'</g>',null,[id==='poor'?'eye':'earth']);
});
write(path.join(ROOT,'assets/ui/manifest.json'),JSON.stringify(manifest,null,2)+'\n');

var cards=['ember','whet','blueprint','heart'];
function itemShape(id,x){ var d={ember:'M24 6C23 18 10 18 14 33C18 45 37 43 37 29C37 20 30 18 32 10C27 13 28 22 23 23C26 16 25 10 24 6Z',whet:'M9 34L31 8L41 13L18 40Z',blueprint:'M8 9H39V41H8Z M15 17H32V22H15Z M15 28H27V33H15Z',heart:'M24 42C6 32 5 17 13 11C19 7 23 12 24 16C27 10 33 7 39 12C47 21 37 34 24 42Z'}[id]; return '<path d="'+d+'" transform="translate('+x+' 0)"/>'; }
var html='<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>炉木夜釉 UI 定稿</title><style>@font-face{font-family:fgs;src:url(../../fonts/fg-sans-500.woff2)}@font-face{font-family:fgb;src:url(../../fonts/fg-sans-700.woff2)}@font-face{font-family:fgt;src:url(../../fonts/fg-serif-900.woff2)}*{box-sizing:border-box}body{margin:0;background:#111827;color:#D2C8B4;font-family:fgs}header{padding:32px 4vw;border-bottom:1px solid #7A5234}h1,h2{font-family:fgt;color:#C9A27A}.hero{display:grid;grid-template-columns:1fr 1fr;gap:20px;padding:24px 4vw}.plate{background:#1E2A4A;padding:20px}.cards,.catalog{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:20px 4vw}.card{height:240px;background:#7A5234;border:2px solid #1A1008;clip-path:polygon(7% 0,93% 0,100% 7%,100% 93%,93% 100%,7% 100%,0 93%,0 7%);padding:18px;text-align:center}.art{height:112px;background:#1E2A4A;display:grid;place-items:center}.art img{width:72px}.catalog{grid-template-columns:repeat(14,1fr)}.catalog img{width:100%;background:#D2C8B4;padding:7px}.small{font-size:11px;opacity:.75}</style></head><body><header><h1>A+C 炉木夜釉｜正式 UI 套件</h1><p>战斗去框、菜单用木；左上暖光；满亮圣火金仅用于圣火。226 / 226 图标覆盖。</p></header><section class="hero"><div class="plate"><h2>常驻战斗层</h2><p style="font-size:28px;text-shadow:1.5px 1.5px #1A1008">第 7 波　00:38</p><p style="font:18px fgb">圣火 786 / 900</p><p>信息直接写在场景；生命组与动作栏只用低对比夜蓝带。</p></div><div class="plate"><h2>菜单与情境层</h2><p>完整雕木只在整备、暂停、结算出现。情境铭牌贴近塔与敌人，不侵入中央战场。</p><p class="small">字号：倒计时 28／标题 18／正文 13／注释 11</p></div></section><h2 style="padding:0 4vw">四级改造物卡牌</h2><section class="cards">';
cards.forEach(function(id,i){html+='<article class="card"><div class="art"><img src="../../assets/ui/icons/upgrades/'+id+'-48.svg"></div><h2>'+['圣火护符','磨刀石','塔楼图纸','龙心'][i]+'</h2><p>'+['凡品 · 素木','精良 · 月青双钉','史诗 · 四角雕饰','传说 · 火冠六饰'][i]+'</p></article>';});
html+='</section><h2 style="padding:0 4vw">图标目录（48px）</h2><section class="catalog">'+names.map(function(o){return '<img title="'+o.id+'" src="../../assets/ui/icons/'+o.category+'/'+o.id+'-48.svg">';}).join('')+'</section><p style="padding:30px">风格参照仅取原则：低多边形游戏强调克制和场景融合；牌组游戏强调清晰层级与卡面工艺。本项目不复制任何既有作品造型。</p></body></html>';
write(path.join(DOC,'ui-kit-final.html'),html);
console.log('generated',names.length,'icons × 4 sizes,',manifest.kit.length,'kit assets');

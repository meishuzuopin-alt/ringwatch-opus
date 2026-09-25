// 玩家之声：抓对标游戏（以后也包括我们自己）的 Steam 差评，按痛点主题计数。
// node tools/steam-voice.js [每个游戏最多几条] [语言，逗号分隔，默认 schinese,english]
// 需要能访问 store.steampowered.com（云端会话默认被网络策略拦截；在自己电脑上跑即可）。
// 输出：终端表格 + shots/voice/report.json（每个主题的计数与几条摘录，摘录只截前 140 字，供内部分析）。
const https = require('https');
const fs = require('fs');
const path = require('path');

// 对标游戏（appid 来自 Steam 商店地址）。上架后把我们自己的 appid 加进来，同一套流程读自己的差评。
const APPS = [
  { id: 1942280, name: '土豆兄弟 Brotato' },
  { id: 2239150, name: '王权陨落 Thronefall' },
  { id: 1794680, name: '吸血鬼幸存者 Vampire Survivors' },
  { id: 2218750, name: '苦痛殿堂 Halls of Torment' },
  { id: 1966900, name: '黎明前20分钟 20 Minutes Till Dawn' },
  { id: 2321470, name: '深岩银河：幸存者 DRG: Survivor' },
  { id: 2066020, name: '灵魂石幸存者 Soulstone Survivors' },
  { id: 701160, name: '王国两位君主 Kingdom Two Crowns' }
];

// 痛点主题：id 与 docs/PLAYER-VOICE.md 的条目一一对应
const THEMES = [
  ['rng', '商店 / 抽取太随机', /\b(rng|random|luck|shop|reroll)\b|随机|运气|看脸|刷不出|商店/i],
  ['clutter', '满屏特效看不清', /clutter|can'?t see|cannot see|visib|flash|particle|光污染|看不清|特效|闪瞎|眼花/i],
  ['perf', '卡顿 / 掉帧 / 闪退', /\blag\b|fps|frame ?rate|stutter|performance|crash|卡顿|掉帧|闪退|优化差/i],
  ['grind', '养成太肝 / 解锁太慢', /grind|unlock|progression|slow start|meta|肝|解锁|养成|刷材料/i],
  ['repetitive', '重复 / 内容少 / 太短', /repetitive|boring|same thing|content|too short|重复|无聊|内容少|太短|没内容/i],
  ['balance', '平衡差 / 流派没用', /balance|overpowered|\bop\b|useless|\bweak\b|melee|平衡|太强|太弱|没用|近战|超模/i],
  ['difficulty', '难度曲线 / 死得不明不白', /too hard|unfair|difficult|one.?shot|spike|cheap death|太难|不公平|秒杀|莫名其妙/i],
  ['controller', '手柄 / Steam Deck', /controller|gamepad|steam deck|\bdeck\b|手柄|掌机/i],
  ['save', '存档 / 丢进度', /\bsave|progress (was )?lost|lost (my )?progress|存档|丢档|进度没了/i],
  ['clarity', '说明看不懂', /tooltip|description|unclear|confusing|explain|说明|看不懂|不清楚|没解释/i],
  ['targeting', '自动瞄准 / 目标选择', /auto.?aim|manual aim|target|瞄准|打不到/i],
  ['monetization', '收费 / 内购', /microtransaction|pay to win|p2w|overpriced|\bdlc\b|氪|内购|割韭菜/i],
  ['localization', '翻译质量', /translation|locali[sz]ation|chinese|翻译|汉化|机翻/i],
  ['updates', '停更 / 不修 bug', /abandon|no updates|dead game|\bbug|glitch|停更|不更新|bug/i]
];

const max = +process.argv[2] || 300;
const langs = (process.argv[3] || 'schinese,english').split(',');
const outDir = path.resolve(__dirname, '..', 'shots', 'voice');

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'ringwatch-voice/1.0' } }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('返回的不是 JSON（状态 ' + res.statusCode + '）')); } });
    }).on('error', reject);
  });
}

async function reviewsOf(app, lang) {
  const out = [];
  let cursor = '*';
  while (out.length < max) {
    const url = `https://store.steampowered.com/appreviews/${app.id}?json=1&filter=all&language=${lang}&review_type=negative&purchase_type=all&num_per_page=100&cursor=${encodeURIComponent(cursor)}`;
    const j = await get(url);
    if (!j.success || !j.reviews || !j.reviews.length) break;
    for (const r of j.reviews) out.push({ text: r.review || '', hours: Math.round((r.author && r.author.playtime_at_review || 0) / 60) });
    if (!j.cursor || j.cursor === cursor) break;
    cursor = j.cursor;
  }
  return out.slice(0, max);
}

(async () => {
  const report = { at: new Date().toISOString(), max, langs, games: [] };
  const total = {};
  for (const app of APPS) {
    const g = { id: app.id, name: app.name, n: 0, themes: {} };
    for (const lang of langs) {
      let list;
      try { list = await reviewsOf(app, lang); }
      catch (e) {
        console.error(`读不到 ${app.name}（${lang}）：${e.message}`);
        console.error('如果是云端会话，需要在环境的网络设置里允许 store.steampowered.com。');
        process.exitCode = 1;
        continue;
      }
      for (const r of list) {
        g.n++;
        for (const [id, , re] of THEMES) {
          if (!re.test(r.text)) continue;
          const t = g.themes[id] || (g.themes[id] = { n: 0, samples: [] });
          t.n++;
          if (t.samples.length < 5) t.samples.push(r.text.replace(/\s+/g, ' ').slice(0, 140) + '（' + r.hours + ' 小时）');
          total[id] = (total[id] || 0) + 1;
        }
      }
    }
    report.games.push(g);
    const top = Object.entries(g.themes).sort((a, b) => b[1].n - a[1].n).slice(0, 6)
      .map(([id, t]) => THEMES.find(x => x[0] === id)[1] + ' ' + Math.round(100 * t.n / Math.max(1, g.n)) + '%').join('，');
    console.log(`${app.name}：${g.n} 条差评　${top}`);
  }
  const all = report.games.reduce((a, g) => a + g.n, 0);
  console.log('\n全部差评 ' + all + ' 条，各痛点被提到的比例：');
  for (const [id, label] of THEMES.slice().sort((a, b) => (total[b[0]] || 0) - (total[a[0]] || 0))) {
    console.log('  ' + (label + '　　　　　　　　').slice(0, 12) + ' ' + String(total[id] || 0).padStart(5) + '  ' + Math.round(100 * (total[id] || 0) / Math.max(1, all)) + '%');
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n明细：' + path.join(outDir, 'report.json') + '　对照 docs/PLAYER-VOICE.md 逐条检查');
})();

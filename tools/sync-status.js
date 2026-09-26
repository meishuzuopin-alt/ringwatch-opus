// 汇总三方进度：node tools/sync-status.js [集成分支]
// 拉取所有远端分支，列出每个分支相对集成分支多出的提交、改动的文件，
// 并标出多个分支同时改动的文件（合并时最可能冲突），供全面优化前对账。
const { execSync } = require('child_process');
const sh = cmd => execSync(cmd, { encoding: 'utf8' }).trim();

const base = process.argv[2] || 'origin/claude/gift-card-balance-usage-4coauk';
sh('git fetch --all --prune --quiet');
const branches = sh("git branch -r --format='%(refname:short)'").split('\n')
  .filter(b => b && !b.endsWith('/HEAD') && b !== base);

const touched = {};   // 文件 -> [分支]
// 各组能改的文件（AGENTS.md「Grok 与 GPT 的边界」）；越界的单独报出来
const SCOPE = { Grok: ['js/data.js', 'docs/AUDIT.md'], GPT: ['js/ui.js', 'docs/STEAM.md'] };
const outOfScope = [];
console.log(`集成基线：${base}  (${sh(`git log -1 --format=%h·%cr ${base}`)})\n`);
for (const b of branches) {
  const ahead = sh(`git rev-list --count ${base}..${b}`), behind = sh(`git rev-list --count ${b}..${base}`);
  const who = b.includes('/codex/') ? 'Codex' : b.includes('/grok/') ? 'Grok' : b.includes('/gpt/') ? 'GPT' : b.includes('/cursor/') ? 'Cursor' : b.includes('/claude/') ? 'Claude' : (b.endsWith('/main') ? 'main' : '其他');
  console.log(`■ ${b}  [${who}]  领先 ${ahead} · 落后 ${behind} · 最后提交 ${sh(`git log -1 --format=%cr ${b}`)}`);
  if (+ahead === 0) { console.log('    （已全部包含在基线里）\n'); continue; }
  console.log(sh(`git log --format="%h %s" ${base}..${b}`).split('\n').map(l => '    ' + l).join('\n'));
  const files = sh(`git diff --name-only ${base}...${b}`).split('\n').filter(Boolean);
  for (const f of files) (touched[f] = touched[f] || []).push(b.replace('origin/', ''));
  console.log('    改动文件：' + (files.join('、') || '无') + '\n');
  if (SCOPE[who]) { const bad = files.filter(f => !SCOPE[who].includes(f)); if (bad.length) outOfScope.push(`${b.replace('origin/', '')}（${who}）：${bad.join('、')}`); }
}
const hot = Object.entries(touched).filter(([, bs]) => bs.length > 1);
console.log(hot.length ? '⚠ 多个分支都改了的文件（合并时重点看）：' : '没有多个分支同时改动的文件。');
for (const [f, bs] of hot) console.log(`    ${f}：${bs.join('、')}`);
if (outOfScope.length) { console.log('\n⚠ 改了自己范围以外的文件（Grok 只改 js/data.js、docs/AUDIT.md；GPT 只改 js/ui.js、docs/STEAM.md）：'); for (const l of outOfScope) console.log('    ' + l); }
console.log('\n注意：只能看到已推送到 GitHub 的提交。本地未提交 / 未推送的改动在这里看不到。');

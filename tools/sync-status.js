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
}
const hot = Object.entries(touched).filter(([, bs]) => bs.length > 1);
console.log(hot.length ? '⚠ 多个分支都改了的文件（合并时重点看）：' : '没有多个分支同时改动的文件。');
for (const [f, bs] of hot) console.log(`    ${f}：${bs.join('、')}`);
console.log('\n注意：只能看到已推送到 GitHub 的提交。本地未提交 / 未推送的改动在这里看不到。');

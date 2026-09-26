// 圣火守护者 · Steam 桌面版外壳（Electron 主进程）
// 游戏本体就是 preview.html + js/ + vendor/，这里只负责开窗口、全屏切换、退出和存档位置。
const { app, BrowserWindow, ipcMain, Menu, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
// 测试用：--smoke 启动后截一张图就退出（CI / 云端环境验证桌面版能跑）
const SMOKE = process.argv.includes('--smoke');

app.setName('FlameGuardian');
// 存档目录沿用改名前的 Ringwatch，老玩家的进度不丢（Windows：%APPDATA%/Ringwatch/saves）
app.setPath('userData', path.join(app.getPath('appData'), 'Ringwatch'));
// 冒烟测试时通常没有显卡：用软件 WebGL（真实玩家的机器走显卡，不受影响）
if (SMOKE) { app.commandLine.appendSwitch('use-angle', 'swiftshader'); app.commandLine.appendSwitch('enable-unsafe-swiftshader'); }
Menu.setApplicationMenu(null);   // 游戏不需要菜单栏
// 游戏不联网：跳过系统代理自动探测（WPAD 会去解析网络名，某些 Windows 网络环境下能卡十几秒，
// 真机验收 GROK-FG-001 的日志里有 WSALookupServiceBegin 10108），也关掉后台联网
app.commandLine.appendSwitch('no-proxy-server');
app.commandLine.appendSwitch('disable-background-networking');

// 启动计时：每一步距进程启动多少毫秒，写到 <用户数据目录>/startup.log，真机上排查启动慢用
const bootLog = [];
function mark(what) {
  bootLog.push(Math.round(process.uptime() * 1000) + 'ms  ' + what);
  try { fs.writeFileSync(path.join(app.getPath('userData'), 'startup.log'), bootLog.join('\n') + '\n'); } catch (err) { /* 目录还没建好时下一次再写 */ }
}
mark('主进程开始（Electron ' + process.versions.electron + '，' + process.platform + ' ' + process.arch + '）');

const TITLE = '圣火守护者 Flame Guardian';

// 显示窗口并抢到前台（Windows 第一次启动时，新窗口常被压在启动它的窗口后面）
function present(win) {
  if (win.isDestroyed() || win.isVisible()) return;
  win.show();
  if (process.platform === 'win32') { win.setAlwaysOnTop(true); win.focus(); win.setAlwaysOnTop(false); }
  app.focus({ steal: true });
  win.focus();
  mark('窗口显示');
}

function createWindow() {
  mark('app ready');
  // 关掉拼写检查：否则启动时会去 redirector.gvt1.com 下载英文词典（断网 / 慢网时拖慢启动）
  try { session.defaultSession.setSpellCheckerEnabled(false); session.defaultSession.setSpellCheckerLanguages([]); } catch (err) { /* macOS 用系统拼写检查，不下载词典 */ }
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 960, minHeight: 540,
    backgroundColor: '#06070c', show: false, title: TITLE,
    icon: nativeImage.createFromBuffer(require('./icon.js').png(256)),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false,
      spellcheck: false   // 游戏没有输入框；拼写检查会在启动时联网下载词典
    }
  });
  mark('窗口创建');
  // 窗口标题固定用游戏名，不让网页标题（浏览器预览用的）盖掉
  win.on('page-title-updated', e => e.preventDefault());
  win.webContents.once('dom-ready', () => mark('页面 DOM 就绪'));
  win.webContents.once('did-finish-load', () => mark('页面加载完成'));
  win.loadFile(path.join(ROOT, 'preview.html'));
  // 画面准备好就显示；最多等 3 秒，免得页面加载慢时玩家以为没启动
  win.once('ready-to-show', () => { mark('ready-to-show'); present(win); });
  setTimeout(() => present(win), 3000);
  // F11 / Alt+Enter 切换全屏（游戏里没有按键冲突）
  win.webContents.on('before-input-event', (e, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11' || (input.alt && input.key === 'Enter')) { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); }
  });
  if (SMOKE) {
    win.webContents.on('console-message', (e) => { const m = e.message || ''; if (/error/i.test(m)) console.log('console:', m); });
    win.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const st = await win.webContents.executeJavaScript('RW.Plat.save("smoke_test", { t: 1 }); ({ game: !!(window.RW && RW.game), gl3d: !!(window.RW && RW.Plat.gl3d), desktop: !!window.desktop, save: !!(RW.Plat.load("smoke_test", null) || {}).t })');
        const ok = st.game && st.gl3d && st.desktop && st.save;
        const img = await win.webContents.capturePage();
        require('fs').writeFileSync(process.env.SMOKE_SHOT || path.join(ROOT, 'shots', 'desktop-smoke.png'), img.toPNG());
        console.log('desktop smoke:', JSON.stringify(st));
        app.exit(ok ? 0 : 1);
      }, 2500);
    });
  }
  return win;
}

// ---------- 存档：一个 key 一个 JSON 文件，先写临时文件再改名，避免写一半断电损坏 ----------
function saveFile(key) { return path.join(app.getPath('userData'), 'saves', String(key).replace(/[^\w-]/g, '_') + '.json'); }
// 读档：主文件坏了（断电、磁盘满）就用上一份备份，不让玩家丢进度
function readValid(f) { try { const t = fs.readFileSync(f, 'utf8'); JSON.parse(t); return t; } catch (err) { return null; } }
ipcMain.on('desktop:load', (e, key) => {
  const f = saveFile(key);
  e.returnValue = readValid(f) || readValid(f + '.bak');
});
// 写档：先写临时文件再改名（原子替换），旧档留一份 .bak
ipcMain.on('desktop:save', (e, key, text) => {
  try {
    const f = saveFile(key);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f + '.tmp', text);
    if (readValid(f)) fs.copyFileSync(f, f + '.bak');
    fs.renameSync(f + '.tmp', f);
  } catch (err) { console.error('存档失败', err); }
});

ipcMain.on('desktop:quit', () => app.quit());
ipcMain.on('desktop:fullscreen', (e) => {
  const w = BrowserWindow.fromWebContents(e.sender);
  if (w) w.setFullScreen(!w.isFullScreen());
});

app.whenReady().then(createWindow);
// 页面第一帧画出来时由预加载脚本报一声，记进启动计时
ipcMain.on('desktop:boot', (e, what) => mark(String(what).slice(0, 60)));
app.on('window-all-closed', () => app.quit());

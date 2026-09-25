// 环带值守 · Steam 桌面版外壳（Electron 主进程）
// 游戏本体就是 preview.html + js/ + vendor/，这里只负责开窗口、全屏切换、退出和存档位置。
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// 测试用：--smoke 启动后截一张图就退出（CI / 云端环境验证桌面版能跑）
const SMOKE = process.argv.includes('--smoke');

app.setName('Ringwatch');
// 冒烟测试时通常没有显卡：用软件 WebGL（真实玩家的机器走显卡，不受影响）
if (SMOKE) { app.commandLine.appendSwitch('use-angle', 'swiftshader'); app.commandLine.appendSwitch('enable-unsafe-swiftshader'); }
Menu.setApplicationMenu(null);   // 游戏不需要菜单栏

function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 720, minWidth: 960, minHeight: 540,
    backgroundColor: '#06070c', show: false, title: '环带值守 Ringwatch',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      backgroundThrottling: false
    }
  });
  win.loadFile(path.join(ROOT, 'preview.html'));
  win.once('ready-to-show', () => win.show());
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
const fs = require('fs');
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
app.on('window-all-closed', () => app.quit());

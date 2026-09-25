// 桌面版预加载：只向页面暴露两个安全的动作（退出、切换全屏），页面拿不到 Node 能力
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('desktop', {
  quit: () => ipcRenderer.send('desktop:quit'),
  toggleFullscreen: () => ipcRenderer.send('desktop:fullscreen'),
  // 存档：同步读写 <用户数据目录>/saves/<key>.json（Windows 在 %APPDATA%/Ringwatch/saves，改名前后同一个目录）
  load: (key) => ipcRenderer.sendSync('desktop:load', key),
  save: (key, text) => ipcRenderer.send('desktop:save', key, text)
});

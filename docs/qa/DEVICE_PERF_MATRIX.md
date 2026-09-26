# 设备与性能矩阵

> 版本 v1 · 2026-09-26 · 作者：游戏测试 · 来源：PR #21 `docs/DESIGN_BIBLE_v1.md` §8 M0 #2（M1 #1 的 Capacitor 包同表复用）

## 1. 设备档位与目标

| 档位 | 最低规格（下限） | 运行形态 | p95 目标 |
|---|---|---|---|
| Windows 中端笔记本 | 4 核 CPU（i5-1135G7 / Ryzen 5 5500U 级），核显 Iris Xe / Vega 7，16 GB，1080p，接电源 | Electron 桌面版（`npm run dist:win` 产物）+ Chrome 浏览器版 | ≤ 16.7 ms（§8） |
| Steam Deck（若有） | LCD 或 OLED 原机，SteamOS 稳定版，TDP 不限制，1280×800 | Linux 桌面版（`dist/linux-unpacked`） | ≤ 16.7 ms（**暂定，待制作人确认**） |
| 中端安卓 | 骁龙 7 系 / 天玑 7000 级，6 GB，Android 12+ | M0：Chrome 浏览器；M1：Capacitor 包 | ≤ 33 ms（§8） |
| iPhone | iPhone 12 / A14 级，iOS 17+ | M0：Safari；M1：Capacitor（WKWebView）TestFlight 包 | ≤ 33 ms（**暂定，待制作人确认**） |

## 2. 测试场景与采集

- 场景：`?seed=1&bench=150&perf&hifx`（钩子 H1/H2；`?hifx` 是现有参数，锁住画质不自动降级，见 `js/world3d.js`），3 分钟夜，150 敌同屏，英雄自动站桩。
- 预热 30 s 不计，之后连续采集 120 s；每台跑 3 次，取中间那次。
- 取数方式：

| 平台 | 主数据 | 旁证 |
|---|---|---|
| Windows | H1 输出的 JSON | Chrome DevTools Performance 录 10 s（Electron 用 `--remote-debugging-port`）；`startup.log` 已有启动计时 |
| Steam Deck | H1 JSON | Steam 性能叠加层第 3/4 级截图（帧时间曲线） |
| 安卓 | H1 JSON | USB 调试 + `chrome://inspect` → Performance；Capacitor 包需开 WebView 调试 |
| iPhone | H1 JSON | Mac Safari → 开发 → 设备 → Web 检查器 → 时间线 |

现有可复用：`tools/playtest.js` 已用 rAF 收 60 帧、只出平均 / 最大，可扩展为 p95；`tools/simtest.js` 的满屏每帧模拟 ≤ 4 ms 预算是 CPU 侧参考（软件渲染，不代表真机，见 `docs/AUDIT.md`）。

**需要代码侧提供的钩子**：H1 帧时间记录（p50/p95/p99/max JSON，含同屏敌数、画质档）；H2 固定种子 150 敌测试场景。

## 3. 证据命名与目录

```
qa-evidence/perf/<构建短哈希>/<设备档>/
  <日期>_<设备档>_<形态>_run<N>_perf.json
  <日期>_<设备档>_<形态>_run<N>_overlay.png   # 叠加层 / DevTools 截图
  <日期>_<设备档>_<形态>_run<N>_trace.json    # 可选
```
例：`20261010_win-mid_electron_run2_overlay.png`。设备档：`win-mid` / `deck` / `android-mid` / `iphone`；形态：`electron` / `chrome` / `safari` / `capacitor`。证据放共享盘，不进仓库。

## 4. 矩阵（只填实测，不估）

| 设备型号 | 档位 | 形态 | 分辨率 | p50 ms | p95 ms | p99 ms | max ms | 达标 | 构建哈希 | 日期 | 测试人 | 截图路径 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | win-mid | electron | | | | | | | | | | |
| | win-mid | chrome | | | | | | | | | | |
| | deck | electron | | | | | | | | | | |
| | android-mid | chrome | | | | | | | | | | |
| | android-mid | capacitor（M1） | | | | | | | | | | |
| | iphone | safari | | | | | | | | | | |
| | iphone | capacitor（M1） | | | | | | | | | | |

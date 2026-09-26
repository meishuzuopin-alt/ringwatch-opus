# BUILD-01 一套代码三个壳（Web / Electron / Capacitor）实施方案

> 版本 v1 · 2026-09-26 · 起草：Build/CI·平台包 · 状态：**方案，待派发方落库并交 Cursor 云端代理实现**
> 依据：`docs/DESIGN_BIBLE_v1.md`（PR #21）§3 差异表、§7 M0/M1、§8 M1-2、§11 Build/CI 1。
> 代码基线：`grok/scene-textures`（PR #20，与 PR #3 同一条集成线）。`main` 仍是微信小游戏 v3，**本方案以集成线为准**，落地前提是 PR #3 线合入 `main`（制作人决策项）。

## 0. 已有的，不重做

| 已有 | 位置 | 本方案怎么用 |
|---|---|---|
| Electron 壳：开窗、F11/Alt+Enter 全屏、原子写档 + `.bak`、启动计时 `startup.log`、`--smoke` 冒烟 | `desktop/main.js`、`desktop/preload.js` | 原样保留，只改「从哪个目录打包」 |
| 平台层：画布适配、指针/键盘/手柄、`Plat.load/save`、`Plat.hasAds`、`Plat.showReward` | `js/platform.js` | 拆出广告部分，加「目标」和「朝向」两个开关 |
| 激励视频常量 `RW.AD`（留空 = 预览发放） | `js/data.js` 第 6 行起 | 移出 `data.js`，进广告模块 |
| 打包配置（asar、白名单 `files`、`dir` 目标） | `package.json` → `build` | 改成从「分目标暂存目录」打包 |
| 入口清单一致性检查（`game.js` 与 `preview.html` 同序） | `tools/check.js` | 扩展成三份清单检查 + 无广告扫描 |
| 微信分支 `isWx` | `js/platform.js` | **保留不删**（微信版只是搁置），不在本方案范围 |

## 1. 核心原则

1. **核心 JS 只有一份**：`sim.js`、`map.js`、`data.js`、`render.js`、`gl3d.js`、`world3d.js`、`ui.js`、`audio.js`、`main.js`，三个壳都加载同一批文件，不许分叉（Bible §3 末两段）。
2. **只在壳里分叉**：输入映射、横竖屏布局、广告 SDK、存档后端、平台 SDK。
3. **分叉靠「构建目标」决定，不靠运行时猜**：新增一个构建期常量 `RW.TARGET`，由暂存脚本写入。运行时 `isWx` / `window.desktop` 探测只作为兜底。
4. **Steam 构建里物理上没有广告代码**：不是「开关关掉」，而是暂存时根本不拷贝广告文件，并由 CI 扫描确认（Bible §8 M1-2「Steam 构建里搜不到广告 SDK」）。

## 2. 三个目标一览

| | Web（浏览器） | Steam（Electron） | Mobile（Capacitor，超休闲） |
|---|---|---|---|
| `RW.TARGET.id` | `web` | `steam` | `mobile` |
| 用途 | 开发预览、M0 浏览器可玩、CI 截图与性能 | Steam 买断版 Win / macOS / Linux / Deck | 海外超休闲 Android / iOS 测试包 |
| 入口 HTML | `preview.html`（开发）；暂存后为 `index.html` | 暂存目录里的 `index.html`，由 `desktop/main.js` `loadFile` | 暂存目录里的 `index.html`，Capacitor `webDir` 指向它 |
| 进程入口 | `npm run dev`（`tools/lib/serve.js`） | `desktop/main.js` | `mobile/android`、`mobile/ios` 原生工程（`npx cap add` 生成） |
| 朝向 | `auto`：按窗口宽高比选横或竖；`?orient=landscape/portrait` 强制 | 固定横屏，逻辑 960×540（现状） | 固定竖屏，逻辑 420×760（Bible §3） |
| 存档后端 | `localStorage` | `window.desktop.load/save`（现状，JSON 文件） | `@capacitor/preferences`，启动时预读进内存 |
| 广告 | 预览发放（不加载任何 SDK） | **无，文件不存在** | 发行商 SDK 适配器（M1 接） |
| 平台 SDK | 无 | Steamworks（M3 起：成就、云存档用 Auto-Cloud 不需代码） | 发行商 SDK + 归因（M1） |
| 输入 | 指针 + 键盘 + 手柄 | 键盘 WASD + 手柄（现状） | 单指拖拽（玩法层实现，壳只给指针事件） |

## 3. 目录与文件改动（交给代理的清单）

```
js/target.js            新增：默认内容 = web 目标（开发时直接用）
js/ads.js               新增：广告抽象层（从 platform.js 拆出 + RW.AD 常量）
js/ads_preview.js       新增：预览发放实现（web / mobile 未接 SDK 时用）
js/ads_<publisher>.js   M1 新增：发行商 SDK 适配器（名字等发行商定了再起）
js/platform.js          修改：删除广告实现，只留 Plat.showReward 转发；加朝向与存档后端选择
js/data.js              修改：RW.AD 移走；TUNE.W/H 改由布局表决定（见 §5）
tools/stage.js          新增：按目标生成暂存目录 build/stage/<target>/
tools/check.js          修改：三目标清单一致 + Steam 无广告扫描
desktop/                不动（只改 electron-builder 的打包来源）
mobile/                 新增：Capacitor 工程（独立 package.json，不污染根依赖）
  mobile/package.json
  mobile/capacitor.config.json
  mobile/android/  mobile/ios/   （npx cap add 生成，提交进仓库）
```

### 3.1 `js/target.js`（加载顺序第 1 个，早于 `data.js`）

```js
// 构建目标：tools/stage.js 会按目标覆盖这个文件；开发时就是 web
(function (root) {
  var RW = root.RW = root.RW || {};
  RW.TARGET = { id: 'web', orient: 'auto', ads: 'preview', save: 'local', build: 'dev' };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));
```

暂存时写入的值：

| 目标 | id | orient | ads | save | build |
|---|---|---|---|---|---|
| web | `web` | `auto` | `preview` | `local` | `<git short sha>` |
| steam | `steam` | `landscape` | `none` | `desktop` | `<git short sha>` |
| mobile | `mobile` | `portrait` | `preview` 或 `<publisher>` | `prefs` | `<git short sha>` |

`build` 字段在标题页角落显示，方便测试回执对应到具体提交。

### 3.2 `tools/stage.js --target web|steam|mobile [--ads <publisher>]`

1. 清空并创建 `build/stage/<target>/`。
2. 按白名单拷贝：`js/**`、`vendor/**`、`fonts/**`、`assets/sprites/**`、`assets/textures/soft/*.jpg`（与现在 `package.json` → `build.files` 相同）。
3. `preview.html` 拷贝为 `index.html`，并按目标改写 `<script>` 清单（见 §4）。
4. 覆盖 `js/target.js`。
5. **steam**：删除 `js/ads*.js`；额外拷贝 `desktop/**` 和一份精简 `package.json`（`name`、`version`、`main: desktop/main.js`、`productName`）。
6. **mobile**：只保留 `js/ads.js` + 选中的一个适配器。
7. 写 `build/stage/<target>/BUILD_INFO.json`：目标、完整 commit、时间、文件清单与每个文件的 SHA-256。
8. 不依赖网络，不需要 esbuild（现在的游戏是按序加载的普通脚本，保持不打包；esbuild 以后要做压缩时再加一步，不在本方案内）。

## 4. 入口与加载清单

三份清单只在壳相关的脚本上有差别，核心脚本顺序必须相同：

| 位置 | web | steam | mobile |
|---|---|---|---|
| 1 | `js/target.js` | `js/target.js` | `js/target.js` |
| 2 | `vendor/three.min.js` | 同左 | 同左 |
| 3 | `js/data.js` … `js/main.js`（现有顺序） | 同左 | 同左 |
| platform 之后 | `js/ads.js`、`js/ads_preview.js` | **无** | `js/ads.js`、`js/ads_<publisher 或 preview>.js` |

- `game.js`（微信入口）同步加 `target.js`，保持 `tools/check.js` 的「入口一致性」通过。
- `tools/check.js` 新增一条：去掉 `ads*` 之后，三份清单完全相同，否则失败。
- Electron 入口不变：`desktop/main.js` 里 `win.loadFile(path.join(ROOT, 'preview.html'))` 改为 `'index.html'`（暂存目录里只有 `index.html`）。

## 5. 横竖屏

现状：`RW.TUNE.W=960, H=540` 写死，`Plat.computeView()` 等比缩放加黑边。

改法：

1. `data.js` 增加布局表，`TUNE.W/H/VIEW` 由布局表赋值（数值仍然只在 `data.js`，符合硬规则）：
   ```js
   RW.LAYOUTS = {
     landscape: { W: 960, H: 540, VIEW: { x: 0, y: 0, w: 960, h: 540 } },
     portrait:  { W: 420, H: 760, VIEW: { x: 0, y: 0, w: 420, h: 760 } }
   };
   ```
2. `platform.js` 在 `Plat.init()` 最前面选布局：`orient === 'auto'` 时 `innerWidth >= innerHeight` 选 landscape，否则 portrait；URL 参数 `?orient=` 优先。选定后写回 `T.W/T.H/T.VIEW`，**一局之内不切换**（窗口旋转只重新缩放，不换布局，避免战斗中布局跳变）。
3. `Plat.layout` 暴露当前布局名，`ui.js` 按它选 HUD 排版；**`sim.js` 不读布局**（战斗模拟与屏幕无关，保证无头模拟结果一致）。
4. 壳层锁定朝向：
   - Electron：保持 `minWidth 960 / minHeight 540`。
   - Android：`mobile/android/app/src/main/AndroidManifest.xml` 主 Activity `android:screenOrientation="portrait"`。
   - iOS：`Info.plist` 的 `UISupportedInterfaceOrientations` 只留 `UIInterfaceOrientationPortrait`。
   - 刘海与手势条：沿用 `preview.html` 已有的 `viewport-fit=cover`，HUD 用 `env(safe-area-inset-*)` 换算成逻辑坐标留白（`Plat.view.safe`）。
5. M0 验收「横竖屏都能跑」：CI 用 1280×720 和 390×844 两个视口各截一组图（见 BUILD-02）。

## 6. 存档路径

存档键沿用（Bible 抬头：仓库名与存档键沿用）。每条存档 JSON 加 `v`（结构版本）字段。

| 目标 | 后端 | 物理位置 | 说明 |
|---|---|---|---|
| web | `localStorage` | 浏览器按域名隔离 | 现状。超休闲模式在 web 预览时键名加前缀 `hc_`，避免和 Steam 模式在同一个浏览器里互相覆盖 |
| steam · Windows | JSON 文件 | `%APPDATA%\Ringwatch\saves\<key>.json`（+`.bak`、`.tmp`） | 现状，不改 |
| steam · macOS | 同上 | `~/Library/Application Support/Ringwatch/saves/` | Electron `appData` 默认位置 |
| steam · Linux / Deck | 同上 | `~/.config/Ringwatch/saves/` | 同上 |
| mobile · Android | `@capacitor/preferences` | SharedPreferences（应用私有目录） | 键名前缀 `hc_` |
| mobile · iOS | `@capacitor/preferences` | UserDefaults | 不用 WebView `localStorage`：iOS 存储紧张时可能被系统清掉 |

- `Plat.load/save` 对上层保持**同步**接口。移动端 Preferences 是异步的，做法：`main.js` 启动前 `await RW.Plat.ready()`，把所有 `hc_` 键一次读进内存；之后 `load` 读内存，`save` 写内存并异步落盘（失败只记日志，不打断游戏）。web / steam 的 `ready()` 立即完成。
- Steam 云存档：后台 Auto-Cloud，根目录 `WinAppDataRoaming` + 子目录 `Ringwatch/saves`，模式 `*.json`；macOS / Linux 用 Root Override 映射到上表路径。只同步 `*.json`，不同步 `.tmp`、`startup.log`。

## 7. 广告 SDK 开关

### 7.1 接口（`js/ads.js`）

```js
RW.Ads = {
  available: false,                 // 当前构建有没有广告
  init: function () {},             // 启动时调用一次
  rewarded: function (kind) {},     // kind: 'revive' | 'double'；返回 Promise<{ granted, preview }>
  interstitial: function (where) {} // 只允许在结算后调用；战斗中调用直接拒绝并记日志
};
```

- `Plat.showReward(kind, onGrant, onFail)` 保留原签名（界面代码不用改）：`RW.Ads` 不存在时走 Steam 规则（每局一次免费复活，`{ free: true }`），与现在 `hasAds=false` 的行为一致。
- `Plat.hasAds = !!(RW.Ads && RW.Ads.available)`，取代现在的 `isWx`。
- 「没看完不发奖」「战斗中 0 广告」两条写在 `ads.js` 公共层，不依赖每个适配器自觉（Bible §8 M1-2）。
- 广告点位只有两个：复活、结算翻倍（Bible §11 策划 2）。现有 `REWARD_REROLL`（整备刷新）在超休闲版不用；Steam 版本来就没有。

### 7.2 三层开关

| 层 | 在哪 | 作用 |
|---|---|---|
| 构建期 | `tools/stage.js` | steam 不拷贝任何 `ads*.js`；mobile 只拷贝一个适配器 |
| 目标常量 | `RW.TARGET.ads` = `none` / `preview` / `<publisher>` | 决定 `ads.js` 装哪个实现 |
| 运行期 | 适配器里的广告位 ID 留空 = 预览发放 | 沿用现有做法，方便发行商 SDK 未就绪时照常测试 |

### 7.3 Steam 无广告的机器检查（CI 必跑，失败即阻断）

对 `build/stage/steam/` 和打出来的 `app.asar` 解包内容做文本扫描，命中任一即失败：
`ads_`、`RW.Ads`、`showRewarded`、`RewardedVideo`、`createRewardedVideoAd`、`adUnitId`、`interstitial`、`AdMob`、`LevelPlay`、`ironsource`、`applovin`、`unityads`、`voodoo`。
（`Plat.showReward` 本身保留，因为 Steam 的「免费复活」走同一个入口；扫描规则里排除这一个标识符。）

## 8. 发行商 SDK 接入位（M1，先留接口）

- 发行商还没定（Bible §3：Supersonic / Voodoo 一类）。**风险**：多数超休闲发行商的 SDK 以 Unity 插件形式提供，是否接受 Capacitor（WebView）包、是否有原生 Android / iOS SDK 可桥接，必须在第一次沟通时确认。见 BUILD-03 第 P2 项。
- 接法：发行商原生 SDK 用 Capacitor 插件包一层（`mobile/plugins/<publisher>/`，Android Kotlin + iOS Swift），JS 侧 `js/ads_<publisher>.js` 只调用插件，实现 §7.1 接口。
- 归因 / 分析事件（如发行商要求 `level_start`、`level_complete`、`ad_watched`）走同一个适配器文件里的 `RW.Ads.track(name, params)`，steam 构建里不存在。

## 9. Capacitor 工程约定

| 项 | 值 |
|---|---|
| 位置 | `mobile/`（独立 `package.json`，根目录 `npm ci` 不装 Capacitor 依赖） |
| 依赖 | `@capacitor/core`、`@capacitor/cli`、`@capacitor/android`、`@capacitor/ios`、`@capacitor/preferences`；版本由代理按当时稳定版锁定并写进 `package-lock.json` |
| `appId` | 占位 `com.flameguardian.hc`，发行商如指定包名再改（改包名前没有上架，无迁移成本） |
| `appName` | `Flame Guardian` |
| `webDir` | `../build/stage/mobile` |
| Android | `minSdk` 以 Capacitor 当前版本默认值为准；调试包 `./gradlew assembleDebug`，用 Gradle 自动生成的调试签名 |
| iOS | 需要 Apple 开发者账号（BUILD-03 P5）；M1 前只保证 `npx cap sync ios` 能通过 |
| 冷启动 ≤ 5 秒（Bible §8 M1-1） | 启动页用原生 Splash，隐藏时机 = 游戏第一帧画出（复用 `desktop:boot` 同样的「首帧」打点） |

## 10. 交给 Cursor 代理的任务拆分（按顺序，每个一个 PR）

| # | 任务 | 验收 |
|---|---|---|
| S1 | `js/target.js` + `tools/stage.js`（web / steam 两个目标） + `check.js` 三清单一致 | `node tools/stage.js --target web` 后用浏览器打开 `build/stage/web/index.html` 可玩；`npm run check` 通过 |
| S2 | 广告拆分：`js/ads.js`、`js/ads_preview.js`，`platform.js` 转发，`RW.AD` 移出 `data.js` | web 下复活按钮显示「预览发放」，行为与现在一致；steam 暂存目录里 `grep` 不到 §7.3 任何关键词 |
| S3 | electron-builder 改为从 `build/stage/steam` 打包；`desktop/main.js` 入口改 `index.html` | `npm run dist:win` 产物能启动；`desktop:smoke` 通过；存档仍写 `%APPDATA%\Ringwatch\saves` |
| S4 | 布局表 + 朝向选择 + safe-area | `?orient=portrait` 在 390×844 视口下 HUD 不出屏（`npm run audit:ui` 竖屏版通过）；`sim.js` 无头结果与改动前逐帧一致 |
| S5 | `mobile/` Capacitor 工程 + Preferences 存档 + 竖屏锁定 | CI 产出 `app-debug.apk`；安装到安卓真机能进游戏、杀掉进程后存档还在 |
| S6（M1，发行商定后） | `js/ads_<publisher>.js` + 原生插件 | 没看完不发奖 100%；战斗中调用被拒；steam 扫描仍通过 |

S1–S5 属于 M0 工程底座（M0 验收「横竖屏都能跑」依赖 S4），S6 属于 M1。

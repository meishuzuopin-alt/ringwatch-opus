# 海外网页门户（CrazyGames / Poki / GameDistribution）

游戏名在英文网页包里是 **Ringwatch**（中文版仍是「圣火守护者」）。这一页只讲怎么打出可提交的静态包，以及各门户要人补的材料。数值和玩法不在这里改。

官方要求以提交当时的文档为准：<https://docs.crazygames.com/requirements/intro/>。

## 怎么打网页包

```bash
npm run web:build
# 等价于 node tools/build-web.js --out dist-web --ads none --lang en
```

| 参数 | 默认 | 含义 |
|---|---|---|
| `--out` | `dist-web` | 输出目录。已写入 `.gitignore`，不要提交 |
| `--ads` | `none` | `none`：Basic Launch，不放任何广告 SDK，激励按钮藏起，调用也不发奖。`crazygames`：多拷一份 `js/ads-crazygames.js` |
| `--lang` | `en` | `en` 标题为 Ringwatch。`zh` 保持「圣火守护者」 |

产物是一个静态目录：`index.html`、`vendor/three.min.js`、游戏脚本、字体子集、已批准的精灵图集。脚本路径都是相对路径。构建脚本会打印体积报告，并写出 `dist-web/size-report.json`。超过下面任一限额，或 html/js 里出现 `http(s)` 外链，脚本以退出码 1 结束。

`npm run check` 会顺带打一次默认网页包（英文、`ads=none`）并核对体积。无头冒烟（需要本机已有 Playwright Chromium，不要再跑 `playwright install`）：

```bash
npm run web:smoke
```

冒烟用 `?2d` 打开标题页，拦掉 `localStorage`，点一次进入选人，并只存一张截图 `shots/web-boot.png`。

## 体积（CrazyGames Basic）

无 SDK 时，门户把**整个包**当成初始下载（见 Technical：没接 SDK 就用 total file size）。因此初始下载和总体积是同一个数，必须同时满足：

| 限额 | 要求 |
|---|---|
| 初始下载 | ≤ 50 MB；要上手机首页则 ≤ 20 MB |
| 总体积 | ≤ 250 MB（接了 SDK 后，不含 SDK 的部分还有一条 50 MB 的口径，以当时文档为准） |
| 文件数 | ≤ 1500 |

默认包把 Three.js 打进 `vendor/`，运行时不访问 CDN。CrazyGames 的 HTML5 SDK **不放进 zip**：门户预览器会注入 `window.CrazyGames.SDK`。自己写 `<script src="https://sdk.crazygames.com/...">` 会在加载时访问外网，广告拦截器下也可能把整页脚本打断。本包在没有这个全局对象时照常可玩。

## 语言、输入、存档

- `js/i18n.js` 在绘制时把玩家看得见的中文换成英文。`zh` 是恒等变换，桌面版和微信入口不受影响。网页包在脚本之前设置 `window.RW_WEB = { web, lang, ads }`。标题页在网页包里可以切回中文，选择写进存档。
- 逻辑分辨率仍是 960×540。窗口不是 16:9 时，HUD 用左右或上下留边；网页包还会躲开 `env(safe-area-inset-*)`（CrazyGames App 全屏时的刘海）。
- 指针事件同时覆盖鼠标和触摸。`touchend` 里恢复被系统挂起的音频。页面禁止选中文字和双指缩放，避免平板长按弹出放大镜。
- `localStorage` 的读和写都在 `try/catch` 里。隐身窗口拒写存档时，这一局仍能玩，只是不记住进度。

## 广告适配器

`js/ads.js` 仍是微信路径：只有回调里 `isEnded === true` 才发奖。桌面版不打包 `js/ads.js` 和 `js/ads-*.js`。

| `Plat.adProvider` | 何时 | 行为 |
|---|---|---|
| `off` | 桌面 / 浏览器预览 | 不播广告，重燃直接可用 |
| `wechat` | `game.js` | 原有激励视频，看完才发 |
| `none` | 网页包默认 | 不加载 SDK。重燃按钮不显示，请求直接失败，不发奖 |
| `crazygames` | `npm run web:build -- --ads=crazygames` | 本地适配器。宿主若注入 SDK，则 `SDK.ad.requestAd('rewarded'/'midgame', …)`。`adFinished` 带 `isEnded: false` 不发奖；没有该字段时视为看完。没有 SDK、初始化失败、或 60 秒无回调，都走失败，游戏继续 |

`crazygames` 适配器还会在加载和进入/离开战斗时调用 `SDK.game.loadingStart` / `loadingStop` / `gameplayStart` / `gameplayStop`。战斗中的 `gameplayStart` 才算「进入可玩状态」，标题和选人不算。广告占用期间模拟暂停、音效静音。

Basic Launch **不要**用 `--ads=crazygames` 去播广告。文档写明：Basic 即使接了 SDK，广告也会被关掉。Full Launch 才要求广告走他们的 SDK，并且开着广告拦截器也能玩——失败路径已经是「不发奖、继续游戏」。

## CrazyGames 提交清单

把 `dist-web/` 打成 zip 上传（不要把仓库根目录传上去）。游戏分类按动作 / 塔防自己在后台选。

### Basic Launch（这一版的目标）

- [x] 静态包、相对路径、无 CDN、无运行时外链
- [x] 初始下载 ≤ 20 MB（无 SDK，总体积即初始下载）
- [x] 文件数 ≤ 1500，总体积 ≤ 250 MB
- [x] Chrome / Edge，鼠标、键盘、触摸；横屏 16:9，非 16:9 留边
- [x] 隐身模式存档失败也不中断
- [x] 无外部广告、无内购、无聊天、无外链
- [x] 内容按 PEGI-12：奇幻战斗，没有血腥；「赌徒」是战斗里的随机效果，不是真钱赌博
- [ ] 封面三张（人做，必须原创，不要用别的游戏的图，也不要只截一张游戏画面充数）
- [ ] 预览视频横竖各一条
- [ ] 后台英文简介、操作说明、标签

封面（Game covers）：

| 用途 | 尺寸 |
|---|---|
| 横图 Landscape | 1920×1080（16:9） |
| 竖图 Portrait | 800×1200（2:3） |
| 方图 Square | 800×800 |

封面限制：不要加边框；除游戏名外不要写 New / Play / Play now；不要放商店图标；不要用没有版权的图；不要糊。三张图的主体要能认成同一款游戏。游戏名用 Ringwatch。

预览视频：15–20 秒（更长会被裁到 20 秒），≤ 50 MB，无声，1080p。横屏 16:9 和竖屏 2:3 都要。不要黑边、黑场加 logo、鼠标指针、Play Now、应用图标。不要自己加速，他们处理时会稍微加快。开头帧用静态封面。

后台文案至少要有：游戏名 Ringwatch、一段英文介绍、操作说明（移动、冲刺、技能、造塔、暂停）。简介里写清单人、守圣火、波间整备，不要写内购或外部链接。

### Full Launch（现在不要为了过审去改包）

被选中之后才要补，Basic 不因此被卡住：

- 必须接 SDK，并在**进入可玩战斗**时发 `gameplayStart`（本仓库用 `--ads=crazygames` 的适配器已经会发；标题菜单不算 gameplay）
- 广告只走 SDK，遵守他们的广告位置说明；广告拦截器下游戏必须能玩完
- 点进来应尽快进入可玩状态（他们的完整视觉验收比 Basic 严）
- 若要云进度：用他们的 Data / User 模块，自动登录，不用外部账号。本游戏进度在本地，Full Launch 之前不要接外部登录
- 内购只有被邀请后才能做，且必须走 CrazyGames 的 Xsolla 和 `userId`。当前版本没有内购

## 还不能交的东西

- 封面和预览视频不在这个仓库里。硬规则是代码生成画面，封面要另做原创图，不能从别的游戏抠。
- 默认 zip **不包含** SDK 脚本。QA 工具若要求页面里有 SDK 标签，不要把 CDN 地址写进 `index.html`；用他们的预览器注入，或只在 Full Launch 时确认预览器已经提供 `window.CrazyGames.SDK`。
- `--ads=crazygames` 时适配器只在宿主注入 SDK 之后才会去请求广告。Basic Launch 请保持 `--ads=none`。

## Poki

Poki 要接他们自己的 SDK（加载、gameplay 起止、商业广告），和 CrazyGames 不是同一套 API，不能把 `ads-crazygames.js` 拿去充数。Poki 的推荐位常常带**独占**：同一款游戏不能同时放在其他门户。要上 Poki 之前先确认合同是不是 exclusive；若是，就不要把同一构建提交到 CrazyGames。实现上另做 `js/ads-poki.js`，仍由构建参数选择，默认包继续不加载任何 SDK。

## GameDistribution

GameDistribution 同样要求他们的 HTML5 SDK 做广告和统计，一般比 Poki 更常接受非独占，但以当时的伙伴条款为准，不要凭印象签。提交物同样是相对路径的静态目录，体积习惯上也很紧。先过 CrazyGames Basic，再决定要不要为 GD 加第三个适配器。

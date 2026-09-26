# M1 测试包冒烟清单（Android / iOS / Steam）

> 版本 v1 · 2026-09-26 · 作者：游戏测试 · 来源：PR #21 `docs/DESIGN_BIBLE_v1.md` §8 M1 #1、#2（规则见 §3、§5.2）

每条都填：结果（通过 / 失败）、证据路径（`qa-evidence/m1/<构建哈希>/<ID>_<次数>.mp4|png|log`）。构建哈希：Android ____ iOS ____ Steam ____。

## A. 激励视频：没看完不发奖（100%）

两个点位都测：**R = 复活**（每局 1 次，圣火回 50%），**D = 结算金币 ×2**。每条每个点位测 N = 10 次，每次都记一行（附表）。

| ID | 步骤 | 预期 |
|---|---|---|
| A1 | 看到一半点关闭 | 不发奖；R：进入失败结算；D：金币不变 |
| A2 | 播放中切后台 30 s 再回来 | 不发奖（除非 SDK 回报完整看完） |
| A3 | 播放中断网 | 不发奖，提示「广告暂时不可用」一类 |
| A4 | SDK 报错 / 无填充（开发者后台测试模式） | 不发奖，按钮可再试，游戏不卡死 |
| A5 | 快速连点奖励按钮 | 只拉起 1 次广告；看完只发 1 次奖 |
| A6 | 播放中杀进程，重启 | 不发奖；存档不出现多出的金币 / 复活次数 |
| A7 | 完整看完 | 发奖正好 1 次；R 同局第二次不再出现 |
| A8 | 预览发放模式（`RW.AD` ID 留空） | 按钮写「预览发放」，直接发奖、不播广告；**发给发行商的包不得是此模式** |

注意（现有代码）：`js/platform.js` 的 `showReward` 在微信回调里写的是 `!res || res.isEnded` 就发奖，`res` 为空也会发。发行商 SDK 适配层必须只认「完整看完」回调，A1–A6 专门盯这一点。

附表：

| 次数 | ID | 点位 R/D | 平台 | 发奖了吗 | 应发吗 | 结果 | 证据 |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |

## B. 战斗中 0 次广告

| ID | 步骤 | 预期 |
|---|---|---|
| B1 | 连打 10 局，导出事件日志（钩子 H3/H8），比对每次 `adShow` 时的游戏状态 | 所有 `adShow` 都不在 `battle` 状态 |
| B2 | 插屏：记录第 1–5 局结束时是否弹 | 最早第 3 局后才弹 |
| B3 | 连续快速开局，看两次插屏间隔 | ≥ 60 s |
| B4 | 录屏 10 局全程，人工复核 | 战斗画面里没有任何广告 |

## C. Steam 构建没有广告 SDK

对 `dist/win-unpacked`（及 linux / mac）先解包：`npx asar extract resources/app.asar /tmp/fg-app`。

| ID | 步骤 | 预期 |
|---|---|---|
| C1 | `grep -rniE "applovin\|ironsource\|unityads\|unity3d.ads\|admob\|googleads\|googlesyndication\|doubleclick\|gms.ads\|audience_network\|facebook.com/ads\|vungle\|mintegral\|pangle\|bytedance.*ad\|createRewardedVideoAd\|showReward\|RW\.AD" /tmp/fg-app dist/win-unpacked/resources` | 0 条命中 |
| C2 | 对 `.exe/.dll/.node` 跑 `strings -a <文件> \| grep -iE "<同上关键词>"` | 0 条命中（Electron 自身文件若有误报，逐条登记理由） |
| C3 | 抓包：Windows 上用 Wireshark / Fiddler 录冷启动 + 一局 5 分钟 | 没有任何广告域名请求（桌面版本来就不联网，见 `desktop/main.js`） |
| C4 | 游戏内：失败时复活按钮 | 直接复活，无「看广告」「预览发放」字样 |

注意（现有代码）：目前桌面版靠运行时 `Plat.hasAds = isWx` 关广告，`RW.AD` 与 `createRewardedVideoAd` 字符串仍在包里，C1 现在**会失败**，要等 H6 编译期剔除。

## D. 冷启动与基础

| ID | 步骤 | 预期 |
|---|---|---|
| D1 | 杀进程 + 清最近任务后点图标，60fps 录屏，点图标 → 可操作第一帧，测 5 次取最大 | ≤ 5 s（Steam 另看 `startup.log` 的「第一帧画面」） |
| D2 | 全新安装（AAB 走内部测试轨道 / APK 直装 / TestFlight / Steam 本地 depot） | 安装成功、图标和名字正确 |
| D3 | 首次启动 | 无权限弹窗乱弹、无白屏 > 1 s |
| D4 | 玩一局 → 杀进程 → 重开 | 金币 / 守卫进度还在 |
| D5 | 局中切后台 1 分钟再回 | 自动暂停，回来可继续，音频恢复 |
| D6 | 断网启动 | 能玩（广告位降级为不可用，不崩） |
| D7 | 横竖屏：手机锁竖屏，Steam 16:9 与 Deck 1280×800 | 布局正确、无文字出屏（可复用 `npm run audit:ui`） |

**需要代码侧提供的钩子**：H3 事件日志（含 `adShow/adClose/adGrant` + 当时游戏状态）；H6 构建开关：Steam 构建编译期剔除广告模块和 `RW.AD`（广告适配层只放在 Capacitor 壳里）；H7 手机壳冷启动计时（仿 `startup.log`）；H8 调试面板：模拟无填充 / 报错 / 提前关闭、显示插屏计数与间隔。

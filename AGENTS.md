# 协作约定（Claude / Grok / GPT / Codex 共用；Cursor 暂停）

这份文件是所有 AI 助手和人共同遵守的项目规则。Codex 会自动读取本文件，Claude Code 通过 `CLAUDE.md` 引用它，Grok 通过 `GROK.md`、GPT 通过 `GPT.md` 引用它，Cursor 通过 `.cursor/rules/` 引用它。

> 2026-09-25 起：Cursor 额度用完，暂停。它的活按文件拆给两组，各管各的文件：**Grok bot 组**管数值、手感和真机验收（只改 `js/data.js`），**GPT** 管文案、界面文字和界面小修（`js/ui.js`）。边界见「分工」一节。

## 项目是什么

「圣火守护者 Flame Guardian」（原名「环带值守 Ringwatch」，仓库名沿用）：奇幻守村割草塔防，**目标平台 Steam（Windows / macOS / Linux）**，横屏 16:9。
纯原生 JS，游戏本身**没有构建步骤**；3D 用 Three.js（打包成 `vendor/three.min.js`，全局变量 `THREE`），桌面壳是 Electron（`desktop/`）。
入口是 `preview.html`（浏览器 / Electron 都加载它），按顺序加载 `vendor/three.min.js` 和 `js/` 下的脚本，全部挂在全局 `RW` 上。
微信小游戏版已搁置（`game.js`、`game.json`、`project.config.json` 保留，暂不维护）。
玩法设计见 `DESIGN.md`，美术方向见 `docs/ART.md`，上架清单见 `docs/STEAM.md`。
玩家逐条要求见 `docs/PLAYER-LOG.md`。全面优化以那份日志为准；日志后面的条目覆盖前面的。
全案白皮书见 `docs/WHITEPAPER.md`；同类游戏差评里的痛点与我们的对策见 `docs/PLAYER-VOICE.md`（每个版本前对照一遍）。
设计储备（负责人贴来的长设计稿逐条对照：已做 / 下一批 / 待拍板 / 不能照做）见 `docs/DESIGN-BACKLOG.md`。
全局品质审计（逐维度打分、修之前 → 修之后、待办）见 `docs/AUDIT.md`；复查用 `npm run audit:game` 和 `npm run audit:ui`。

| 文件 | 负责什么 |
|---|---|
| `js/data.js` | 所有数值表（英雄、武器、道具、敌人、波次、商店）。调数值只改这里 |
| `js/map.js` | 字符地图 |
| `js/sim.js` | 纯逻辑，不碰画面，可在 Node 里无头运行 |
| `js/platform.js` | 平台差异封装（画布、输入、存档、音频上下文） |
| `js/gl3d.js` | 3D 渲染层（Three.js）：网格构建器 `GB`、实例化网格、阴影、描边、泛光、调色、特效四边形 |
| `js/world3d.js` | 3D 场景：调色板 `PAL`、地形、低模、英雄造型与动作、昼夜光照预设、镜头 |
| `js/render.js` | 战斗 HUD、3D 之上的标注层；也含 2D 退路画面 |
| `js/ui.js` | 各页面界面（逻辑分辨率 960×540） |
| `js/audio.js` | 程序合成的音乐与音效。风格以 `docs/PLAYER-LOG.md` 为准，不是重金属 |
| `js/main.js` | 主循环、输入分发 |
| `desktop/` | Electron 主进程与预加载（窗口、全屏、退出、存档文件） |

## 分工

| 角色 | 负责 | 通常改哪里 | 分支 |
|---|---|---|---|
| **Claude Code** | 工程搭建、渲染管线、系统性功能、收尾完善（修 bug、补测试、重构） | `tools/`、`.github/`、`gl3d.js`、`sim.js`、`main.js`，以及落实美术方案所需的代码 | `claude/*` |
| **Grok bot 组** | 数值与手感微调、难度曲线、真机验收（Windows 实机跑包、截图、回执）、Steam 竞品与差评情报 | 只改 `js/data.js`；验收回执写进 `docs/AUDIT.md` | `grok/*` |
| **GPT** | 文案与界面文字：按钮、说明、提示、成就和道具描述、商店页文案；界面上的小修（换行、对齐、字数） | `js/ui.js` 的文案和布局小改、`docs/STEAM.md` 文案部分 | `gpt/*` |
| ~~Cursor~~ | 额度用完，暂停 | — | `cursor/*`（旧分支保留） |
| **Codex** | 美术指导：定风格、调色板、光照氛围、模型造型、特效观感 | `docs/ART.md`、`world3d.js` 的 `PAL` 与昼夜预设、模型造型函数 | `codex/*` |

**所有工作都要推到 GitHub**：Claude 用 `claude/*`、Grok 用 `grok/*`、GPT 用 `gpt/*`、Codex 用 `codex/*` 分支（Cursor 暂停，旧的 `cursor/*` 分支保留），改完就提交并推送，不要只留在本地。
没推送的改动别人看不到，全面升级时会被漏掉。`npm run sync` 汇总所有分支的进度和可能冲突的文件；全面升级方案见 `docs/UPGRADE-PLAN.md`。

**Grok 与 GPT 的边界**（按文件分，基本不会撞车）：
1. `js/data.js` 只归 Grok。道具、成就等**描述文字**如果放在 `data.js` 里，GPT 不直接改，把要改的文字写进 PR 描述，交给 Grok 合。
2. `js/ui.js` 的文案和布局归 GPT，Grok 不碰。
3. 两边都不碰 `sim.js`、`gl3d.js`、`world3d.js`、`main.js`、`tools/`。大改动写成文档交给 Claude。
4. 两边都从 Claude 最新的集成分支拉新分支；每个分支只做一件事，名字看得出做什么（如 `grok/tune-wave-12`、`gpt/copy-shop-tooltips`）。
5. 自检：Grok 改完跑 `npm run check` 加 `npm run balance` 或 `npm run audit:game`；GPT 改完跑 `npm run check` 加 `npm run audit:ui`，文字出屏、按钮装不下、文字重叠都必须是 0。
6. 合并顺序由 Claude 决定。`npm run sync` 分开标注 `grok/*` 和 `gpt/*`，两个分支改到同一个文件、或改了自己范围以外的文件，都会报出来。

交接方式：美术方案先写进 `docs/ART.md`（要什么、参考、验收标准），能直接改颜色 / 造型的就直接改；
需要渲染器新能力（新着色器、后处理、贴图等）的，在 `docs/ART.md` 的「待工程实现」里列出来，由 Claude 落地。

## 硬规则

1. **3D 场景、模型、音乐、音效全部由代码生成**：不引入对应的图片、模型文件、音频文件。UI 允许在 `assets/ui/` 下使用本项目原创制作的 SVG / PNG，来源必须登记在 `docs/ART.md`；禁止导入第三方素材。第三方库只有 Three.js 与 Electron；新增库或其他素材需先征得项目负责人同意，并在 `docs/ART.md` 记录。
   **字体例外（负责人 2026-09-25 批准，FG-ART-002 A+ 路线）**：一款 SIL OFL 1.1 授权的中文字体（Noto Serif SC / Noto Sans SC，即思源宋体 / 思源黑体），只以子集形式放在 `fonts/`，许可证 `fonts/OFL.txt` 同目录。改了文案后跑 `npm run fonts` 重新子集化，`npm run check` 会拦下缺字。`docs/` 里的概念图、参考图只是文档，不进安装包（打包白名单不含 `docs/`，check 会拦）。
2. **Three.js 只通过 `node tools/vendor-three.js` 重新打包**（版本锁在 `package.json`），不要手改 `vendor/three.min.js`。
3. **新增 `js/` 文件**时，`preview.html` 和 `game.js` 两处都要加，顺序一致（check 会拦）。
4. **`sim.js` 不许碰画面 API**，否则无头数值测试跑不了。
5. 代码风格跟随现有文件：ES5 风格（`var`、IIFE、挂 `RW`），注释用中文，2 空格缩进。
6. 所有用户可见文案用简体中文。
7. 不要在逻辑里写死数值，放进 `data.js` 的表里。
8. **不碰任何有版权风险的内容**：不照搬其他游戏的数值表、源码、美术；不用仍在版权期内的作品、商标、真人肖像。玩法机制可以借鉴，数值自己设计、自己调平。

## 提交前

```bash
npm run check        # 必跑，几秒：语法 / 入口一致 / 模拟冒烟 / 包体 / 字体缺字 / 安装包素材
npm run fonts        # 改了文案（新出现的字）后跑：重新生成 fonts/ 里的字体子集
npm run test:flow    # 改了界面或流程时跑（需要 Playwright + Chromium）
npm run shots        # 改了画面时跑，截图在 shots/art/，前后对比
npm run balance      # 改了数值时跑：node tools/balance.js [局数] [最高波数]
npm run audit:game   # 全局品质审计（无头）：节奏、爽感、地图几何、音效覆盖、英雄离散；结果见 docs/AUDIT.md
npm run audit:ui     # 界面审计：逐个界面查文字出屏 / 按钮装不下 / 文字重叠，并记录绘制开销（CI 会跑）
npm run music        # 改了音乐时跑：离线渲染每段音乐为 WAV，检查爆音 / 静音
npm run voice        # 抓同类游戏的 Steam 差评按痛点计数（需要能访问 store.steampowered.com）
npm run sync         # 汇总三方分支进度与可能冲突的文件
npm run dev          # 浏览器预览：http://localhost:8080/
npm run desktop      # 桌面版（Electron）
npm run dist:win     # 打 Windows 免安装目录到 dist/（也可在 Actions 手动触发三平台打包）
```

CI（`.github/workflows/ci.yml`）在每个 PR 和 main 上跑以上检查，并把截图作为 `screenshots` 产物上传，
美术评审直接在 Actions 运行页面下载查看。

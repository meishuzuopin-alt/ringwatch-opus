# 协作约定（Claude / Grok / Codex 共用；Cursor 暂停）

这份文件是所有 AI 助手和人共同遵守的项目规则。Codex 会自动读取本文件，Claude Code 通过 `CLAUDE.md` 引用它，Grok 通过 `GROK.md` 引用它，Cursor 通过 `.cursor/rules/` 引用它。

> 2026-09-25 起：Cursor 额度用完，暂停。Cursor 的位置由 **Grok bot 组**接替，负责微调（数值、手感、文案、小修小改），分支 `grok/*`。
> （当天曾短暂交给 GPT，GPT 没有产出分支；以 Grok 为准。已有的 `gpt/*` 分支如出现，按 Grok 的规则对待。）

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
| **Grok bot 组**（接替 Cursor 的位置） | 微调：数值、手感、文案、小修小改 | `data.js`、`ui.js` 文案、任意小改动；调数值后跑 `npm run balance` 或 `npm run audit:game`，改界面后跑 `npm run audit:ui` | `grok/*` |
| ~~Cursor~~ | 额度用完，暂停 | — | `cursor/*`（旧分支保留） |
| **Codex** | 美术指导：定风格、调色板、光照氛围、模型造型、特效观感 | `docs/ART.md`、`world3d.js` 的 `PAL` 与昼夜预设、模型造型函数 | `codex/*` |

**所有工作都要推到 GitHub**：Claude 用 `claude/*`、Grok 用 `grok/*`、Codex 用 `codex/*` 分支（Cursor 暂停，旧的 `cursor/*` 分支保留），改完就提交并推送，不要只留在本地。
没推送的改动别人看不到，全面升级时会被漏掉。`npm run sync` 汇总所有分支的进度和可能冲突的文件；全面升级方案见 `docs/UPGRADE-PLAN.md`。

交接方式：美术方案先写进 `docs/ART.md`（要什么、参考、验收标准），能直接改颜色 / 造型的就直接改；
需要渲染器新能力（新着色器、后处理、贴图等）的，在 `docs/ART.md` 的「待工程实现」里列出来，由 Claude 落地。

## 硬规则

1. **模型、音乐、音效全部由代码生成**：不引入图片、模型文件、音频文件。第三方库只有 Three.js 与 Electron；新增库或素材需先征得项目负责人同意，并在 `docs/ART.md` 记录。
2. **Three.js 只通过 `node tools/vendor-three.js` 重新打包**（版本锁在 `package.json`），不要手改 `vendor/three.min.js`。
3. **新增 `js/` 文件**时，`preview.html` 和 `game.js` 两处都要加，顺序一致（check 会拦）。
4. **`sim.js` 不许碰画面 API**，否则无头数值测试跑不了。
5. 代码风格跟随现有文件：ES5 风格（`var`、IIFE、挂 `RW`），注释用中文，2 空格缩进。
6. 所有用户可见文案用简体中文。
7. 不要在逻辑里写死数值，放进 `data.js` 的表里。
8. **不碰任何有版权风险的内容**：不照搬其他游戏的数值表、源码、美术；不用仍在版权期内的作品、商标、真人肖像。玩法机制可以借鉴，数值自己设计、自己调平。

## 提交前

```bash
npm run check        # 必跑，几秒：语法 / 入口一致 / 模拟冒烟 / 包体
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

# 协作约定（Claude / Cursor / Codex 共用）

这份文件是所有 AI 助手和人共同遵守的项目规则。Codex 会自动读取本文件，Claude Code 通过 `CLAUDE.md` 引用它，Cursor 通过 `.cursor/rules/` 引用它。

## 项目是什么

「环带值守」：竖屏微信小游戏，低多边形 3D 守村。纯原生 JS，**没有构建步骤、没有运行时依赖**。
入口是 `game.js`（微信）和 `preview.html`（浏览器），两者按同一顺序加载 `js/` 下的脚本，全部挂在全局 `RW` 上。
玩法设计见 `DESIGN.md`，美术方向见 `docs/ART.md`。

| 文件 | 负责什么 |
|---|---|
| `js/data.js` | 所有数值表（英雄、武器、道具、敌人、波次、商店、广告位）。调数值只改这里 |
| `js/map.js` | 字符地图 |
| `js/sim.js` | 纯逻辑，不碰画面，可在 Node 里无头运行 |
| `js/platform.js` | 微信 / 浏览器差异封装（画布、触摸、存档、广告） |
| `js/gl3d.js` | 自研 WebGL 渲染器（着色器、网格构建器 `GB`、绘制） |
| `js/world3d.js` | 3D 场景：调色板 `PAL`、地形、低模、昼夜光照预设、镜头 |
| `js/render.js` | 2D 画面（WebGL 不可用时的退路）+ 3D 之上的特效层 |
| `js/ui.js` | HUD 与各页面界面 |
| `js/audio.js` | 程序化音效 |
| `js/main.js` | 主循环、输入分发 |

## 分工

| 角色 | 负责 | 通常改哪里 | 分支 |
|---|---|---|---|
| **Claude Code** | 工程搭建、渲染管线、系统性功能、收尾完善（修 bug、补测试、重构） | `tools/`、`.github/`、`gl3d.js`、`sim.js`、`main.js`，以及落实美术方案所需的代码 | `claude/*` |
| **你（Cursor）** | 微调：数值、手感、文案、小修小改 | `data.js`、`ui.js` 文案、任意小改动 | `main` 或自建分支 |
| **Codex** | 美术指导：定风格、调色板、光照氛围、模型造型、特效观感 | `docs/ART.md`、`world3d.js` 的 `PAL` 与昼夜预设、模型造型函数 | `codex/*` |

交接方式：美术方案先写进 `docs/ART.md`（要什么、参考、验收标准），能直接改颜色 / 造型的就直接改；
需要渲染器新能力（新着色器、后处理、贴图等）的，在 `docs/ART.md` 的「待工程实现」里列出来，由 Claude 落地。

## 硬规则

1. **画面全部运行时生成**：不引入图片、模型文件或第三方库。要破例需先征得项目负责人同意，并在 `docs/ART.md` 记录。
2. **微信主包 ≤ 4MB**，`node tools/check.js` 会统计。
3. **新增 `js/` 文件**时，`game.js` 和 `preview.html` 两处都要加，顺序一致（check 会拦）。
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
npm run dev          # 本地预览：http://localhost:8080/
```

CI（`.github/workflows/ci.yml`）在每个 PR 和 main 上跑以上检查，并把截图作为 `screenshots` 产物上传，
美术评审直接在 Actions 运行页面下载查看。

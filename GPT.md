# GPT 入口

先读根目录 `AGENTS.md`，遵守其中的硬规则和分工（尤其是「Grok 与 GPT 的边界」）。
GPT 负责：文案与界面文字（按钮、说明、提示、成就和道具描述、商店页文案），以及界面上的小修（换行、对齐、字数）。

要点：
- 改 `js/ui.js` 的文案和布局小改、`docs/STEAM.md` 的文案部分。
- **`js/data.js` 归 Grok，不直接改**。道具、成就等描述文字在 `data.js` 里的，把「原文 → 新文」写进 PR 描述，交给 Grok 合。
- `sim.js`、`gl3d.js`、`world3d.js`、`main.js`、`tools/` 归 Claude，不碰。
- 改完跑 `npm run check` 和 `npm run audit:ui`：文字出屏、按钮装不下、文字重叠都必须是 0。
- 保持 ES5 风格（`var`、IIFE、挂在全局 `RW` 上），不要引入 import/export、npm 运行时依赖或构建步骤。
- 文案用简体中文；界面坐标按逻辑分辨率 960×540（横屏）。
- 从 Claude 最新的集成分支拉新分支，只推 `gpt/*`（一个分支一件事，如 `gpt/copy-shop-tooltips`）；不推 `main`，不改别人的分支。
- 大改动（新界面、新系统、渲染）写成文档交给 Claude。

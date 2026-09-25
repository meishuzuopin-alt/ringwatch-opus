# Grok bot 组入口

先读根目录 `AGENTS.md`，遵守其中的硬规则和分工。Grok 接替原 Cursor 的位置，负责微调：数值、手感、文案、小修小改。

微调时的要点：
- 数值只改 `js/data.js`；改完跑 `npm run check`，影响难度的改动再跑 `npm run balance` 或 `npm run audit:game`。
- 改了界面跑 `npm run audit:ui`（文字出屏、按钮装不下、文字重叠都会被拦下）。
- 保持 ES5 风格（`var`、IIFE、挂在全局 `RW` 上），不要引入 import/export、npm 运行时依赖或构建步骤。
- 文案用简体中文；界面坐标按逻辑分辨率 960×540（横屏）。
- 玩家要求以 `docs/PLAYER-LOG.md` 为准（后面的条目覆盖前面的）；可做的点子见 `docs/DESIGN-BACKLOG.md` 第二类，待办见 `docs/AUDIT.md`。
- 改动推到 `grok/*` 分支（例如 `grok/tune-wave-12`），基于最新的 Claude 集成分支开；不要直接推 `main`，不要改别人的分支。
- 大改动（新系统、改 `sim.js` 结构、渲染）先写进文档交给 Claude，不要自己动。

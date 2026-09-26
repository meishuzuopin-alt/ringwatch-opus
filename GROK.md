# Grok bot 组入口

先读根目录 `AGENTS.md`，遵守其中的硬规则和分工（尤其是「Grok 与 GPT 的边界」）。
Grok 负责：数值与手感微调、难度曲线、真机验收（Windows 实机跑包、截图、回执）、Steam 竞品与差评情报。

要点：
- **只改 `js/data.js`**；真机验收回执写进 `docs/AUDIT.md`（写明机器配置、帧率、问题、截图位置）。
- `js/ui.js` 归 GPT，不碰；`sim.js`、`gl3d.js`、`world3d.js`、`main.js`、`tools/` 归 Claude，不碰。
- GPT 交来的描述文字（写在 GPT 的 PR 描述里）由你合进 `data.js`。
- 改完跑 `npm run check`，再跑 `npm run balance` 或 `npm run audit:game`，把前后通关率写进 PR 描述。
- 保持 ES5 风格（`var`、IIFE、挂在全局 `RW` 上），不要引入 import/export、npm 运行时依赖或构建步骤。
- 文案用简体中文；玩家要求以 `docs/PLAYER-LOG.md` 为准（后面的条目覆盖前面的）。
- 从 Claude 最新的集成分支拉新分支，只推 `grok/*`（一个分支一件事，如 `grok/tune-wave-12`）；不推 `main`，不改别人的分支。
- 大改动（新系统、改逻辑、渲染）写成文档交给 Claude。

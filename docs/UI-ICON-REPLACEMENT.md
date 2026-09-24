# UI 图标替换说明

运行时 UI 图标都由 `js/ui-icons.js` 绘制。该文件是独立美术替换点：不需要更改战斗、商店或页面逻辑。

## 如何替换

1. 打开 `js/ui-icons.js`，在 `ICONS` 表内找到对应的稳定 ID。
2. 修改条目的颜色、背景色、描边色和 `shape`，或修改 `paintShape` 中该形状的 Canvas 绘图。
3. 在 `preview.html` 与 `game.js` 两个入口中保留该脚本，且放在 `ui.js` / `render.js` 之前。
4. 运行 `npm run check`、`npm run test:flow` 和 `npm run shots`，逐页查看 `shots/art/`。

图标不允许改成外部位图或 SVG 文件；整套外观需要替换时，仍在这个独立源文件内用 Canvas 路径实现。

## 图标目录

| 类别 | ID |
|---|---|
| 武器 | `needle`, `scatter`, `blades`, `lance`, `arc`, `mines` |
| 主动技能 | `nova`, `veil`, `well`, `storm` |
| 建筑 | `sentry`, `pylon`, `siphon`, `barracks`, `mortar`, `ward`, `snare`, `beacon` |
| 装备 / 改造 | `fins`, `lens`, `hull`, `nano`, `magnet`, `whet`, `bracer`, `apple`, `feather`, `purse`, `herb`, `coil`, `sight`, `plate`, `greed`, `overclock`, `bounty`, `fang`, `cloak`, `maul`, `blueprint`, `powder`, `thornmail`, `piggy`, `prism`, `contract`, `clover`, `holy`, `drum`, `ember`, `heart`, `crown`, `belt`, `trident` |
| 界面 / 行为 | `ui-start`, `ui-hero`, `ui-howto`, `ui-sound`, `ui-music`, `ui-exit`, `ui-back`, `ui-pause`, `ui-resume`, `ui-build`, `ui-dash`, `ui-repair`, `ui-armor`, `ui-reroll`, `ui-next`, `ui-revive`, `ui-giveup`, `ui-retry`, `ui-home`, `ui-lock`, `ui-record`, `ui-kill`, `ui-wave`, `ui-shard`, `ui-core`, `ui-health`, `ui-evolution`, `ui-courtyard` |

不要移除列表中的 ID；页面持有这些 ID，替换时维持名称不变。可以更新 `shape`、颜色和绘制路径。

# M0 夜战规格书（3 分钟守桥）

> 依据：`docs/DESIGN_BIBLE_v1.md` §5.1 / §5.5 / §8 M0。字段全部**新增**在 `js/data.js`（PR #3 系列版本）的 `RW.NIGHT` 下，不改现有字段；沿用的现有字段写全名。时间单位：秒（与 data.js 一致），括号内为 ms。
> 数值为起步值，数值经济（`docs/specs/M0_NUMBERS.md`）调平后只改 `RW.NIGHT`。

## 1. 流程状态机

| 状态 | 进入条件 | 时长 | 退出 |
|---|---|---|---|
| `intro` | 开夜 | `RW.NIGHT.introSec` = 1.0 | → `battle`；可操作，不刷怪 |
| `battle` | intro 结束 | 夜钟到 `RW.NIGHT.duration` = 180 | 圣火 ≤ 0 → `lose`；夜钟 ≥ duration → `win` |
| `win` | 见上 | `RW.NIGHT.endSec` = 0.8 | 停刷怪，场上敌人 0.6 s 内全部碎裂（不计击杀）→ `result` |
| `lose` | 见上 | 0.8 | 敌人冻结，圣火熄灭动画 → `result` |
| `result` | — | — | 「再来一夜」→ `intro` |

- 夜钟按**模拟时间**走，顿帧期间不走。同一帧圣火 ≤ 0 与夜钟到点同时发生 → 判 `lose`（先结算伤害、再判圣火、再判夜钟）。
- M0 关闭：武器槽、Q/E/R 技能、大招、商店、重燃（`RW.NIGHT.rekindle` = 0）、暴击（`RW.NIGHT.slash.crit` = false）。英雄倒下沿用 `RW.RESPAWN`（`base` 5 s，`perWave` 忽略，`hp` 0.6，`inv` 2.5，`coreCost` 0.2）。
- 只开北桥：`RW.NIGHT.gate` = `'north'`；英雄出生 `RW.NIGHT.heroStart` = `'bridgeSouth'`（桥南端）。

## 2. 挥砍 `RW.NIGHT.slash`

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `dmg` | number | 24 | 基础伤害 |
| `interval` | s | 0.45 | 两次挥砍最短间隔 |
| `arc` | deg | 120 | 扇形角 |
| `radius` | px | 70 | 扇形半径（命中判定 `dist ≤ radius + e.r`） |
| `hitDelay` | s | 0.05 (50 ms) | 起手到判定 |
| `heavyEvery` | int | 3 | 每第 3 下为重击 |
| `heavyMul` | number | 1.8 | 重击伤害倍率 |
| `heavyKnockMul` | number | 2 | 重击击退倍率 |
| `chainReset` | s | 1.2 | 超过此时间没挥砍，重击计数归零 |
| `crit` | bool | false | M0 不吃 `RW.TUNE.player.crit` |

- 触发：冷却到且存在 `dist ≤ radiusEff + e.r` 的敌人 → 朝**最近敌人**方向挥；没有敌人不空挥。
- 伤害：`dmg × (重击?heavyMul:1) × nearMul × 战意倍率 × (翻盘超载中? comeback.dmgMul : 1)`，取整。
- `nearMul = 1 + near.bonus × clamp((near.r1 − d)/(near.r1 − near.r0), 0, 1)`，沿用 `RW.CLASSES.mage.near`（r0 60 / r1 200 / bonus 0.4）；战意沿用 `RW.TUNE.momentum.dmg`。
- `radiusEff = radius × (超载中 ? overload.slashRadiusMul : 1)`。

## 3. 打击反馈

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `hitstop.hit` | s | 0.06 (60 ms) | 普通命中顿帧（一次挥砍只顿一次，取最大） |
| `hitstop.heavy` | s | 0.10 | 重击 |
| `hitstop.kill` | s | 0.10 | 击杀 |
| `hitstop.capPerSec` | s | 0.20 | 滑动 1 s 窗口累计上限，超出部分截掉 |
| `knock.normal` / `.elite` / `.boss` | px | 40 / 12 / 0 | 击退距离，0.12 s 内缓出 |
| `dmgText.max` | int | 40 | 同屏上限，超出回收最旧 |
| `dmgText.life` | s | 0.7 | 淡出 |
| `dmgText.color` / `.heavyColor` | hex | `#ffffff` / `#ffa24a` | 不用红、不用金 |
| `dmgText.heavyScale` | number | 1.25 | 重击字号倍率 |
| `shatter.shards` | [min,max] | [6,10] | 墨屑片数 |
| `shatter.embers` | [min,max] | [1,3] | 余烬粒数 |
| `shatter.life` | s | 0.6 | 消散时间 |

## 4. 敌人与刷怪

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `enemies.mite.hp` | number | 30 | 小鬼（两刀）；其余属性沿用 `RW.ENEMIES.mite` |
| `enemies.dasher.hp` | number | 60 | 狼骑 |
| `enemies.spitter.hp` | number | 45 | 暗弓手 |
| `enemies.warden.hp` | number | 300 | 精英（暗影术士） |
| `spawn` | array | 见下 | `[t0, t1, {type: 每秒}]` 段；累加器刷，确定性 |
| `bursts` | array | 见下 | `[t, type, n]` 一次性潮涌 |

默认 `spawn`：`[0,60,{mite:1.2}]`、`[60,120,{mite:0.5,dasher:0.2,spitter:0.15}]`、`[120,160,{mite:0.5,dasher:0.1}]`、`[160,180,{mite:1.5,dasher:0.25,spitter:0.25}]`；
默认 `bursts`：`[0.5,'mite',3]`（保证 5 s 内首杀）、`[125,'warden',1]`、`[145,'warden',1]`、`[150,'mite',12]`、`[160,'mite',20]`。合计 ≈ 221 只。

## 5. 圣火、连击、超载

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `flame.hp` | number | 1000 | 圣火生命（M0 不用 `RW.TUNE.core.hp`） |
| `flame.touchDmg` | number | 20 | 敌人摸到圣火扣血，该敌人消失（不计击杀、不断连击） |
| `flame.eliteTouchMul` | number | 5 | 精英摸火 ×5 |
| `combo.window` | s | 2.0 | 距上次计数击杀 ≤ 2.0 s 则连击 +1，否则归零 |
| `combo.countTowers` | bool | false | 塔的击杀不计连击（英雄挥砍、超载冲击波计） |
| `overload.threshold` | int | 50 | 触发连击数 |
| `overload.duration` | s | 8 | 持续 |
| `overload.cooldown` | s | 45 | 从起爆算起 |
| `overload.towerRateMul` | number | 2 | 全塔射速倍率 |
| `overload.slashRadiusMul` | number | 1.4 | 挥砍半径倍率 |
| `overload.shockDmg` | number | 60 | 起爆全场冲击波，击退按 `knock` |
| `comeback.flameBelow` | ratio | 0.3 | 圣火低于 30% 时启用翻盘 |
| `comeback.thresholdMul` | number | 0.5 | 下一次超载阈值 ×0.5（50→25） |
| `comeback.dmgMul` | number | 1.5 | 该次超载期间挥砍与冲击波伤害倍率 |
| `comeback.perNight` | int | 1 | 每夜次数 |
| `towers` | array | `[{kind:'sentry',tier:1},{kind:'sentry',tier:1}]` | M0 预置塔（位置取白盒地图 `T` 格；无 `T` 时放圣火 (±90, −60)），数值沿用 `RW.TOWERS.sentry` |

- 超载触发：`!active && cooldownLeft ≤ 0 && combo − comboAtLastTrigger ≥ 阈值`。起爆后连击不清零；连击断了 `comboAtLastTrigger` 归 0。
- 夜结束时超载立即结束。

## 6. 结算面板（7 字段 ≤ 8）`RW.NIGHT.result`

| 字段 | 默认/来源 | 说明 |
|---|---|---|
| 结果 | 守住 / 熄灭 | — |
| 用时 | 夜钟秒数 | 熄灭时为坚持的秒数 |
| 击杀数 | 全部击杀（含塔） | — |
| 最高连击 | `maxCombo` | — |
| 超载次数 | `overloads` | — |
| 圣火剩余 | 百分比取整 | — |
| 星级 | `stars` = [0.7, 0.4] | 守住：≥70% 三星、≥40% 两星、否则一星；熄灭 0 星 |

`result.showDelay` = 0.8 s（结束后 ≤ 1 s 出面板）；`result.restartLock` = 0.3 s 后「再来一夜」可点（Enter / Space / 手柄 A）。

## 7. 事件名（音频 / 特效订阅）
`slash`、`slashHeavy`、`hit`、`shatter`、`comboUp`、`comboBreak`、`overloadStart`、`overloadEnd`、`nightWin`、`nightLose`。

## 8. 验收清单
- [ ] 上表每个字段都在 `RW.NIGHT` 里，改值即生效，无硬编码。
- [ ] 首杀 ≤ 5 s；每秒顿帧累计 ≤ 200 ms；同屏数字 ≤ 40。
- [ ] 超载按 §5 条件触发、冷却从起爆算；翻盘每夜最多 1 次。
- [ ] 同帧熄灭与到点判 `lose`；结束 ≤ 1 s 出面板，≤ 3 s 可重开。
- [ ] `sim.js` 无头跑完 180 s（`npm run check` 通过）。

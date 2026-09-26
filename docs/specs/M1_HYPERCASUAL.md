# M1 超休闲玩法规格（竖屏 · 单指）

> 依据：`docs/DESIGN_BIBLE_v1.md` §2.3 / §5.2 / §8 M1。战斗核心复用 `RW.NIGHT`（见 `M0_NIGHT_BATTLE.md`）；本模式只用覆盖表 `RW.HC`（新增于 `js/data.js`）。守卫第 4 种按命名决定为「炉卫」（id `brazier`）。

## 1. 流程

| 状态 | 时长 | 操作 / 退出 |
|---|---|---|
| `title` | — | 点任意处 → `round`（首启直接进 `round`） |
| `round` | `RW.HC.roundSec` = 45 | 单指拖英雄；到点 → `win`；圣火 ≤ 0 → `revive`（可用时）否则 `lose` |
| `revive` | `revive.promptSec` = 5 | 看完视频 → 回 `round`；倒计时完 / 点 × → `lose` |
| `win` / `lose` | 0.8 | → `result` |
| `result` | — | 金币入账、×2 按钮、▶ 继续 → `board` |
| `board` | 不限时 | 召唤 / 合成；▶ → 下一关 `round` |

## 2. 字段

| 字段 | 类型 | 默认 | 含义 |
|---|---|---|---|
| `roundSec` | s | 45 | 默认局长 |
| `levelRoundSec` | s[] | [30, 30, 45, 60, 60] | 5 关局长（关卡设计可改） |
| `spawnTimeScale` | 公式 | roundSec / `RW.NIGHT.duration` | 刷怪时间轴按比例压缩 |
| `spawnRateMul` | number | 1.6 | 压缩后每秒刷怪 ×1.6（45 s ≈ 88 只） |
| `overload` | 覆盖 | `{threshold:20, duration:5, cooldown:15}` | 短局版超载 |
| `drag.maxDrag` | px | 60 | 手指离按下点 ≥ 60 px 为满速（浮动摇杆，与现有一致） |
| `drag.deadzone` | px | 6 | 死区；松手原地站桩 |
| `slots.count` | int | 6 | 圣火周围守卫格 |
| `slots.radius` | px | 84 | 六边形半径，第 0 格在正上方，顺时针 |
| `guards` | 表 | 见 §3 | 四守卫三阶 |
| `summon.baseCost` | int | 10 | 首次召唤价 |
| `summon.growth` | ratio | 0.15 | 第 n 次价 = round(10 × 1.15ⁿ)，跨关累计 |
| `summon.firstPair` | bool | true | 存档第 2 次召唤必与第 1 次同种（保证首局能合成） |
| `merge.maxTier` | int | 3 | 两名同种同阶 → 升一阶 |
| `gold.start` | int | 25 | 初始金币（够召唤 2 次：10 + 12） |
| `gold.perKill` | int | 1 | 每杀 |
| `gold.winBonus` | int | 20 | 胜利加成；失败保留击杀金币 |
| `revive.flameRestore` | ratio | 0.5 | 复活时圣火回到 50% |
| `revive.perRound` | int | 1 | 每局 1 次 |
| `revive.clear` | px | 170 | 清掉圣火周围小怪（同 `RW.REKINDLE.clear`） |
| `revive.invuln` | s | 2.0 | 圣火无敌 |
| `double.mul` | int | 2 | 本局金币（击杀 + 胜利）×2，每次结算 1 次 |
| `firstAdRound` | int | 2 | 第 1 局不出任何广告入口 |
| `adSlots` | string[] | `['REWARD_REVIVE','REWARD_DOUBLE']` | **只允许这两个激励视频位**；`RW.AD.REWARD_REROLL` 在本模式不渲染 |
| `RW.AD.REWARD_DOUBLE` | string | `''` | 新增广告位 ID；留空 = 预览发放（沿用 `RW.AD` 规则） |
| `interstitial` | 表 | `{enabled:false, fromRound:3, gapSec:60}` | 插屏默认关；战斗中绝不弹 |

## 3. 守卫（站在格内不移动，射程内自动攻击；倒下的本局不再出手，下一局满血回来）

| id | 名 | 1 / 2 / 3 阶 | 攻击间隔 | 特点 |
|---|---|---|---|---|
| `guard` | 盾卫 | 生命 200 / 420 / 900，伤害 8 / 16 / 34 | 0.8 s | 嘲讽半径 70，受伤 −30%；3 阶盾冲 |
| `spear` | 枪兵 | 伤害 18 / 38 / 80，生命 120 / 250 / 520 | 0.7 s | 打精英 ×1.6；3 阶一次三刺 |
| `archer` | 弓手 | 伤害 12 / 26 / 55，生命 80 / 170 / 360 | 0.9 s | 射程 160；3 阶双发 |
| `brazier` | 炉卫 | 伤害 10 / 22 / 48（范围 50），生命 90 / 190 / 400 | 1.6 s | 射程 120；3 阶每 10 s 回圣火 2% |

- 格满且无可合成对：召唤按钮变灰并对最低阶守卫播合成提示；全部 3 阶时按钮显示皇冠，不可召唤。

## 4. 无文字教学：视觉提示（替代全部文字）

| 时机 | 提示 | 消失条件 |
|---|---|---|
| 首次 `round` 0 s | 半透明**幽灵手**按住英雄往桥头拖，循环 1.2 s | 第一次触摸；静止 3 s 再出现 |
| 敌人在屏外 | 屏幕边缘红色箭头（红只给危险） | 敌人进屏 |
| 圣火受击 | 火焰缩小 + 圆环血条变短、闪一下 | — |
| 局时 | 顶部弧形月轮逐渐变亮（天亮 = 赢） | — |
| `board` 有空格且钱够 | 空格呼吸高亮；召唤按钮跳动（金币图标 + 价格数字） | 召唤 |
| 首次出现可合成对 | 幽灵手把一名守卫拖到同伴身上 | 第一次合成 |
| 拖动守卫 | 同种同阶守卫发光 + 连线；其他变暗 50% | 松手 |
| 悬停在可合成目标 | **合成预览**：目标上方显示下一阶剪影 + ↑ | 松手合成 / 移开 |
| 松在不可合成处 | 守卫弹回原格 | — |
| `revive` | 熄灭的火盆 + ▶ 视频图标 + 5 s 圆形倒计时；右上小 × | 选择 |
| `result` | 金币堆飞入计数；「▶ ×2」按钮（金色=奖励）；▶ 继续 | 点击 |

## 5. 验收清单
- [ ] 5 名首次玩家不看任何文字，3 秒内开始拖英雄（录屏）。
- [ ] 首局能合成 1 次（`gold.start` + `firstPair`）；广告位全局只有复活、翻倍两处，grep 不到第三个激励位调用。
- [ ] 激励视频未看完不发奖 100%；战斗中 0 次广告；第 1 局无广告入口。
- [ ] 以上字段全部在 `RW.HC` / `RW.AD`，Steam 构建不包含 `RW.HC.adSlots` 相关代码。

# 手感常量表（v1，需与打击特效共订）
> 新建。来源：§5.1、§8 M0#3；现有字段来自 `RW.TUNE.hitstop`（main data.js，单位是帧 @60fps）；屏震和伤害数字的现有值是 `js/sim.js` 里的硬编码字面量。数值表：`FEEL_CONSTANTS.csv`。

**范围**：顿帧、击退、屏震、伤害数字。每项都有默认值、可调范围、每秒上限。
**验收**：逐帧录屏时四项都可见；**每秒顿帧累计 ≤200 ms**（滚动 1 s 窗口）；150 只同屏时伤害数字 ≤40 个、每秒新生成 ≤30 个；屏震强度 ≤1，每秒叠加 ≤1.0。

## 关键公式
- 顿帧：`G.stop(frames)` 在 `hitstop.gap` 以外再加一道预算：`sum(frames/60 in last 1s) + new ≤ budget(0.2)`，超了就丢弃；`force`（精英/Boss 击杀）不计入预算。只有 gap 时的最坏情况是 3 帧/0.12 s ≈ 417 ms/s，已超标。
- 击退：位移 ≈ knock × knockRes × 0.1086；每只敌人每秒累计 ≤120 px。
- 屏震：`shake = min(1, shake + add)`，每秒衰减 2.6，振幅 = shake × maxPx × 设置系数。
- 数字：同目标 0.1 s 内的伤害合并成一个；超出 max/perSec 时累加到最近的那个数字上。

## NEEDS_VFX_CONFIRM
顿帧 hit/kill/heavy 帧数；屏震 maxPx 与各事件强度；数字合并窗口、寿命、上升速度、颜色、重击字号。

## ASSUMPTION
A1 没有读 `render.js`，屏震像素振幅 8px 是假设。A2 预算只在 M0 夜战生效。A3 重击顿帧 3→6 会影响旧波次模式，建议放在夜战覆盖表里。

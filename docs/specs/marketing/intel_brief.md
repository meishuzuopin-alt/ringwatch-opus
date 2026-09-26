# 品类情报简报（DRAFT，1 页）· 2026-09-26（UTC+8）

> 规则：每个数字都附来源链接和日期；找不到来源的写「未找到可靠来源」。「访问」= 2026-09-26 查阅，原文没标发布日期时注明。
> **注意：手机超休闲的 CPI / 次留（D1）不能直接套到 Steam。** 它们只用来衡量 M1 手机测试包；Steam 买断版看的是愿望单、Demo 时长和转化，两边的用户、付费模式和获客渠道都不同。

## A. 超休闲发行商门槛（美国，手机）
| # | 数字 | 来源 | 日期 |
|---|---|---|---|
| 1 | Supersonic：原型 CPI 目标 **< $0.30**；Android **D1 ≥ 38%** | https://supersonic.com/learn/blog/the-3-most-important-kpis-for-testing-your-hyper-casual-prototype/ | 原文未标发布日期；访问 2026-09-26 |
| 2 | Supersonic（Game Developer 专栏）：过市场测试一般 **CPI ≤ $0.25**；**> $0.40–0.45** 建议换题；D1 **40–50%**、D7 **10–15%** | https://www.gamedeveloper.com/design/how-to-speed-up-your-hyper-casual-game-s-launch-at-every-step-of-the-publishing-process | 原文未标发布日期；访问 2026-09-26 |
| 3 | Voodoo：门槛从 55% D1 / 22% D7 / CPI < $0.25 放宽到 **45% D1、13% D7、$0.20 CPI** | https://www.gamedeveloper.com/production/shaking-up-measurability-with-flexible-kpis | 文中写的是 2020 年；访问 2026-09-26 |
| 4 | Azur Games：**R1 35% 算「边缘」**（R7 7%）；美国 CPI **< $0.20** 算低 | https://azurgames.com/blog/why-cpi-is-not-that-important-for-hyper-casual-or-what-metrics-were-looking-at/ | 原文未标发布日期；访问 2026-09-26 |
| — | SayGames、Homa、Kwalee、CrazyLabs 的公开门槛；AppsFlyer / Liftoff / Adjust 的 2025–2026 品类 CPI | 未找到可靠来源（按范围收缩，这次没有检索） | — |

## B. Steam 愿望单基线（How To Market A Game / Chris Zukowski）
| # | 数字 | 来源 | 日期 |
|---|---|---|---|
| 5 | 商店页上线时拿到的愿望单：铜 100 / 银 500 / 金 1,200 / 钻 7,000 | https://howtomarketagame.com/benchmarks/ | 研究日期 2022-08；访问 2026-09-26 |
| 6 | 正式发售时的愿望单分档：铜 5,000 / 银 8,000 / 金 50,000 / 钻 90,000 | 同上 | 2026-06 更新；访问 2026-09-26 |
| 7 | 2026 年 2 月新品节期间新增愿望单：中位数 **806**，70 分位 **1,839** | https://howtomarketagame.com/2026/04/13/making-sense-of-the-february-2026-steam-next-fest/ | 2026-04-13 |
| 8 | 新品节前总愿望单是表现的最强相关因素（Spearman r = 0.825）；**节前至少 2,000+** 更容易表现好 | https://howtomarketagame.com/2025/03/26/benchmarks-how-many-wishlists-can-i-get-from-steam-next-fest/ | 2025-03-26 发布，数据含 2026-02 |
| 9 | 发售首周愿望单转化：发售时 < 4,999 愿望单的游戏，中位数 **15%**（Simon Carless） | https://howtomarketagame.com/benchmarks/ | 研究日期 2020-06；访问 2026-09-26 |
| — | 商店页上线后「8 周内」的愿望单分布 | 未找到可靠来源（#5 是上线期的数字，没有明确写成 8 周） | — |

## C. 第 8 节 M1 校准表
| 指标 | §8 暂定值 | 有来源的基准范围 | 建议 | 理由 |
|---|---|---|---|---|
| CPI（美国，手机） | ≤ $0.40 | 通过线 $0.20–0.30（#1–#4）；> $0.40–0.45 放弃（#2） | **下调**：≤ $0.30 为通过；$0.30–0.40 继续改创意；> $0.40 换钩子 | $0.40 已经在「建议换题」的边界上，拿它当通过线太松 |
| D1 次留（手机） | ≥ 35% | 35% 算「边缘」（#4）；目标 38–50%（#1–#3） | **上调**：目标 ≥ 40%，35% 只当最低线 | 35% 是发行商眼里的边缘值，签不到发行 |
| Steam 愿望单（8 周） | ≥ 2,000 | 上线期金档 1,200、钻档 7,000（#5）；新品节前 ≥ 2,000 表现更好（#8） | **保持 2,000** | 高于上线期金档，偏进取；但它刚好是 M2 新品节前需要的底线，发售前还要往 5,000+ 走（#6） |

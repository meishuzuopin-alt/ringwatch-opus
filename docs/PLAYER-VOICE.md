# 玩家之声：同类游戏的差评痛点，逐条弥补

目标：Steam「好评如潮」（近期或全部评测 ≥ 95% 好评，且 ≥ 500 篇）。同类游戏里，最大的扣分项往往不是玩法不好玩，而是「明明很好玩，却被某个细节劝退」。这份文件把这些「恨铁不成钢」的地方逐条列出来，写明我们怎么做、做到哪一步。

## 一、怎么收集的

- **这一轮**：云端会话的网络策略拦截了 `store.steampowered.com` 和 `steamcommunity.com`，没法直接抓评测原文。所以用网页搜索汇总了 Steam 评测、Steam 讨论区、Metacritic、TapTap、知乎、豆瓣和媒体评测里反复出现的抱怨，来源列在文末。只记录主题，不照搬评论原文。
- **以后**：`npm run voice`（`tools/steam-voice.js`）直接从 Steam 的公开评测接口抓差评（中文和英文），按下表的主题计数，把明细写到 `shots/voice/report.json`。在自己电脑上就能跑；云端会话需要在环境网络设置里放开 `store.steampowered.com`。
- **上架后**：把我们自己的 appid 加进 `tools/steam-voice.js` 的 `APPS`，每个版本发布前跑一次。新出现的痛点补进下表，这就是「无限优化」的固定流程。

对标游戏：土豆兄弟、王权陨落、吸血鬼幸存者、苦痛殿堂、黎明前20分钟、深岩银河：幸存者、灵魂石幸存者、王国两位君主，另有移动端的 Squad Busters（它不在 Steam，用应用商店和 Metacritic 的评价）。

## 二、痛点总表

状态：✅ 已做（本分支）　🔶 部分做了　📅 已排进路线图（白皮书第 12 节）

| # | 痛点 | 被骂的游戏 | 我们怎么做 | 状态 |
|---|---|---|---|---|
| 1 | **商店太随机**：打到第 20 波都凑不齐想要的东西；高难度像在撞运气 | 土豆兄弟（差评第一大原因）、Squad Busters | 锁定、刷新保留。武器按「你已经在走的流派」加权 ×1.8，能升阶的再 ×1.6。缺进化道具时，连续 2 次整备没刷到就保底放一件（`RW.SHOP_BIAS`）。实测聪明买机器人平均每局进化 1.88 → 2.73 把 | ✅ |
| 2 | **后期满屏特效看不清自己**，光污染、闪得眼睛疼 | 吸血鬼幸存者、黎明前20分钟、同类普遍 | 设置页：特效亮度（压叠加发光层，最低 30%）、闪光强度（可关）、屏幕震动（可关）、伤害数字（全部 / 只看暴击和受伤 / 关）、主角脚下光圈（默认开） | ✅ |
| 3 | **光敏不友好**：没有减少闪烁的选项 | 同类普遍（新作开始标配） | 同上「闪光强度」可以调到 0。另建议 Steam 商店页写明光敏提示 | ✅ |
| 4 | **退出就丢进度**，手机切后台也丢；有的游戏「返回主菜单」不存档 | 土豆兄弟（讨论区多次反馈）、吸血鬼幸存者移动版 | 每次进整备或祝福时自动存档，标题页「继续上局」。死亡、通关时删除，不能靠读档反悔；读档后刷出的货和不退出时一样。桌面版存档先写临时文件再改名，并保留一份 `.bak`，坏档时自动用备份 | ✅ |
| 5 | **手柄 / Steam Deck 支持差**：部分菜单手柄点不到，右摇杆不能手动瞄准，扳机键卡住 | 黎明前20分钟、土豆兄弟 | 战斗全手柄：左摇杆移动，A / RT 冲刺，X / Y / B 放技能，LB 造塔（十字键选种类），菜单键暂停。**所有菜单**都能用十字键或摇杆移动焦点（金边框），A 确认，B 返回 | ✅（手动瞄准见 #11） |
| 6 | **卡顿**：后期怪多、特效多就掉帧 | 吸血鬼幸存者、深岩银河：幸存者 | 对象池、同屏敌人上限、画质自动降级（已有）。新增性能预算测试：满屏敌人时每帧模拟必须低于 4 ms（实测约 0.2 ms），每次提交都跑 | ✅ |
| 7 | **说明看不懂**：道具怎么叠加、属性管什么，要去查维基 | 土豆兄弟（讨论区与创意工坊「改进提示」模组） | 每张卡的「强 / 弱」由数值自动生成，不会和实际不一致（已有）。整备页新增「属性说明」：每个属性一句话讲清公式和上限，旁边标出当前值 | ✅ |
| 8 | **花钱买了却没效果** | 通用（最伤口碑的 bug） | 这次自查发现：商店买的新技能不会进 Q/E/R 槽，花了钱放不出来。已修复，新技能替换最近放过的那一招，同名技能升阶，并加了测试 | ✅ |
| 9 | **重开太慢**：死了还要一路点回去 | 通用 | 结算页「同设置再来」（英雄、危险、变异器都不变，Enter 即可）；暂停页「重新开始」 | ✅ |
| 10 | **死得不明不白**：屏幕外的伤害、秒杀 | 同类普遍、土豆兄弟（关灯机制被骂） | Boss 砸地红圈、冲撞线、精英预警、屏幕边缘箭头、结算页「最后受到的伤害」和对应提示（已有）。平衡机器人会躲这些预警，仍能达到目标通关率，说明预警足够。不做「关灯」这类强行降低可见度的机制；「夜行」只是可选变异器 | ✅ |
| 11 | **自动瞄准打错目标**，想手动瞄准 | 土豆兄弟、Squad Busters、1 Bit Survivor | 现在按最近的敌人瞄准。计划加瞄准偏好（最近 / 精英优先 / 圣火附近优先），手柄右摇杆可临时手动瞄准 | 📅 M2 |
| 12 | **近战没用、九成武器手感一样** | 土豆兄弟、深岩银河：幸存者 | 11 把武器分近战 4 / 远程 4 / 法术 3，攻击方式有扇形横扫、旋转、贯穿、连跳、布雷、散射，各不相同。近战套装给护甲和吸血，平衡机器人里近战英雄（盾骑士、狂战士）通关率不低于远程 | 🔶 还要按武器单独统计强度 |
| 13 | **养成太肝、开局太慢** | 苦痛殿堂、灵魂石幸存者 | 局外不卖数值，只解锁内容（白皮书第 8 节）。开局 1 秒进战斗，第 1–2 波各 20、22 秒。英雄解锁条件就是正常玩的里程碑 | ✅ |
| 14 | **内容少、太短、重复** | 王权陨落（抢先体验期）、吸血鬼幸存者、Squad Busters | 20 波闭环 + 无尽、10 个英雄、危险 0–5、8 个变异器、每日挑战、40 个成就（已有）。第 2–5 张地图、再 10 个英雄、道具扩到 100 件 | 🔶 📅 M3 |
| 15 | **难度跳崖**：前面太简单，后面突然打不过 | 王权陨落、土豆兄弟 | 平滑的血量曲线 + 防御成长，机器人实测没有「某一波集体暴毙」的硬墙（白皮书 6.4） | ✅ |
| 16 | **复活等太久**、空等时间 | 王权陨落（20 秒复活） | 第 4 波起每局一次原地复活，立刻回到战斗。整备没有倒计时 | ✅ |
| 17 | **后期资源没处花** | 深岩银河：幸存者 | 金币始终有去处：圣火升级、建筑、科技、刷新；通关后有无尽 | ✅ |
| 18 | **收费恶心、付费变强** | Squad Busters | Steam 版买断，没有内购，没有广告，局外不卖数值 | ✅ |
| 19 | **停更、bug 不修** | 黎明前20分钟 | 每次提交都跑自检、玩法闭环测试（227 项）、浏览器流程、桌面冒烟；公开路线图，版本更新写更新日志 | 🔶 上架后执行 |
| 20 | **翻译差** | 中文玩家对海外游戏的常见抱怨 | 中文是原生语言；英文版文案表在上架前做（白皮书 M4） | 📅 M4 |
| 21 | **没有联机** | 土豆兄弟（中文玩家反馈） | 本地双人合作列入候选，不影响单机平衡 | 📅 待定 |
| 22 | **期望不符**：以为是一路无敌的割草，结果要守家 | 深岩银河：幸存者 | 商店页和预告片第一段就展示「守圣火 + 割草」；标题页一句话说明 | 📅 商店页 |

## 三、这一轮改了什么（代码位置）

- 设置页：`RW.SETTINGS`（`js/data.js`）、`UI.settingsPanel`（`js/ui.js`）；渲染层读 `RW.opt`（`js/render.js`、`js/world3d.js`、`js/gl3d.js` 的 `GL.addK`）；音量三条总线 `S.setVolumes`（`js/audio.js`）。
- 局中存档：`G.saveRun` / `G.loadRun`（`js/sim.js`），存档键 `ringwatch_run_v1`（`js/main.js`）；桌面版备份档（`desktop/main.js`）。
- 手柄：`Plat.pad`（`js/platform.js`）、`pollPad` 与焦点导航（`js/main.js`）、金边焦点框 `UI.focusRing`。
- 商店手气：`RW.SHOP_BIAS`、`G.pickWeapon`、`G.evolvePity`。
- 技能槽修复：`G.setSkill`、`G.skillById`。
- 属性说明：`RW.STAT_DESC`、`UI.statsPanel`。
- 快速重开：结算页 `retry`、暂停页「重新开始」「退出到标题」。
- 测试：`tools/simtest.js` 新增技能槽、存档读档、性能预算；`tools/flowtest.js` 新增设置、继续上局、属性说明、手柄。

## 四、固定流程（每个版本）

1. `npm run voice`：看同类游戏和我们自己的差评，新痛点补进第二节。
2. `npm run check`（含玩法闭环与性能预算）、`npm run test:flow`、`npm run balance`。
3. 对照第二节，把 🔶 和 📅 的条目推进一格，更新状态。
4. 上架后，好评率掉到 95% 以下时，优先处理近 30 天差评里占比最高的主题。

## 来源（本轮网页搜索）

- 土豆兄弟：[差评（最有价值）](https://steamcommunity.com/app/1942280/negativereviews/?browsefilter=toprated)、[讨论：太依赖随机](https://steamcommunity.com/app/1942280/discussions/0/4555968543714599514/)、[讨论：平衡](https://steamcommunity.com/app/1942280/discussions/0/6363076374193408360/)、[讨论：手柄没有手动瞄准](https://steamcommunity.com/app/1942280/discussions/0/3548301990162477364/)、[讨论：Steam Deck 移动问题](https://steamcommunity.com/app/1942280/discussions/0/4696784170963326862/)、[讨论：波间存档](https://steamcommunity.com/app/1942280/discussions/0/3363649883734762509/)、[讨论：丢进度](https://steamcommunity.com/app/1942280/discussions/1/769679119154810245/)、[创意工坊：改进提示](https://steamcommunity.com/sharedfiles/filedetails/?id=3019195689)、[中文差评](https://steamcommunity.com/app/1942280/negativereviews/?l=schinese)、[TapTap 评价](https://www.taptap.cn/app/721171/review)、[知乎：个人感受](https://zhuanlan.zhihu.com/p/654747229)
- 王权陨落：[讨论：游戏时长](https://steamcommunity.com/app/2239150/discussions/0/3809532960784976976/)、[讨论：反馈](https://steamcommunity.com/app/2239150/discussions/0/3807282428850332113/)、[讨论：25 小时后的反馈](https://steamcommunity.com/app/2239150/discussions/0/3820795764932980766/)、[豆瓣](https://www.douban.com/game/36463515/)
- 吸血鬼幸存者：[Pocket Gamer 评测](https://www.pocketgamer.com/vampire-survivors/review/)、[机核评测](https://www.gcores.com/articles/160646)、[TapTap 评价](https://www.taptap.cn/app/262197/review)
- 苦痛殿堂：[讨论：中期进度停滞](https://steamcommunity.com/app/2218750/discussions/0/591768102733147050/)、[讨论：成长太慢](https://steamcommunity.com/app/2218750/discussions/0/3803902423392193504/)
- 黎明前20分钟：[讨论：两个大问题](https://steamcommunity.com/app/1966900/discussions/0/3828662280416546173/)
- 深岩银河：幸存者：[讨论：玩家看法](https://steamcommunity.com/app/2321470/discussions/0/4289187252717297167/?l=english)
- 灵魂石幸存者：[讨论：成长系统](https://steamcommunity.com/app/2066020/discussions/0/603018051014667712/)、[Backloggd 评价](https://backloggd.com/reviews/everyone/eternity/liked:asc/soulstone-survivors/)
- 王国两位君主：[讨论](https://steamcommunity.com/app/701160/discussions/0/3198119216799564125/)
- Squad Busters：[Metacritic 用户评价](https://www.metacritic.com/game/squad-busters/user-reviews/)、[TapTap 评价](https://www.taptap.io/app/289677/review)
- 同类通用：[ASCII Survivors 的无障碍选项](https://store.steampowered.com/app/4588220/ASCII_Survivors/)、[1 Bit Survivor](https://play.google.com/store/apps/details?id=com.AcherontiGames.OneBitSurvivor&hl=en)

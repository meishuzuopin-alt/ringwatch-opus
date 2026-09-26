# 圣火守护者 · Steam 主视觉与胶囊图规格（DRAFT）

> 状态：**DRAFT / 草案**，未经负责人审阅，不得上传。日期：2026-09-26（UTC+8）。起草：宣发主视觉·增长情报。
> 尺寸依据：`docs/STEAM.md`（PR #3 分支 `claude/gift-card-balance-usage-4coauk`）；STEAM.md 未列的「库页眉 920×430」「页面背景 1438×810」按 Steamworks 官方文档补充：
> - 商店素材：https://partner.steamgames.com/doc/store/assets/standard （访问 2026-09-26）
> - 库素材：https://partner.steamgames.com/doc/store/assets/libraryassets （访问 2026-09-26）

## 0. 通用规则
- 主题（设计总纲 §1、§5.15）：守住夜里唯一的暖光；C1「光即色彩」——圈内暖色手绘、圈外冷靛墨影；敌人是墨色剪影、眼睛发光。
- Steam 规则：胶囊图上除游戏名外**不得有任何文字**（不放标语、引语、奖项）；库主视觉 **不得含任何文字**；截图只能是实机画面。
- 字体只用已登记 Noto：标题 Noto Serif SC Black 900（`fonts/fg-serif-900.woff2`，游戏内名 FG Serif），英文副标 Noto Sans SC Bold。
- 只用原创或已登记素材：程序化背景 + `docs/ART.md`「AI 素材」已登记精灵图（hero / grunt / elite / boss）。AI 提示词不写任何竞品名、在世艺术家、商标、真人（§10.1）。
- 概念主视觉 = **目标帧 / Coming**，不能当截图用；**截图位留空：TODO，必须由游戏测试用实机 1920×1080 采集（≥5 张）**。
- 上传前删掉所有 DRAFT 角标。

## 1. 调色板与色彩心理
| 角色 | HEX | 用途 | 色彩心理理由 |
|---|---|---|---|
| 夜空顶 | `#080A20` | 天空上沿 | 深冷色 = 威胁与未知，把注意力推向唯一的暖色 |
| 地平线靛蓝 | `#1E2654` | 远景、圈外地面 | 冷靛蓝是 C1「圈外」色；和橙色互为补色，对比最强 |
| 墨影 | `#06071A` | 敌人剪影 | 剪影不抢细节，只读轮廓 = 危险但不血腥（适合全年龄截图标记） |
| 余烬橙 | `#FF7A1A` | 火焰外层、标题辉光 | 橙 = 温暖、行动、紧迫；在缩略图网格里跳出冷色背景 |
| 火焰中层 | `#FFB23F` | 火焰、光圈 | 希望 / 守护；和靛蓝的互补对比让火成为唯一视觉中心 |
| 白热芯 | `#FFF1C1` | 火芯、标题渐变顶 | 最高亮度点 = 视线落点 |
| 标题描边 | `#1A0C06` | 字标外描边 | 深暖棕比纯黑柔和，任何背景上都能拉开明度差 |
| 黄铜 | `#B9894F` | 火盆、UI 呼应 | 与游戏内木框金边 UI（docs/ART.md）一致，品牌统一 |
| 禁用 | 危险红 `#FF3B3B`、奖励金 | 不做装饰 | 美术圣经硬规则：红只给危险、金只给奖励 |

结论：一张「冷夜 + 一团暖火」的高明度对比图，缩到列表大小时只剩「黑底一团火 + 暖白大字」，这正是要被记住的东西。

## 2. 母版 KV 生成提示词（草稿，供 GenerateImage 或美术手绘使用）
> 本次未能调用 GenerateImage（执行环境没有这个工具），已有的 PNG 是用程序化渲染 + 已登记精灵图做的替代草稿。以下提示词留给有生图工具的一轮使用，生成结果须登记到 `docs/ART.md`「AI 素材」并在 Steam AI 内容披露中声明。

```
Key art, 16:9, hand-painted stylized fantasy, night scene. A small stone altar with a bronze brazier holds a single tall sacred flame at the left third of the frame, the only warm light in the world. Its light forms a clear circular pool on the ground: inside the circle, warm saturated hand-painted grass, stones and a stone bridge in amber and moss tones; outside the circle, everything is cold deep indigo ink wash. A small hooded young fire-keeper in a crimson cloak holding a lantern staff stands between the flame and the dark, mid-swing, embers flying. At the edge of the light, ink-black silhouette creatures with glowing eyes approach across the bridge; where they touch the light they begin to show color. Strong complementary contrast orange vs indigo, soft bloom, drifting embers, clean readable silhouettes, large empty dark sky area on the right third for a title logo. No text, no watermark, no UI.
Negative: text, letters, logo, watermark, gore, blood, red danger markers, gold coins, photorealism, clutter in the right third.
```

## 3. 各尺寸构图规格
百分比均相对画布宽 / 高。「标题宽」= 中文字标「圣火守护者」外框宽度。

| 文件 | 尺寸 | 焦点（圣火）位置 | 标题字标 | 安全区 / 注意 | 排除 |
|---|---|---|---|---|---|
| capsule_header_920x430 | 920×430 | 横 25–35%，纵 60–80% | 右侧居中，宽 ≈ 55%，中心 (70%, 48%)，可带英文副标 | Steam 会缩小生成小图：字标不贴边，四周留 ≥ 4% | 标语、评分、平台图标 |
| capsule_small_462x174 | 462×174 | 火只作标题背后的辉光 | **宽 ≥ 60%（草稿为 ≈ 88%）、居中、描边 ≥ 字号 7%**；不放英文副标 | 须在自动生成的 184×69 与 120×45 下可读；背景压暗 25% | 角色、敌人、任何标语 |
| capsule_main_1232x706 | 1232×706 | 横 30–35%，纵 70–80% | 右上，宽 ≈ 50%，中心 (71%, 42%) | 敌人剪影不进入标题框 | 文字（标题除外） |
| capsule_vertical_748x896 | 748×896 | 横中线附近，纵 75–85% | 上部，宽 ≈ 85%，中心 (50%, 21%) | 标题下方留天空作为呼吸区 | 同上 |
| library_capsule_600x900 | 600×900 | 横 50–55%，纵 80–85% | 上部，宽 ≈ 85%，中心 (50%, 20%) | 自动生成 300×450，标题仍须可读 | 同上 |
| library_header_920x430 | 920×430 | 同 header | 同 header | 没上传时 Steam 用店铺 header | 同上 |
| library_hero_3840x1240 | 3840×1240 | 圣火在中心 860×380 安全区内 | **不放任何文字** | 关键内容（火、英雄）全部在中心安全区；Logo 叠在左下或居中 | 任何文字 |
| library_logo_1280x720 | 1280×720 透明 | — | 只含字标，宽 ≈ 92%，透明底 | 叠在 hero 上仍可读（靠深描边 + 暖辉光） | 其他文字、底色 |
| page_background_1438x810 | 1438×810 | 火偏右、压暗 45% + 模糊 | 无 | 氛围图，不能抢页面内容 | 文字、高对比细节 |
| 截图 ×5 | 1920×1080 | — | — | **TODO：游戏测试用实机采集**（M1 §8 第 7 条） | 概念图、预渲染、营销文字 |

### 462×174 小胶囊可读性规则（验收）
1. 标题宽 ≥ 画布宽 60%；2. 暖白字 + 深棕粗描边 + 背景压暗，保证高明度对比；3. 不放标语、副标、角色；4. 按 100%、50%（231×87）以及 Steam 自动生成的 120×45 各看一次。
**草稿自检结果：通过**（462×174、231×87、120×45 三档「圣火守护者」五个字都能看清；检查图在 `_src/_small_50pct.png`、`_src/_small_120x45.png`、`_src/_small_184x69.png`）。

## 4. 已产出的草稿 PNG（先照原样保留，范围收缩后不再迭代）
全部为 **DRAFT / 目标帧**（有 DRAFT 角标的，上传前删掉）。做法：`tools/render_kv.py` 程序化绘制夜空、远山、河、桥、光圈、火盆和圣火；英雄和墨色剪影敌人取自已登记精灵图（`grok/sprite-integration` 分支的 `assets/sprites/*`，敌人压成墨色剪影，只保留发光像素）；标题用已登记 Noto 字体排出。没有用第三方美术。
已知不足：精灵图原始只有约 112 px 高，放大后偏软；火盆造型简单；大尺寸（3840 宽）的细节密度不够。正式版需要游戏美术重绘或用第 2 节提示词生图。

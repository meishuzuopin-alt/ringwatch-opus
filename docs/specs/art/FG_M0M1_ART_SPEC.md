# 圣火守护者 M0/M1 美术规格（FG-M0M1-ART-SPEC v0.1）

日期：2026-09-26 · 状态：规格草案，**概念目标，均未实现** · 依据：PR #21 `docs/DESIGN_BIBLE_v1.md` §5.1/§5.8/§5.9/§5.10/§5.15/§10/§11，PR #18 分支 `docs/ART.md`，`/workspace/fg-art/FG_ART_BIBLE_001.md`，`ART_STANDARD_V2.md`，`overnight_log.md` 06:03/06:16 条（C1 定义）。
引用不重做：定稿概念图 `/workspace/fg-art/final/*_V002.png`；A 路线参考 `/workspace/fg-art-001/*_V003_Aroute.png`（夜战图屋顶是杂色圆顶，按本规格改为赭红尖顶）；C1 场景定稿参考 `/workspace/fg-art/mj/mj_style_C1.png`。

## 0. C1「光即色彩」定义（照已定方向）
- 圣火光圈内：饱和暖色、有手绘笔触；光圈外：冷靛蓝剪影/水墨，只保留明度层次。
- **光线自然衰减，不做硬聚光灯边界**（用户 06:03 原话）；不要写实暗黑（C1 强化版因此被淘汰）。
- 光圈外扩一环 = 世界多一圈颜色，进度就是颜色。
- 红色只给危险，金色只给奖励；同屏高饱和色块 ≤ 3 块。

## 1. 色值表

### 1.1 光圈内（暖）
| 名称 | Hex | 用途 |
|---|---|---|
| 圣火金 | `#FFB547` | 圣火主焰、奖励（金币/战利品）。**不作装饰色** |
| 火芯白 | `#FFF1C8` | 圣火内核、泛光中心 |
| 余烬橙 | `#E8702A` | 圣火外焰、重击伤害数字、余烬粒子 |
| 暖土 | `#C9A27A` | 墙体、广场、泥路 |
| 石色 | `#B9A88F` | 桥墩、塔基、火盆石环 |
| 木色 | `#7A5234` | 梁柱、桥板、武器柄 |
| 草地 | `#6F9A4E` | 光圈内草地（边缘向冷色过渡） |
| 屋顶赭红 | `#A8483A` | 所有屋顶、弓塔尖顶（统一赭红尖顶） |
| 兜帽红 | `#B8452E` | 英雄兜帽/披肩（刻意避开危险红） |
| 奶白 | `#EFE2C4` | 英雄斗篷、UI 文字 |
| 暖窗 | `#FFC870` | 光圈内窗光 |
| 伤害白 | `#FFFFFF` | 普通伤害数字 |

### 1.2 光圈外（冷靛）与敌人
| 名称 | Hex | 用途 |
|---|---|---|
| 靛深 | `#0F1530` | 光圈外最暗处、远景森林 |
| 夜蓝 | `#1E2A4A` | 光圈外地面主色 |
| 靛中 | `#26345C` | 光圈外中间调、冷雾 |
| 靛亮 | `#3E5486` | 光圈外受月光面 |
| 月青 | `#5FA8C8` | 月光边缘光（1px 勾出剪影）、法塔水晶 |
| 墨 | `#120E22` | 敌人光外剪影本体 |
| 墨边 | `#07050E` | 敌人剪影外描边 |
| 敌紫 | `#6B3FA0` | 敌人进光现色的身体主色（暗部 `#45287A`，亮部 `#9068C8`） |
| 敌眼红 | `#FF3B3B` | **只用于**敌人眼睛、攻击预警、来袭箭头 |

过渡：光圈内外按距离平滑插值（建议 r0 = 圣域半径×0.7 开始、r1 = 圣域半径×1.1 全冷），圈外颜色 = 该处原色的明度映射到 靛深→靛亮 色阶。

### 1.3 五色焰晶（色值 + 形状）
| 焰色 | Hex | 描边（本色压暗） | 图标形状 | 克制 |
|---|---|---|---|---|
| 烬橙 | `#E07020` | `#7A3A0E` | **三舌火苗**（尖顶，底部圆） | 小鬼 |
| 霜青 | `#4FC3E0` | `#1E5E70` | **六边形**（竖直棱柱，顶部平切） | 狼骑 |
| 翠绿 | `#3FAE5A` | `#1C5A2C` | **斜叶形**（两端尖的梭形，带中脉） | 暗弓手 |
| 皓白 | `#EEF2F7` | `#7A8496` | **圆珠 + 外环**（正圆，内有十字高光） | 施法者 |
| 星辉 | `#8C8CF0` | `#3C3C8A` | **四角星**（细长尖角） | 重甲 |

阶级标记：I/II/III = 形状下方 1/2/3 颗小菱点（不靠颜色）。
自测数据（CIEDE2000，脚本 `tools/fglib.py` 的 `de2000/simulate`，Machado 2009 满强度）：
- 与危险红 `#FF3B3B` 的 ΔE：烬橙 18.3 / 霜青 67.5 / 翠绿 72.0 / 皓白 42.3 / 星辉 41.9；与奖励金 `#FFB547`：20.3 / 46.4 / 41.3 / 31.3 / 55.3。烬橙夹在红与金之间，是**最危险的一色**，靠火苗形状 + 深描边区分；落地时不许加泛光到金色。
- 色盲下最接近的一对：红色盲 霜青-星辉 15.2；绿色盲 烬橙-翠绿 10.2；蓝色盲 霜青-翠绿 11.1；全色盲 翠绿-星辉 1.0（几乎同灰）。**结论：颜色不可靠，必须靠形状**；五个形状轮廓两两不同（火苗/六边形/梭形/圆/四角星），16px 下仍可分是验收项。
- 星辉与敌紫 ΔE 27.6，偏近：星辉焰晶只出现在 UI 与塔槽，不用在敌人身上。

## 2. 剪影与比例规则
- 英雄：960×540 下身高 **≥ 48px**（关键画面建议 60–64px）；头身 1:2；尖兜帽 + 披风 + 提灯法杖（沿用 PR #17 英雄设定）；脚下暖色光环。
- 四类敌人（总纲 §5.1 名称，身高为英雄倍数）：

| 敌人 | 比例 | 剪影关键词 |
|---|---|---|
| 小鬼 | **0.6** | 小而圆，两只小角，短刀 |
| 暗弓手 | **1.1** | 高而带尖刺：三尖兜帽 + 比身体高的弓弧 |
| 精英 | **1.4** | 宽而矮重：驼背大块、肩甲尖刺、小头缩在肩里、大锤 |
| 狼骑（第四类） | 总高 ≈ **1.0**，全长 ≈ **1.5** | 唯一的横向长剪影：狼身 + 背上小骑手 + 斜长矛 |

  狼骑的比例总纲未定义，本规格按「横向长条」区分，需负责人确认（见回报待确认项）。
- 夜战配比参考：小鬼 ~60%、狼骑/暗弓手 ~25%、精英 ~15%。
- 塔：**靠顶部造型区分，不靠颜色**——弓塔 = 赭红尖顶瞭望台；法塔 = 悬浮菱形水晶；炮塔 = 粗短炮口圆墩。
- 房屋：蘑菇剪影，墙窄、赭红尖顶檐宽。
- 描边：角色 2px、建筑 1.5px（960×540 换算），颜色 = 本色压暗；光外敌人用墨边 `#07050E`。
- **进光现色**：敌人在光外 = 墨色 `#120E22` 剪影 + 月青 1px 边缘光 + 红眼；跨过光圈边界时按光强度在 0.3 秒内（或随位置插值）从墨色过渡到敌紫配色，露出二级形体（护甲、骨刺、武器颜色）。眼睛始终发红光。
- **墨屑碎裂**（死亡，0.6 秒，对应总纲 §5.1）：帧 0 命中闪白（1 帧）→ 帧 1 身体出现 3–5 道裂纹 → 帧 2 炸成 6–10 片墨屑（锐角三角碎片，墨色 + 敌紫内面）→ 帧 3 碎片沿击退方向飞散、1–3 粒余烬橙火星上浮 → 帧 4–5 墨屑变细、化成墨烟淡出。不留尸体，不用红色血。

## 3. 出图提示词草案（每项一组；不含任何竞品名、游戏名、风格名、艺术家名）
通用后缀（每条都加）：中文「原创设计，无文字，无水印，无标志」/ EN "original design, no text, no logo, no watermark"。

**3.1 夜战桥头关键画面（16:9）**
- 中：45 度俯视的小村夜战。画面中下部一座石火盆燃着明亮的金橙火焰，暖光向外自然衰减成一圈；光圈内房屋是窄墙配高耸的赭红尖顶，石板地和草地颜色饱和、有手绘笔触；光圈外全部压成冷靛蓝的明度剪影。画面上三分之一有一条河，一座石木桥从北岸通到村口。桥头站着一个戴红色尖兜帽、披奶白斗篷、举提灯法杖的矮胖守火人，正挥出一道暖橙色弧光，面前三只小敌人碎成墨色碎片和火星。桥两侧各一座塔：左边尖顶木瞭望台，右边石柱上悬浮着发蓝光的菱形水晶。桥上和北岸挤满墨黑剪影的敌人，眼睛发红光，边缘有一丝冷青月光；走进火光的敌人显出紫色身体。只有火焰、法术和敌人眼睛在发光。画面主要内容集中在中间横带。
- EN: 45-degree top-down view of a tiny village defending at night. A stone brazier in the lower middle burns with a bright gold-orange flame; its warm light fades naturally outward in a circle. Inside the circle, narrow-walled houses with tall ochre-red pointed roofs, saturated stone paving and grass with visible brush strokes; outside the circle everything becomes cool indigo value silhouettes. A river crosses the upper third, a stone-and-timber bridge leads from the north bank to the village. At the bridge head a stout keeper in a red pointed hood and cream cloak raises a lantern staff and swings a warm orange arc; three small foes in front of him shatter into ink shards and embers. One tower on each side: a pointed timber watchtower on the left, a floating glowing blue diamond crystal above a stone pillar on the right. Ink-black silhouettes crowd the bridge and far bank with glowing red eyes and a thin cool-cyan moonlit rim; those stepping into the firelight reveal purple bodies. Only the fire, spells and enemy eyes glow. Key content in the central horizontal band. 16:9.

**3.2 四类剪影敌人 + 墨屑碎裂**
- 中：设定图，浅暖灰底，四个敌人并排站在同一地平线上，旁边一个矮胖守火人作身高参照并画出身高刻度线。从左到右：小而圆、两只小角、拿短刀的小怪（0.6 倍）；高瘦、兜帽上三根尖刺、背一把比身体还高的弓（1.1 倍）；宽而矮、驼背、肩甲带尖刺、小头缩在肩里、拖大锤的重甲怪（1.4 倍）；一只横向长身的狼，背上坐一个小骑手，斜举长矛。每个敌人上排是纯墨黑剪影加红眼和细冷青边缘光，下排是同一造型的紫色现色版本。底部一条 6 格序列：小怪被击中闪白、出现裂纹、炸成锐角墨色碎片、碎片飞散并冒出几粒橙色火星、碎片变细化成墨烟消失。
- EN: Character sheet on a warm light-grey ground: four foes on one baseline with a stout keeper as height reference and height guide lines. Left to right: a small round imp with two little horns and a short blade (0.6x); a tall thin figure with three spikes on its hood and a bow taller than its body (1.1x); a wide squat hunched brute with spiked pauldrons, tiny head sunk between the shoulders, dragging a heavy hammer (1.4x); a long low wolf with a small rider holding a slanted spear. Top row: pure ink-black silhouettes with red eyes and a thin cool-cyan rim; bottom row: the same designs revealed in purple. Bottom strip, 6 frames: the imp flashes white on hit, cracks, bursts into sharp ink shards, shards fly apart with a few orange embers, shards thin into ink smoke and vanish.

**3.3 进光现色 前后对比**
- 中：左右两格同一构图。左格：夜里冷靛色地面，三个敌人站在光圈外，只是墨黑剪影、红眼、细冷青边缘光。右格：同一位置被火光照到，暖光自然衰减，敌人显出紫色身体、灰紫护甲、骨色尖刺和木色武器，草地和石头恢复暖色；光圈边缘是柔和过渡而不是硬边。
- EN: Two panels, same composition. Left: cool indigo night ground, three foes outside the light, just ink-black silhouettes with red eyes and a thin cool-cyan rim. Right: the same spot reached by warm firelight fading softly; the foes reveal purple bodies, grey-violet armor, bone-colored spikes and wooden weapons, grass and stone regain warm color; the light edge is a soft gradient, not a hard spotlight.

**3.4 五色焰晶图标**
- 中：五枚游戏道具图标横排，深木色底，每枚是带切面的发光晶石，外轮廓各不相同：烬橙色三舌火苗形、霜青色竖直六边形、翠绿色两端尖的叶形带中脉、近白色正圆宝珠带外环、淡紫蓝色细长四角星。每枚有本色压暗的粗描边、左上高光、下方 1–3 颗小菱点表示阶级。形状在 16 像素下也能分清。
- EN: Five game item icons in a row on dark wood: faceted glowing crystals, each with a different outline — ember-orange three-tongued flame, frost-cyan upright hexagon, jade-green leaf with pointed ends and a midrib, near-white round orb with an outer ring, pale violet-blue slender four-pointed star. Thick darker-tone outline, top-left highlight, 1–3 small diamond pips below for tier. Shapes must stay distinct at 16 px.

**3.5 英雄 + 四守卫 1 阶精灵**
- 中：精灵表，白底，5 行 × 4 列（待机 2 帧、攻击预备、攻击出手），角色面朝镜头略偏右，头身 1:2 的矮胖造型、粗描边、大色块、顶点渐变。行 1 守火人：红色尖兜帽、奶白斗篷、提灯法杖。行 2 盾卫：护鼻圆盔、身前一面带火焰纹的大圆木盾。行 3 枪兵：尖顶布帽、一支比身体高一倍的长枪。行 4 弓手：短兜帽、背箭筒、大弧度木弓。行 5 司火：平顶高帽、长杆末端挂一只冒火的小铜炉。守卫都是简朴村民装束，暖土色和木色为主，剪影靠盾、枪、弓、火炉区分。
- EN: Sprite sheet on white, 5 rows x 4 columns (idle x2, attack anticipation, attack strike), characters facing camera slightly right, stout 1:2 head-to-body, thick outlines, flat color blocks with vertical gradient. Row 1 flame keeper: red pointed hood, cream cloak, lantern staff. Row 2 shield guard: round nasal helmet, large round wooden shield with a flame emblem. Row 3 spear guard: pointed cloth cap, a spear twice his height. Row 4 archer: short hood, quiver, big curved wooden bow. Row 5 fire tender: tall flat-topped hat, a long pole with a small burning copper censer at the end. Plain villager clothing in warm earth and wood tones; silhouettes differ by shield, spear, bow, censer.

**3.6 伙伴动物（水豚 / 大鹅 / 萤火狐 / 驮羊）**
- 中：四只伙伴动物设定图，暖光下的篝火边，圆润矮胖、粗描边、大色块。水豚半泡在冒热气的木桶里、头顶一块小毛巾；大鹅白身橙喙、脖子系一条小红布巾、张嘴作啄击姿态；萤火狐小巧、尾巴尖亮着一团柔和黄白光，身边一小圈光照亮地面；驮羊毛厚成一个大圆球、两侧挂着小货袋。四只轮廓各不相同（桶、长脖、亮尾、大圆球），全部原创造型。
- EN: Concept sheet of four companion animals by a campfire in warm light, round and stout, thick outlines, flat color blocks. A capybara half-soaking in a steaming wooden tub with a small towel on its head; a white goose with an orange beak and a small red neckerchief, beak open mid-peck; a small fox whose tail tip glows soft yellow-white, lighting a little circle on the ground; a pack sheep whose wool is one big round ball with small cargo bags on both sides. Four distinct silhouettes (tub, long neck, glowing tail, big ball), all original.

**3.7 篝火炖锅**
- 中：圣火旁的一口圆肚黑铁锅，挂在三根木棍搭的三脚架上，锅下一小堆柴火，锅里冒出暖白蒸汽，旁边摆着木勺、几块碎石、一根羽毛和一小堆墨色碎屑作食材，暖光手绘质感。
- EN: A round-bellied black iron pot hanging from a tripod of three wooden sticks beside the sacred fire, a small pile of burning firewood below, warm white steam rising; next to it a wooden ladle, a few stone chunks, a feather and a small pile of ink-colored flakes as ingredients; warm hand-painted feel.

**3.8 巡火信使**
- 中：一位瘦高的信使站在冷靛色夜路和暖光交界处，穿深色长旅行斗篷，肩挎鼓鼓的皮信袋，一手提小灯，一手举着一封用金橙色火漆封口的信，帽檐宽大，剪影与英雄明显不同（宽檐帽、信袋、细长身形）。
- EN: A tall slender messenger standing where the cool indigo night road meets the warm light, wearing a long dark travel cloak, a bulging leather letter satchel on the shoulder, a small lamp in one hand and in the other a letter sealed with gold-orange wax; wide-brimmed hat; silhouette clearly different from the hero (wide brim, satchel, slender build).

## 4. 验收标准
| 资产 | 验收（全部通过才算合格） |
|---|---|
| 通用 | ① 右下角水印「概念目标图·未实现」（精灵表可标在表旁）；② 提示词不含竞品名/游戏名/风格名/艺术家名/商标/真人；③ 出图后查重，撞脸即重画；④ 保留过程文件：原始生成图、分层文件（PSD，导不出则分层 PNG + .ora 并写明原因）、提示词、后处理脚本，存仓库外项目存档，`docs/ART.md` 记存放位置；⑤ 每个 AI 素材登记 ART.md「AI 素材」：**文件名、工具、提示词（全文或摘要）、日期、用途、是否 AI 生成、后处理**，并计入 Steam AI 内容披露 |
| 3.1 桥头关键画面 | 光圈内暖、圈外冷靛，过渡柔和；只有火、法术、敌眼发光；屋顶赭红尖顶；中央 50% 不被 UI 遮挡。**缩略图测试**：居中裁到 231:87 后缩到 231×87，转灰度再二值化（Otsu），英雄、圣火、塔、敌人四类仍可分；另用各类单独蒙版出纯黑剪影，四类形状互不混淆（英雄在 231×87 下 ≥ 11px 高） |
| 3.2 敌人 + 碎裂 | 身高比例 0.6/1.1/1.4（误差 ±5%，以英雄为 1）、狼骑横向长剪影；纯黑剪影下四类一眼可分；碎裂 6 帧符合第 2 节时序，无红血、无尸体 |
| 3.3 进光现色 | 左右同构图同位置；左边只有墨色剪影+红眼+月青边，右边露出二级形体颜色；光边柔和无硬边 |
| 3.4 焰晶图标 | 色值按 1.3 节；与 `#FF3B3B`、`#FFB547` 的 ΔE2000 ≥ 18；色盲模拟四种（红/绿/蓝色盲 + 全色盲）并排对比图，模拟下五枚靠形状可分；16px 下形状可分 |
| 3.5 精灵 | 960×540 下英雄 ≥ 48px；守卫与英雄同比例体系；纯黑剪影下五个角色可互分；帧格、脚底锚点统一，附 json（格宽高、pivot、帧率）；与 PR #17 英雄/盾卫设定一致 |
| 3.6–3.8 概念图 | 剪影互不相同、全部原创不影射现成角色或品牌；暖光下读得清；信使剪影与英雄不混 |

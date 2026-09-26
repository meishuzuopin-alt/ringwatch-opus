# 美术指导手册

由 Codex 主导维护。写清楚「要什么样」和「怎么验收」，工程实现由 Claude 负责。

## 风格基线

- **低多边形 + 平面着色**，明快饱和的奇幻村落。参考方向：卡通、玩具感、轮廓清楚。
- 横屏 16:9 桌面，镜头俯角约 46°。所有东西要在 **1280×720 的截图里一眼能读懂**：玩家、敌人、预警必须比地面显眼。
- **可读性优先于好看**：红色留给危险（敌人脚圈、预警线），金色留给奖励（金币、灵火），不要把这两种颜色用在装饰上。
- 昼夜节奏：第 1–3 波白天，第 4–6 波黄昏，第 7 波起入夜，Boss 波（每 5 波）用血红氛围。

## 参考图

负责人给的目标观感（放在 `docs/art-ref/`，不进游戏包）：

- `pick-screen.webp`：选职业界面。暖色低多边形村落，卡片有金边和流派色，角色是圆润的低模玩具感。
- `battle-night.webp`：夜战。灯笼暖光对冷色夜景，火堆是视觉中心，敌人紫黑色、眼睛发光。

现在的差距：模型是方块拼的，缺圆润感和细节（窗框、木纹、石阶）；地面缺石板路、草丛这类层次；界面缺金边、流派图标这类装饰。

## 英雄造型

每个英雄 = 通用身体 + 斗篷（按 `cape` 颜色着色）+ 帽子 + 手持物，在 `js/data.js` 的 `look: { hat, prop }` 里指定。

| 帽子 `hat_*` | 手持物 `prop_*` |
|---|---|
| wizard 尖帽 · hood 兜帽 · helm 头盔 · bandana 头巾 · goggles 护目镜 · horn 角盔 · halo 光环 · cap 帽子 · tophat 礼帽 · crown 王冠 | staff 法杖 · crossbow 弩 · sword 剑盾 · dagger 双匕 · wrench 扳手 · axe 斧 · book 圣典 · bomb 炸弹 · coin 钱袋 · dice 骰子 |

模型在 `js/world3d.js` 的 `buildModels`；选英雄界面的头像在 `js/ui.js` 的 `UI.hatGlyph / UI.propGlyph`，两边改造型时要保持一致。
已知问题：影刺客的头巾、工匠的护目镜从背后看不明显。

## 可以直接改的地方

| 想改什么 | 位置 |
|---|---|
| 地形、植被、房屋、水、灯笼等场景颜色 | `js/world3d.js` 顶部 `PAL` |
| 白天 / 黄昏 / 夜晚 / Boss 的光照、天空、雾、自发光强度 | `js/world3d.js` 「昼夜」一节的 `envPreset` |
| 角色、敌人、建筑的低模造型 | `js/world3d.js` 「模型」一节的 `buildModels` |
| 职业形态、武器颜色 | `js/data.js`（各条目的 `color`） |
| HUD、按钮、面板颜色 | `js/ui.js`；2D 退路画面的颜色在 `js/render.js` 顶部 `C` |

改完跑 `npm run shots`，把 `shots/art/` 里的截图和改动前对比；PR 描述里说明改了什么、为什么。

## 待工程实现

需要渲染器新能力的需求写在这里，格式：**需求 / 目的 / 验收标准**。Claude 做完后移到下一节。

- （空）

### Claude 已先做的工程占位，等 Codex 美术评审（2026-09-25）

- **地貌调色** `BIOMES`（`js/world3d.js`）：林缘营地（深绿）、雪岭关隘（雪地、松树压雪、冰湖浅蓝）、沼泽渡口（暗橄榄、浑水、水边芦苇）。颜色可以直接改。
- **圣火形态外形**（`M.coreRing`、`M.core_blaze` / `core_ward` / `core_star`）：2 级起一圈石柱，3 级起按形态加上层建筑；火焰颜色跟形态走，残血时变矮变暗。造型比较朴素，需要美术重新设计剪影。
- **野外祭坛**（地图 `A` 格，`altar()`）：石台 + 三根带蓝色水晶的矮柱，进度圈与水晶光在 `drawCore` 里画。
- 截图：`npm run shots` 新增 `09_map_forest`、`10_map_snow`、`11_map_marsh`、`12–14_core_*`。

## 已实现

### AI 素材：五套手绘精灵图（2026-09-25/26，负责人批准，`grok/sprite-integration`）

角色从方块低模换成**面朝镜头的贴图立牌**（脚底为轴心，`js/sprites.js` + `js/sprite_anim.js`，渲染细节见下表）。
每套图 = 一张 4 列 × 6 行的图集 PNG + 同名 json（`frame_w/h`、脚底 `pivot_x/y`、身高像素、相对英雄身高、帧率、攻击每帧时长）。
行：0 走·下 1 走·右 2 走·左（单独画，不是镜像） 3 走·上 4 待机·正面 5 攻击·正面。
`tools/check.js` 只放行这里登记过、有 json、且和 `js/sprites.js` 内嵌 `SPR.META` 一致的图集；其余图片 / 模型 / 音频仍按硬规则 1 拦下。

| 图集 | 用在 | 来源 | 提示词摘要 | 后处理 |
|---|---|---|---|---|
| `assets/sprites/hero/hero.png`（800×912，格 200×152） | 玩家英雄（所有职业） | ChatGPT 图像生成，2026-09-25 | 6×4 精灵表，白底，行依次为向下 / 右 / 左 / 上行走、正面待机、正面攻击（施法）；兜帽余烬红 + 奶白斗篷的法师，手持提灯法杖 | 抠像、清光晕、身高归一、脚底对齐、打包成图集 |
| `assets/sprites/grunt/grunt.png`（712×858，格 178×143） | 小鬼（基础近战）；炸药地精借用加黄绿着色 | ChatGPT 图像生成，2026-09-25 | 同上版式；暗影地精，手持大砍刀 | 同上 |
| `assets/sprites/elite/elite.png`（944×768，格 236×128） | 暗弓手（远程）；护盾萨满借用加蓝着色、暗影术士借用放大 1.7 倍加品红着色 | ChatGPT 图像生成，2026-09-26 | 同上版式；戴面具的紫色巫弓手 | 同上 |
| `assets/sprites/boss/boss.png`（960×1404，格 240×234） | 崩山巨像（Boss，1.9 倍英雄身高） | ChatGPT 图像生成，2026-09-26 | 同上版式；石头与铁皮拼成的食人魔，拖一把链锤 | 同上 |
| `assets/sprites/guard/guard.png`（704×702，格 176×117） | 兵营·盾卫；枪兵借用加暖橙着色（弓手仍是低模） | ChatGPT 图像生成，2026-09-26 | 同上版式；红辫子的村庄枪盾女兵，木盾上有火焰徽记；攻击行向屏幕右刺 | 同上 |

参考：`fg-art/mj/mj_style_C1.png`（场景风格 C1：火光里暖色手绘、圈外冷靛蓝）、`fg-art/mj/codex_lineup_v1.png`（五个角色的站队图；两张只是参考图，不进仓库）。

| 项 | 做法 |
|---|---|
| 立牌 | 每套图一个 `InstancedMesh`（上限 200），四元数 = 镜头四元数（面朝镜头，随俯角后仰），脚底在原点；每实例属性 `iFrame`（图集里的一格，宽取负 = 水平镜像）、`iFlash`（受击闪白）、实例色（着色） |
| 材质 | `MeshLambertMaterial` + 图集贴图，`alphaTest 0.5`、写深度、双面；共用 `fgInject`，所以太阳 / 半球光 / 阴影 / 雾 / 圣火暖光圈 / 边缘光和低模一致，闪白、调色、泛光照常 |
| 贴图 | `SRGBColorSpace`，**线性过滤 + mipmap**（`LinearMipmapLinearFilter` / `LinearFilter`）。对照过最近邻（`?nearest`）：图集约为游戏尺寸的 2.2 倍，最近邻在 40–110 像素下走路时轮廓抖动、线条断裂；线性 + mipmap 保留手绘笔触且稳定，选线性 |
| 方向 | 按屏幕速度的主轴选行（下 / 右 / 左 / 上，带 1.25 倍滞后防抖），静止用待机行，攻击状态用攻击行（英雄：施法与站桩开火） |
| 帧率 | 走路 8 fps（Boss 6）、待机 4 fps，攻击按 json 里每帧时长 |
| 动作 | `SpriteAnim.walkPose`（2.5% 起伏 + 0.97/1.03 压伸）、`idlePose`（呼吸）、状态切换 `blendPose` 0.2 s；受击压扁泛白、冲刺横向拉长、倒地绕视线滚倒 |
| 英雄提灯 | 场景里唯一的点光源 `GL.lamp`（暖橙，距离 190），位置跟着当前那格里的灯，亮度 = 昼夜基础值 × `lanternFlicker`，施法时叠 `castFlash`；灯上另有一个发光点 |
| 盾卫 | 出手时播攻击行；目标在她左边时水平镜像（图里是向右刺） |
| 阴影 | 立牌不投实时阴影（后仰的平面投影会拖成长条），脚下保留圆形接触阴影（不随阴影开关减淡）；接受建筑 / 地形阴影 |
| 退路 | 贴图没加载完或加载失败时 `SPR.has()` 为假，各处退回原来的方块低模；不用精灵图的：铁甲兽、狼骑、蝙蝠、蝠囊怪、蝠母、弓手士兵、伙伴 |

截图：`docs/art-upgrade/sprite-integration/day_before.png` / `day_after.png` / `night_before.png` / `night_after.png`（基线 `56816b3` 对比）。

### 字体（FG-ART-002 阶段 0，2026-09-25，负责人批准的唯一外部素材例外）

| 用途 | 字体 | 字重 | 游戏里的名字 | 文件 |
|---|---|---|---|---|
| 标题、页面大标题（粗体且字号 ≥ 22） | Noto Serif SC（思源宋体） | Black 900 | `FG Serif` | `fonts/fg-serif-900.woff2` |
| 正文 | Noto Sans SC（思源黑体） | Medium 500 | `FG Sans` | `fonts/fg-sans-500.woff2` |
| 正文粗体 | Noto Sans SC | Bold 700 | `FG Sans` bold | `fonts/fg-sans-700.woff2` |

- 来源：Google Fonts 发行的 Noto Serif SC / Noto Sans SC，经 npm 包 `@expo-google-fonts/noto-serif-sc@0.4.3`、`@expo-google-fonts/noto-sans-sc@0.4.3` 取得（`tools/fonts.js` 里锁了版本和 sha512 校验）。
- 授权：SIL Open Font License 1.1，全文在 `fonts/OFL.txt`。OFL 允许随游戏再分发和子集化，不允许单独售卖字体；保留字体名 "Noto" 不用于修改版，我们在游戏里注册为 `FG Sans` / `FG Serif`。
- 子集：只保留 `js/` 和 `preview.html` 里出现的字（约 1300 个）加全部 ASCII，三个文件合计约 640 KB。子集工具 `subset-font`（MIT，基于 HarfBuzz）只是开发依赖，不进游戏包。
- 用法：`T.FONT` / `T.FONT_TITLE`（`js/data.js`），`D.font(size, bold)` 自动选择；系统中文字体兜底。
- 截图：`shots/audit/01_title.png`（标题「圣火守护者」为思源宋体 Black）、`12_shop.png`。

### 渲染与光照（FG-ART-002 阶段 1，2026-09-25，按美术圣经第 4、5 节）

> **2026-09-25 制作人调整**：保留原版（像《光遇》）的光感。下表里的风格化效果都做成了开关 `GL.ART`，**默认全关**，默认画面回到 `0fad260` 的光感；默认只开三项低风险效果：描边（本色压暗）、只给火焰 / 法术 / 敌眼的局部泛光、轻暗角。夜晚和 Boss 预设恢复原来的颜色，夜晚 35% 的提亮版放在 `night35` 开关后面。
> 开关：`aces` `toon` `noise` `ao` `nightFog` `rim` `grad` `coreLight` `night35`。浏览器地址加 `?art=all` 全开，`?art=toon,ao` 只开几项；`SHOTS_ART=all npm run shots` 拍全开截图。
> 对照图：`node tools/artcompare.js 输出.png 原版=目录 当前默认=目录 全开=目录`（同机位，一行一张）。

| 圣经要求 | 做法（`js/gl3d.js`） | 能调的地方 |
|---|---|---|
| 卡通三段色阶 | 网格材质换成 `MeshToonMaterial`，3 格渐变图（暗 / 中 / 亮 = 66 / 140 / 235），最近邻采样 | `toonRamp()` |
| 顶点色渐变（下暗上亮） | 按模型高度 0→42 从 0.74 过渡到 1.06；贴地的平地面不压暗 | 材质里的 `vGrad` |
| 冷色边缘光 | 掠射角的面加一圈光，颜色和强度随昼夜 | 预设里的 `rim: [r, g, b, 强度]` |
| 程序噪声斑驳 | 两层世界坐标值噪声，所有表面 ±12% 明暗 | `U.uNoise` |
| 反向外壳描边 | 颜色 = 物体本色 × 压暗系数（不用纯黑）；角色、敌人、道具 2 像素，塔、兵营、圣火、地形上的房屋和树 1.5 像素（按 960×540 换算，远近粗细一致） | `GL.lineBuilding()`、`U.uLineW / uLineWB` |
| 环境光遮蔽 | 自己写的屏幕空间 AO（只读深度，不多渲染一遍场景）：16 个螺旋采样，亮的东西（火、法术）不压暗 | `aoPass()` 的 `uRadius` / `uStrength` |
| 泛光只给圣火、法术、敌人眼睛 | 阈值固定在 HDR 1.05，普通受光表面到不了；自发光（`aEm`）乘 2.2 进 HDR，叠加光效本来就亮 | `GL.BLOOM_THR`、`U.uEmHDR` |
| ACES + 轻微暗角 | 色调映射改 ACES（曝光 1.0）；调色通道加暗角 | 预设里的 `vig` |
| 夜晚低矮冷雾 | 圣火光圈外、贴地（高度 34 以下）的雾，从光圈边缘往外渐浓；自发光部分穿透雾，远处敌人先露红眼 | 预设里的 `fogLow: [浓度, 高度, 渐浓距离]` |
| 圣火暖光圈 | 半径 = 圣域半径，圈内加暖光，最后 6% 半径内收掉，边缘清楚；夜里更强 | `env.coreLight`（`world3d.js` 的 `W3.draw`）、`U.uCoreCol` |
| 夜晚约为白天的 35% | `night35` 开关：夜晚月光、天光、雾色提亮成夜蓝（默认用原色，不强求） | `npm run light shots/light all` 量出来是 37% |

画质退路：设置「画质」低档关掉环境光遮蔽和描边，中档没有 AO 和泛光；自动档掉帧时依次关泛光 → AO → 描边 → 阴影。

验收工具 `npm run light`（`tools/lighttest.js`）：四种光照各拍一张不带 HUD 的画面，量光圈内外亮度（关掉叠加发光和泛光，只看环境亮度），并拼一张 231×87 缩略图（`shots/light/thumbs_231x87_x2.png`）。

**交给 Codex（阶段 2）**：昼夜预设里的新字段 `rim`、`fogLow`、`vig`、`a35` 可以直接调；夜晚和 Boss 的原色没动，提亮版只在 `a35` 里。圣火光圈里的石板在夜里偏粉，是月光的淡紫加暖光混出来的，换石板颜色时一起看。英雄在 231×87 缩略图里还看不出来，要等阶段 2 放大到 48 像素以上。

### 界面：木框金边与三层 HUD（FG-ART-002 阶段 3，2026-09-25，按美术圣经第 6 节 + `docs/UI_COPY_V1.md`）

- **木框金边**：`D.woodFrame(x, y, w, h, { style })`（`js/render.js`）——深色木板 + 随位置固定的木纹 + 2 像素黄铜描边（`#9B7447`）+ 本色压暗隔离边 + 四角铆钉，切角代替圆角矩形（`D.chamfer`，全部 `D.rr` 已换掉）。样式：`panel` / `hud` / `btn` / `primary`（亮一档木板 + 选中黄铜 `#B9894F`）/ `ad`（金币黄铜 `#C18A45`）/ `danger`（陶红 `#A8483A` + 裂纹）/ `ghost`。`UI.panel`、`UI.button`、提示飘条、HUD 面板、商店价格键都用它。
- **焦点**：手柄 / 键盘导航改成四角 L 形羊皮纸括号（`#E8D9B5`），不再用金色描边。
- **标题页**（参考概念图 1）：Logo 木牌在上三分之一（思源宋体），「FLAME GUARDIAN」小木牌，菜单是左侧竖排木框按钮（开始 / 继续守护、新的守护、每日挑战、火光纪录、玩法、设置、退出），声音开关在左下。
- **对局 HUD 三层**：
  1. 常驻：左上火光（10 簇火苗串 + 炉火包盾徽记）、生命、法力、位阶；右上波次、倒计时（最后 10 秒「守住片刻」）、金币；底部中间建造栏；右下技能栏；左下战意。
  2. 情境：走近建筑或圣火时，右下技能栏上方弹出信息卡（名称、身份 · 等级、耐久、一句用途、可用动作）。
  3. 提示：顶部横幅一次只显示最要紧的一条（守火人倒下 > 巨影 > 强敌 > 圣火受击 > 火光将熄 > 整备 > 波次开始 > 晋升 > 战意 > 四面有敌 > 再守 N 秒）；第一波右侧教程卷轴依次讲四五件事。原来压在画面中间的 Boss 来袭、晋升、本波完成、复活倒计时、第一波操作提示都移走了。
- **边缘来袭箭头**：画面外的敌人按方向分 12 个扇区，每个扇区一支红箭头（`#FF3B3B`，只用于来袭），数量多箭头大；文案按最危险的一只取：巨影来袭 / 强敌逼近 / 直扑圣火 / 疾影来袭 / 黑影逼近；3 个及以上方向时横幅显示「四面有敌」。上下沿的箭头放在中央 50% 之外。
- **界面审计新规则**：战斗中，提示层（`D.tip` 标记的文字：横幅、教程卷轴、飘条、来袭箭头文字）只要进了画面中央 50%（x 240–720，y 135–405）就算问题。新增 `07b_alerts` 场景（Boss 横幅 + 兵营信息卡 + 多方向来袭）。18 个界面全 0。
- **文案**：按 `docs/UI_COPY_V1.md`（取自 PR #9，只取文档，没合它的 `ui.js`）接入标题、选人、整备、暂停、重燃、结算、纪录、设置 / 按键、HUD 标签、横幅和箭头短语。文案表第 6 节在 `js/data.js` 里的成就 / 道具描述按分工交 Grok 合。
- **没做的（等 PR #6）**：全套图标注册表。正本是 PR #6（`codex/ui-icon-system-v1`，本地 Codex 在重写色表、尺寸档和夜战亮度），PR #7 的 V2 只是对照稿，不照做。现有图标（技能、武器首字、塔名）暂时保留，PR #6 定稿后再接。
- 截图：`shots/audit/01_title.png`、`06_battle_w1.png`（教程卷轴 + 圣火信息卡）、`07b_alerts.png`（Boss 横幅 + 红箭头 + 兵营信息卡）、`08_respawn.png`、`12_shop.png`。

### 游戏图标（正式稿，2026-09-26）

正式图标是 AI 辅助的手绘稿，不是代码画的那一版。文件在 `assets/branding/`，进安装包白名单，网页包用它做 favicon、`manifest.webmanifest` 和加载画面。

| 项 | 内容 |
|---|---|
| 文件 | `assets/branding/icon_1024.png`（1024×1024），以及同源缩小的 `icon_512.png`、`icon_256.png`、`icon_128.png` |
| 来源 | ChatGPT 图像生成（chatgpt.com，内置图像生成，推理档 High）。AI 辅助，2026-09-26 |
| 选定 | 候选 **#2**「石台 / 火盆」（stone altar / brazier）。同一次还出了火焰、持火把的守护者、莲花 / 凤凰火三张，未采用 |
| 用途 | 网页包 favicon（128）、苹果触摸图标（256）、manifest 四档、加载画面居中的 256。浏览器预览的 `preview.html` 同样指向 128 |

提示词原文：

```
Please use image generation to create 4 SEPARATE square 1:1 images (four individual images, one per variation — not a single grid/collage). Generate each at full resolution.

Brief — app icon / avatar for an original mobile + web game called "Ringwatch" (圣火守护者). The icon must read clearly when shrunk to 144px: one bold central subject, simple silhouette, strong value contrast.

Core subject: a sacred flame held inside a luminous ring of light. Concept "light is color": inside the ring, warm saturated hand-painted colors (gold, amber, ember red); outside the ring, everything fades into cool indigo / ink-wash silhouette.

Style: natural hand-painted brushwork, painterly, visible brush texture, soft glowing light edges. Full-bleed square artwork.
Avoid: hard-edged spotlight circle, thick bevelled frame, stacked borders, over-glossy gradients / outlines / highlights, sticker look, any text or letters, watermark. Original design only — do not reference or imitate any existing game's logo or icon.

The 4 variations:
1. The flame alone, floating inside a soft ring of light on a deep indigo background.
2. The flame burning on a small stone altar / brazier, with the ring glow around it.
3. A tiny guardian silhouette holding a torch, facing the dark, with the flame's ring of light encircling them.
4. A stylized flame shaped like a lotus / phoenix, within the ring of light.
```

`desktop/icon.js` 仍用代码画一版夜蓝底板、圣火和火盆，给 `tools/icon.js` 生成 `build/icon.ico` / `build/icon.png`（`build/` 不入库），桌面窗口图标暂时还用这一版。造型可以改 `sample()`，或以后改成直接读 `assets/branding/`。

### 渲染管线（`js/gl3d.js`，基于 Three.js）

| 效果 | 做法 | 在哪调 |
|---|---|---|
| 光照 | 半球光（天空 / 地面）+ 方向光，MeshStandard 材质 + 平面着色 | 光照预设的 `sky` `ground` `sun` `light` |
| 实时阴影 | 方向光 PCF 软阴影，跟随镜头覆盖可见范围 | 预设的 `shadowDark`（阴影里保留多少直射光） |
| 卡通描边 | 反向外壳，沿平滑法线外扩 | 预设的 `line`（颜色）；粗细在 `gl3d.js` 的 `uLineW` |
| 泛光 | UnrealBloom（HDR） | 预设的 `bloom`（强度）、`thr`（阈值） |
| 调色 | 饱和度 / 对比度 / 亮度，之后 Neutral 色调映射 | 预设的 `grade: [饱和, 对比, 边缘光(暂未用), 亮度]` |
| 自发光 | 顶点自发光强度（`GB` 各函数的 `em` 参数） | 模型里的 `em`；整体强度是预设的 `em` |

- 颜色全部按 sRGB 书写，渲染层自动转线性空间。
- 发光小物件（金币、晶体）和水面不描边、不投影：`W3.init` 里设 `mesh.outline / mesh.shadow = false`。
- 画质自适应：帧时间持续超过 30ms，会按 泛光 → 描边 → 阴影 的顺序自动关闭。
- 浏览器调试：`?lowfx` 关掉全部效果，`?hifx` 锁定画质不降级，`?2d` 强制 2D 退路。

### 混合光照（2026-09-26，`grok/art-hybrid-cursor`）

白天改成暖日照、草地保持饱和的绿；夜里圣火是暖核，按距离淡出到蓝紫，暗部抬起来，村屋还看得见。阴影填光是蓝紫，不落到纯黑。桥上和英雄脚下的描边金圈去掉，只留软光。

地址：`?night` 开北桥夜战；`?day` 开同一座桥，光照切到白天。

程序纹理（无图片、非 AI 生成）：地形和建筑在片元里用两层世界坐标值噪声。亮度起伏大约 ±`paint`，再叠一点暖 / 冷色漂移（红往上、蓝往下）。精灵立牌不加这层，避免盖住画好的笔触。参数 `RW.C1_LIGHT.paint`（当前 0.09），着色器在 `js/gl3d.js` 的 `fgNoise`。

| 想调什么 | 位置 |
|---|---|
| 白天 / 黄昏 / 夜晚 / Boss 的太阳、天光、雾、暗部保留 | `js/world3d.js` `envPreset` |
| 圣火衰减、圈外冷暖、雾的浓淡、阴影的蓝紫、笔触强度 | `js/data.js` `RW.C1_LIGHT` |
| 草地、石板、木屋、水面的固有色 | `js/world3d.js` `PAL` |

## 红线

- 不引入图片、模型文件；例外只有「字体」一节记录的 OFL 字体、「AI 素材」一节登记过的精灵图集，以及上面登记过的正式图标 `assets/branding/icon_*.png`（`tools/check.js` 会拦下没登记的）。若确实要接外部模型（如 GLB，Three.js 已能加载），先写方案、说明授权来源，征得负责人同意。
- 不做影响读图的全屏效果（大面积暗角、强烈镜头光晕、全屏抖动）。

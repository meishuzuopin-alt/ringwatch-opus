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

### 游戏图标（FG-ART-002 阶段 0）

`desktop/icon.js` 用代码画：夜蓝圆角底板、圣火金到余烬橙的火焰、铜色火盆和石台，4×4 超采样。打包前 `tools/icon.js` 生成 `build/icon.ico`（16–256）和 `build/icon.png`（1024），`build/` 不入库；桌面版运行时也用它设窗口图标。造型可以由 Codex 直接改 `sample()`。

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

## 红线

- 不引入图片、模型文件；字体只有下面「字体」一节记录的 OFL 字体（见 `AGENTS.md` 硬规则 1 的例外）。若确实要接外部模型（如 GLB，Three.js 已能加载），先写方案、说明授权来源，征得负责人同意。
- 不做影响读图的全屏效果（大面积暗角、强烈镜头光晕、全屏抖动）。

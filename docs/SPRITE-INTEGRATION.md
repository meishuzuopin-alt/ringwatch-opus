# 精灵图接入说明（grok/sprite-integration）

来源：5 套已批准的 2D 精灵图（hero、grunt、elite、boss、guard），2026-09-25/26 用 ChatGPT 图像生成出 6 行 × 4 列白底精灵表，
离线抠像 / 清光晕 / 身高归一 / 脚底对齐后打包成图集。来源、提示词摘要与渲染做法登记在 `docs/ART.md`「AI 素材」一节。

## 文件

| 文件 | 说明 |
|---|---|
| `assets/sprites/<名>/<名>.png` | 图集，4 列 × 6 行等大格子 |
| `assets/sprites/<名>/<名>.json` | 元数据：`frame_w/h`、`pivot_x/y`（脚底在格子里的像素位置）、`body_height_px`、`height_rel_hero`、`fps`（走路 / 待机帧率、攻击每帧时长） |
| `js/sprite_anim.js` | `window.SpriteAnim`：`walkPose` / `idlePose` / `blendPose` / `restPose` / `castFrameAt` / `castFlash` / `lanternFlicker`（ES5；姿态函数可传 `out` 复用对象） |
| `js/sprites.js` | `RW.SPR`：内嵌一份元数据 `SPR.META`（运行时不读 json——Electron 的 `file://` 下 fetch 不可靠；`tools/check.js` 核对两边一致）、贴图 / 材质 / 每套图一个 `InstancedMesh`、`SPR.put` 画一格、`SPR.animate` 动作状态机 |
| `js/world3d.js` | 决定谁用哪套图（`ESPRITE` / `SSPRITE` / `heroSprite`），并保留方块低模作退路 |

加载顺序：`gl3d.js` → `sprite_anim.js` → `sprites.js` → `world3d.js`（`preview.html` 与 `game.js` 一致）。

sha256：
```
hero  c195509cf1c88a82249f0e60e2b038de1f3eec1afa102cfcfbc80062f9ca7065  (800x912)
grunt 7a4f7af22fd65b0709e71a0f7bc7476aa1ea93971f11d0176eff93a1073c846f  (712x858)
elite cc96faaf09b44c923710aa4d4bb1e6d6a7446b1fa8f862e221f657b8aa2c5853  (944x768)
boss  8218187919e4992bdcaf27045d92dc074c38749fe4b712c0eada46820bf50f32  (960x1404)
guard ac865ab39ed20e2ff4d9741f838b0b0a0b6406b9b43facca1aee1d9fce4ba234  (704x702)
```

## 图集约定

行序（见 json `rows`）：0 walk_down、1 walk_right、2 walk_left（单独画的，不是镜像）、3 walk_up、4 idle_down、5 attack（正面）。
格 (r, c) 在 x = c·frame_w、y = r·frame_h。世界身高 = 英雄身高 × `height_rel_hero`；立牌高 = 身高 × frame_h / body_height_px；宽 = 高 × frame_w / frame_h。
身高：hero 1.0、grunt 0.85、elite 1.0、guard 1.0、boss 1.9。英雄身高 = 碰撞半径 × 4.6（`SPR.CFG.heroH`）。
帧率：走路 8（boss 6）、待机 4、攻击按 json 里的每帧时长数组。
盾卫攻击向屏幕右刺：目标在她左边时水平镜像（`iFrame` 的 u 宽取负）。

## 动作

`walkPose(t, fps)` 起伏 2.5% + 触地 / 过腿 0.97/1.03 压伸；`idlePose(t, 1.6, 0.03)` 呼吸；状态切换 `blendPose` 过渡 0.2 s；
攻击 `castFrameAt(t, durations)`；英雄施法光 `castFlash(frame, u)`；提灯 `lanternFlicker(t, base)`。
姿态的 y 是世界向上（加在实例平移上，不受立牌后仰影响）。

## 渲染

面朝镜头的平面（列 0 = 镜头右、列 1 = 镜头上、列 2 = 朝镜头），`MeshLambertMaterial` 受光，走同一套 `fgInject`（暖光圈 / 边缘光 / 雾 / 闪白），
sRGB 贴图，alphaTest 0.5，写深度，不投实时阴影、保留脚下圆形接触阴影。
贴图过滤：线性 + mipmap（对照过最近邻：40–110 像素下走路时轮廓抖动，弃用；浏览器加 `?nearest` 可再对照）。
方向 = 屏幕速度的主轴（下 / 右 / 左 / 上，带滞后）；待机 / 攻击用正面行。

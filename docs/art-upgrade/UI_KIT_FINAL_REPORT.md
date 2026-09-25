# UI 定稿验收：A+C「炉木夜釉」

状态：正式资产候选；尚未接入运行时代码。上位规则为 `FG_ART_BIBLE_001.md`。

## 方向与层级

- **常驻战斗层**：去面板。波次、倒计时、金币直接排在场景上；仅生命组与动作栏使用夜蓝低对比带（透明度 0.58）。
- **情境层**：目标铭牌贴着世界物体出现，不进入中央安全区 `x=240–720, y=135–405`。
- **菜单层**：雕木、铸铁、陶瓦、火漆只用于整备、暂停与结算；战斗中不出现完整木作面板。
- 光源统一来自左上；夜间 UI 整体压暗 15%，只保留微弱暖色反光。

## 12 条精修完成情况

1. 语义色：圣火 `#FFB547`；金币黄铜 `#C9A27A`；法力 `#5FA8C8`；生命 `#A8483A`；Boss 身体 `#6B3FA0`、红眼点 `#FF3B3B`。黄铜／圣火相对亮度实测 **0.724**。
2. 线宽：图标外轮廓固定 2 逻辑像素；大尺寸内部细节不超过 1.5 像素；使用 `vector-effect=non-scaling-stroke`。
3. 剪影：关键 12 枚重新分配分叉火舌、心形、六面火晶、八边币、宽剑、窄盾、偏心爆芒、折电、尖塔、角颅、矮箱、十字齿轮外形；16px 最大两两 IoU **0.700**（生命／护甲），其余组合更低。
4. 小尺寸：16px 与 24px 是整数网格独立版本，仅保留主剪影；灰度三底证明见 `icons16_gray.svg`。
5. 卡牌：凡品素木；精良月青双钉；史诗四角雕饰；传说火冠、侧饰与内描边。示例换为圣火护符、磨刀石、塔楼图纸、龙心实物剪影。
6. 资源条：高度 40px、有效条高 15px；刻度间隔 10%；包含浅色受伤滞后条、雕刻端盖与 1px 上缘高光。正文／夜蓝对比度 **8.52:1**。
7. 交互态：默认、悬停、按下、禁用、焦点五态齐全；按下位移 1px，不变橙；焦点使用四个分离括号。另提供 selected/cooldown/poor/locked 等状态叠层。
8. HUD：常驻信息去框；允许的夜蓝带透明度 **0.58**，原色相对亮度 **6/255**；所有示例避开中央安全区。
9. 金色：只有圣火使用满亮金。黄铜不泛光；所有资产禁用 `feGaussianBlur` 与 SVG filter。
10. 材质：菜单木作使用结构木色、低对比磨损线与 1px 上缘；不使用满铺渐变或多层描边。
11. 九宫格：菜单与卡框 inset 为 `24/24/24/24`；HUD 为 `16/16/16/16`；拉伸证明见 `nine-slice-stretch-test.svg`。
12. 字体与导出：展示页仅声明仓库的 `fg-sans-500/700`、`fg-serif-900`；字号层级为 28/18/13/11。无可用 Chromium 的环境提交直接引用底图的 SVG 合成稿，避免上一轮 SVG 套 SVG 的底图丢失。

## 全量覆盖

- 图标 ID：**226 / 226**。
- 尺寸：每个 ID 含 16、24、32、48，共 **904** 个 SVG。
- 状态：manifest 为每项声明 default、focus、selected、cooldown、poor、locked、disabled、pressed；7 个可复用状态叠层位于 `assets/ui/kit/`。
- UI 套件：32 项，含 HUD／菜单面板、按钮五态、快捷键圆木盘、盾牌徽章、四稀有度卡框、四资源条、横幅、提示、tooltip、页签、滑杆、开关、勾选框、预警箭头及状态角标。

## 可复现验收

```bash
node tools/generate-ui-kit.js
node tools/generate-ui-previews.js
node tools/ui-manifest-check.js
node tools/ui-visual-audit.js
```

预览：`ui-kit-final.html`、`combat-day-compare.svg`、`combat-night-compare.svg`、`preparation-compare.svg`、`icons16_gray.svg`、`nine-slice-stretch-test.svg`、`style-reference-notes.svg`、`icons-catalog.svg`、`shop-cards.svg`、`ui-before-after-1920.svg`。

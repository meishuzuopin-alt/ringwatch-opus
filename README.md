# 环带值守 Ringwatch

奇幻守村 · 低多边形 3D · 割草 + 塔防 + 肉鸽 · 10 个可解锁英雄。目标平台 **Steam**（横屏 16:9）。
画面用 Three.js 实时渲染，模型、重金属风格的音乐和音效全部由代码生成，没有任何美术或音频文件。

## 怎么运行

**桌面版（Steam 版就是它）**

```
npm install
npm run desktop
```

F11 或 Alt+Enter 切换全屏。

**浏览器预览**

```
npm run dev
# 浏览器访问 http://localhost:8080/
```

## 怎么操作

- **移动**：WASD / 方向键，也可以按住鼠标拖动
- **攻击**：武器自动瞄准、自动开火
- **冲刺**：空格（短暂无敌，能撞伤敌人）
- **技能**：Q
- **造塔**：B，再按 1–8 选种类，建在脚下
- **八类防御塔**：箭塔、寒霜塔、聚金桩、兵营、熔岩炮、守誓碑、缚灵柱、引火灯塔
- **守护庭院**：每局获得余烬印记，可永久强化圣火、开局补给、建塔成本和防御塔伤害
- **战意**：在身边击杀攒战意，攒满进入「狂热」；逃跑会掉
- **守护圣火**：村子中央的圣火熄灭，这局就结束
- **整备**：1–4 购买，R 刷新，Enter 开始下一波
- **暂停**：Esc 或 P

## 开发

需要 Node 18+。协作分工与规则见 `AGENTS.md`，美术方向见 `docs/ART.md`。

```
npm install          # 装开发依赖：Electron、Playwright、Three.js 打包工具
npm run dev          # 浏览器预览 http://localhost:8080/
npm run desktop      # 桌面版
npm run check        # 提交前必跑：语法 / 入口一致 / 模拟冒烟 / 包体
npm run test:towers  # 验证八种塔的战斗与辅助职能
npm run test:yard    # 验证庭院永久成长与远征奖励
npm run test:flow    # 浏览器流程测试
npm run shots        # 美术评审截图，输出到 shots/art/
npm run balance      # 数值测试
npm run music        # 离线渲染背景音乐试听
npm run dist:win     # 打 Windows 包（Steam 上传用，见 docs/STEAM.md）
```

UI 图标由 `js/ui-icons.js` 独立绘制，可整体替换；目录和操作见 `docs/UI-ICON-REPLACEMENT.md`。王庭玩法映射见 `docs/WANGTING-GAMEPLAY-PORT.md`。

每个 PR 会自动跑以上检查，截图在 Actions 运行页面的 `screenshots` 产物里下载。

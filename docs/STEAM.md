# Steam 上架清单

> 数字、尺寸和流程以 Steamworks 后台（partner.steamgames.com）当时的说明为准，这里是整理好的待办。

## 一、账号与费用（负责人办）

- [ ] 注册 Steamworks 合作伙伴账号，完成身份、税务、银行信息
- [ ] 支付 Steam Direct 上架费（每款游戏 100 美元，游戏收入达到一定额度后返还）
- [ ] 拿到 **AppID**（之后接成就、云存档都要用）
- [ ] 注意：新账号付费后要等一段时间才能发售；商店页需要先以「即将推出」上线一段时间。具体天数看后台

## 二、商店页（美术 / 文案）

所有素材都要原创，不能用其他游戏的截图或美术。

| 素材 | 尺寸（像素） |
|---|---|
| 页眉胶囊图 Header Capsule | 920 × 430 |
| 小胶囊图 Small Capsule | 462 × 174 |
| 主胶囊图 Main Capsule | 1232 × 706 |
| 竖版胶囊图 Vertical Capsule | 748 × 896 |
| 库胶囊图 Library Capsule | 600 × 900 |
| 库主视觉 Library Hero | 3840 × 1240 |
| 库 Logo（透明底） | 1280 × 720 |
| 游戏截图 | 至少 5 张，1920 × 1080 |
| 宣传片 | 建议 30–90 秒，开头 5 秒就要看到割草和塔防 |

- [ ] 截图：`npm run desktop` 全屏后按系统截图；或在 Actions 的 `screenshots` 产物里挑构图，再用真机截高清版
- [ ] 简短描述、详细描述、标签（建议：动作 Roguelike、塔防、割草、低多边形、奇幻、单人）
- [ ] 系统要求（最低：支持 WebGL2 的独显或近几年的核显、4GB 内存）
- [ ] 内容问卷与分级（无血腥、卡通暴力）
- [ ] 定价、是否参加新品节 Steam Next Fest（先放免费试玩 Demo 是常见做法）

## 三、构建与上传（工程）

- [x] Electron 桌面壳：`npm run desktop` 本地运行，F11 / Alt+Enter 全屏，标题页可退出
- [x] 打包：Actions →「桌面版打包（Steam 上传用）」→ Run workflow，下载 Windows / macOS / Linux 免安装目录
  - 本地：`npm run dist:win` / `dist:linux` / `dist:mac`，输出在 `dist/`
- [x] 存档写在用户目录（Windows：`%APPDATA%/Ringwatch/saves/*.json`，改名后沿用这个目录），方便开 Steam 云存档
- [ ] 在 Steamworks 为每个平台建 Depot，用 SteamPipe（steamcmd / ContentBuilder）上传对应目录
- [ ] 启动项：Windows 指向 `FlameGuardian.exe`，Linux 指向 `FlameGuardian`
- [ ] Steam 云存档：后台用 Auto-Cloud 同步上面的 saves 目录，不用写代码

## 四、建议上线前补的功能

| 项目 | 为什么 | 工作量 |
|---|---|---|
| **英文版** | Steam 大部分玩家不读中文；目前所有文案都是中文 | 中：把文案抽成语言表 |
| **手柄支持** | Steam Deck 与客厅玩家；拿「Deck 已验证」需要 | 中：移动 / 冲刺 / 技能 / 造塔 + 菜单焦点导航 |
| 成就 | 商店页会显示，玩家很看重 | 小：拿到 AppID 后接 steamworks.js，解锁英雄等天然就是成就 |
| 设置页 | 分辨率 / 全屏 / 画质（阴影、描边、泛光）/ 音量滑块 | 小 |
| 应用图标 | 现在是 Electron 默认图标 | 小：出一张 512×512 图标即可 |
| 崩溃与性能 | 低配机器帧率；画质已能自动降级 | 持续 |

## 五、版权自查

- 模型、音乐、音效全部由代码生成，原创
- Three.js（MIT）、Electron（MIT）的许可证已随包附带（`vendor/three.LICENSE`、打包目录里的 `LICENSE.electron.txt`）
- 不使用任何其他游戏的数值表、源码、美术（见 `AGENTS.md` 硬规则）

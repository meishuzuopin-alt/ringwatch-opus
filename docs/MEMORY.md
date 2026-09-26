# 项目记忆

完整版。硬规矩的短版在 `.cursor/rules/project-memory.mdc`（`alwaysApply: true`）。两份都要保持真。每完成一项重要工作或做出新决定，同步更新本文件和那条规则。

进度细节以 `docs/HANDOFF.md` 为准。本文件写于 2026-09-27，事实来自当时的 `origin/main`、`docs/HANDOFF.md`、`docs/ART.md`、`README.md` 和 GitHub PR 状态。没有打开主副本，所以不描述主副本里未提交的内容。

## 跟用户说话

- 用户只看图。技术、代码、PR 自己拍板。
- 汇报是短回执加对比图。图多字少。
- 审美选择：给出并排对比，等用户挑。其余：决定后直接做。
- 省额度：每个需求先只出一组，方向确认后再加量。Codex 强度用「高」，不用「极高」。
- 概念图不是运行时。未合并的资产分支也不是运行时。没有真截图或测试通过，不要说功能已经做好。

## 电脑分工

这台是 DESKTOP-A6JV5CO（Quadro P2000）。Cursor 在这台写代码。游戏截图在这台拍，因为有显卡。云端机器没有显卡，每次最多截 1 张，不能代替本机对比图。

截图脚本（交接文档所记）：`%TEMP%\rwshot\bake.js`，seed=1，快进到开战第 20 秒，端口 8766，1280×720。地址参数：`?day`、`?night`（北桥夜战）、`?tex=0`（关贴图）、`?skipopening`（跳过开局）。

总调度云电脑（用户本人用）负责：

- `gh`，登录 meishuzuopin-alt，用来看 PR、合并、推 `grok/*`。
- 浏览器登录：Midjourney、Claude（claude.ai/code，圣火守护者会话；小任务用 Sonnet 5 省额度）、Gemini Pro（laiou suo）、ChatGPT / Codex、Grok、Trae。
- 连接器：GitHub、Google Drive、Slack、Excalidraw。

写本文件时，本机 `gh auth status` 也显示已登录 meishuzuopin-alt。这不改变分工：浏览器登录不在这台机器上，gh 的主责仍是云电脑。

往带中文的路径拷文件会失败。先拷到纯英文路径，再移过去。

## 本地副本

| 路径 | 用途 |
|---|---|
| GitHub `meishuzuopin-alt/ringwatch-opus` | 真源 |
| `D:\开源游戏\_try_opus\ringwatch-opus` | 主副本。有用户未提交改动。禁止读写 |
| `D:\开源游戏\_try_opus\ringwatch-opus-worker` | 代理干活的工作副本 |
| `D:\开源游戏\_try_opus\ringwatch-play` | 本地试玩 |
| `D:\开源游戏\_try_opus\ringwatch-models` | Blender 试验，分支 `grok/models-trial` |
| `D:\WangzheCourtyard` | 还没整理，还不是 git 仓库。设计积压 / #66 原型，不是当前冲刺 |

交接文档还提到可以后删的 worktree：`ringwatch-agy`（已关闭的 #27）、可能已不在的 `ringwatch-base`。删的时候用 `git worktree remove`，不要动主副本里的文件。本记忆提交没有删它们。

## 工具登录和用法

1. Codex 桌面（ChatGPT 应用，项目「圣火守护者 Flame Guardian」）：已登录。模型 GPT-6 Luna。强度永远「高」，不用「极高」。出图标、卡牌和美术，能写代码，能用 `blender -b --python` 驱动 Blender。Cloud 版不能调推理强度，分支名会自动生成。
2. Antigravity（Gemini）：已登录。命令行 `C:\Users\x\AppData\Local\agy\bin\agy.exe`（agy 1.2.11），用桌面登录。用法：先 cd 到目标，再 `agy -p "任务" --add-dir <目录> --output-format json --print-timeout 30m`。`--effort high`。续聊用 `-c <id>`。角色只出建议（审图、设计意见），不改代码。不要加 `--dangerously-skip-permissions`。
3. Cursor CLI（`cursor-agent`）：已登录 meishuzuopin@gmail.com。Pro+（$60/月，按需计费关闭，额度于 10 月 26 日重置，交接时如此）。云端代理默认 `grok-4.7`，推理 high，fast 关闭。不要 Auto，Auto 会花 Other Models 额度。
4. Blender 5.2.1：`D:\blendr\blender.exe`。无界面 Python 可跑（`blender -b --factory-startup --python ...`，启动大约 70 秒）。Unity 和虚幻也装在这台，路径未记在交接里，不要猜。
5. 自检：`node tools/check.js`，必须退出码 0。需要 Node 18+。

执行分工：Cursor 做高频实现和清扫。Codex 出图，并在 `grok/*` 或 gpt-6-luna 上写代码。Claude 额度允许时啃难工程，派活要用户批准。本机稀缺、不要拿来做日常改动的：本地 Godot、显卡截图、网页调研、里程碑验收。

## 画风（已锁定）

风格化写实：写实的光影、材质和体积感，加上手绘笔触和柔和配色。白天参考融白1（交接里也称 H1），夜晚参考融夜1（交接里也称 H3）。原图曾在总调度电脑的 `/workspace/arttarget/hybrid/`，并复制到工作树的 `.ref/`。

C1「光即色彩」：圣火光圈内暖、饱和；圈外褪成冷靛蓝；暗处不能压成纯黑；不要硬边光圈。

角色在画面里必须够大、够清楚。当前第一优先：拉近镜头，或放大角色，让角色接近早上那张近景的比例，同时夜战和手机竖屏还要留够视野。拍同机位对比图给用户看。

main 上已有五套手绘精灵立牌，登记在 `docs/ART.md`：`assets/sprites/` 的 hero、grunt、elite、boss、guard（PR #17）。早上对比图里几乎看不见，是镜头太远，不是被删了。

还没选定，不要替用户定：进化图里的英雄是兜帽加发光眼睛，和现在有脸的英雄精灵不一样。

UI 三个方案给用户看过：U1 融进场景、U2 手绘卷轴、U3 极简。交接推荐极简。用户还没选。

`docs/ART.md` 开头仍有更早的「低多边形」基线。以 2026-09-26 交接锁定的风格化写实为准。新的 AI 资产仍要登记进 `docs/ART.md`。`README.md` 里「没有任何美术或音频文件」已过时：main 上已有精灵、六张柔和地表贴图、正式图标和 OFL 字体。

## 美术资产还没进游戏

- 草稿 PR #31，分支 `grok/art-assets-full`，2026-09-27 仍是 OPEN 草稿，未合并。交接登记 217 个文件（敌人 4 种、首领巨影、英雄三段进化 × 5 火色、守卫 3 种、圣火/祭坛 8 种状态、资源图标 12、道具 44、村子建筑 12、特效 18、UI 26、卡牌 12 + 6 档卡框、地砖 8 + 地面贴花 16）。git 上该分支比与 main 的合并基线多 240 个提交，main 另有 4 个提交不在该分支上。`tools/check.js` 只放行 `SPR.META` 里登记的文件，要先加白名单再接入。合并时交接要求 squash。
- 卡牌稀有度：`js/data.js` 当时只有 3 档，要扩成 6 档（普通/优秀/稀有/史诗/传说/神话）。卡框约 200×365，偏糊，要更清晰再让 Codex 出一版。三选一界面还没装上这 12 张插画和 6 档卡框。
- 草稿 PR #32，分支 `grok/models-trial`，2026-09-27 仍是 OPEN 草稿。树（594 面，25KB）和小屋（2594 面，203KB），外加 `.blend` 和 `tools/blender/` 脚本。比例和配色大致对，造型粗糙，只是占位。村子道具先用 Codex 画好的 2D 立牌（和早上的角色精灵同一做法）。Blender 留给需要真立体的桥和地形；要继续用，先贴手绘贴图再加细节。

门面图（图标、商店胶囊/封面、主视觉）必须用户亲手精修，保留分层 PSD 和过程截图，并逐步登记。不许伪造过程文件，不许让 AI 直接出最终门面图。

玩法可以借鉴。代码和美术不能抄。不要搬 Kingdom Rush、星露谷、饥荒、Brotato、Diablo 的名字、数值表、像素 UI、素材。

## 已合并到 main（GitHub 状态，2026-09-27）

| PR | 标题 | 分支 |
|---|---|---|
| #2 | Review reusable WebGL shadow, outline and bloom passes | `codex/render-upgrade-review` |
| #3 | 圣火守护者 Steam 版：Three.js 横屏、20 波闭环、圣域 10 级、大地图、兵营指挥、全局品质审计 | `claude/gift-card-balance-usage-4coauk` |
| #17 | 2D billboard sprites for hero / grunt / elite / boss / guard | `grok/sprite-integration` |
| #18 | Scene C1: warm flame, cool indigo outside | `grok/scene-c1-light` |
| #25 | M0 night battle on the north bridge, plus ad reward fixes | `grok/m0-night-core` |
| #26 | Add an English CrazyGames web build and the official icon | `grok/web-crazygames` |
| #28 | Warm daylight and soft indigo night on the bridge | `grok/art-hybrid-cursor` |
| #29 | Playable first-launch opening: carry ember to altar, ignite, title fade | `codex/add-inside-style-opening-to-game` |
| #30 | Night battle 3-pick-1 upgrades | `grok/gameplay-pick3` |

#27（Antigravity 画风 bake-off，`grok/art-hybrid-agy`）已关闭，未合并。交接写明：合并 #28 和 #30 时 GitHub 检查是 UNSTABLE。本文件没有复查当前 CI。

main 上因此已有：夜战（北桥 M0、三选一）、开局钩子、五套精灵、风格化写实光照和 CrazyGames 英文网页包。这些以仓库和截图为准，不要凭概念图重报一遍。

## 还没做完（交接顺序）

1. 第一优先：拉近镜头或放大角色，并出对比图。
2. 把 PR #31 的立牌接进场景前，先过白名单；兜帽英雄等用户选。
3. 场景填充，逼近融白1 / 融夜1。主力用 2D 立牌，不把 PR #32 的占位模型当成品。
4. 白天经营循环：火光圈里采集、搬运、堆放，村民排队，建房，扩大火光圈。11 月网页测试前要做完。目标人均时长 10 分钟以上、次日留存 10% 以上。借鉴机制，不抄美术。
5. 夜战后续：合成、大招、翻盘爆发、剪影敌人；守卫三段进化；五种火色互相克制。
6. UI 等用户在 U1 / U2 / U3 里选。
7. CrazyGames 上架素材：封面 1920×1080、800×1200、800×800，两段 15–20 秒无声预览（1920×1080 和 1080×1620），英文介绍。封面是门面图，用户亲手精修。
8. 以后再做：护火远征、装备。不要开工「守梦空间」。

## 玩法宪法

白天种因，黄昏锁定出装，夜晚兑现。

## 变现

顺序不要改：先 CrazyGames 网页广告（个人，激励视频），再 Steam 愿望单页（即将推出），再拿数据找移动端发行商测试，最后 Steam 买断上线。

交接里的时间：10 月 CrazyGames；11 月中 Steam 即将推出。发行商名字写的是 Supersonic、Voodoo，还没签约。Steam 定价 $6.99 / ¥28。2027 年 2 月 Next Fest 要在 1 月 10 日前报名，最好有 1000 个以上愿望单；正式发售门槛写的是 7000 个愿望单。Steam 要披露玩家能看到的 AI 内容；AI 辅助写的代码没有问题。

国内：用户先以个人身份做微信/抖音小游戏，只能靠广告，需要软件著作权。软著热线 010-61090099。2026 年 3 月版权中心曾要求手写「未用 AI」承诺。不要让用户签。先打电话问清楚。

## 助手名单

19 个游戏助手，外加两个非游戏角色，再加一个群。只有总调度、游戏搭建、本地任务传话真正派过活。其余只在简介里，供查阅。云检对接单独干，不和其他助手交流。

游戏助手：

- 游戏策划：玩法与系统设计、需求文档
- 关卡/任务设计：远征、庭院、天下这一整套可重复玩的循环
- 数值经济：掉落、成长曲线、经济数值
- 游戏搭建：用引擎和 Cursor/GPT 把游戏搭起来
- 主程/技术制作：存档、性能、平台包
- Build/CI·平台包：Steamworks、代码签名、安装器、发版流水线
- 客户端性能·内存：抓帧、内存、卡顿、包体大小
- Tools·DNA 编译器：编辑器工具、导入规范
- TA·像素管线：技术美术、像素资产、Godot 导入
- 游戏美术：美术监制，给出能上榜的美术意见
- 游戏美工：产出角色、场景、UI、特效、图标等全部美术资产
- 打击特效：打击感、掉落反馈、夜战特效
- 游戏音频：背景音乐和音效
- 游戏测试：可玩性审计、参数打磨、Steam 上榜方案
- 宣发主视觉·增长情报：Steam 商店胶囊图和主视觉、竞品情报
- meme尤里 · 叙事增长：爆款文案、社区传播、世界观叙事
- 制作统筹/制作人：排期、预算、阶段验收
- 本地任务传话：盯本地 Codex 干活，在 GPT 和 Gemini 之间来回传话
- 云检对接：核对云端产出、对齐本地环境

非游戏：本地维护 Geek（电脑维护）、总调度（用户）。

群：「laiou suo、游戏测试、游戏策划、游戏美术、游戏搭建」。

## 同步

每完成一项重要工作或做出新决定，同时改 `.cursor/rules/project-memory.mdc` 和本文件。规则文件只留硬规矩，不超过 150 行。长名单和 PR 表放本文件。

// 圣火守护者 · 数据表（v3 奇幻守村）。逻辑只读这里的表，调数值只改这个文件。
(function (root) {
  var RW = root.RW || (root.RW = {});

  // ---------- 广告位：留空 = 预览发放（不播放任何广告，按钮会写明「预览发放」） ----------
  RW.AD = {
    REWARD_REVIVE: '',   // 激励视频：复活（第 4 波起）
    REWARD_REROLL: '',   // 激励视频：整备免费刷新一次（第 4 波起，每轮一次）
    FIRST_AD_WAVE: 4     // 前三波不出现任何广告入口
  };

  // ---------- 全局手感/规格 ----------
  RW.TUNE = {
    W: 960, H: 540, DT: 1 / 60,                   // 逻辑分辨率：横屏 16:9，按窗口等比缩放
    WORLD: { w: 2240, h: 2240 },                 // 地图总尺寸（由 js/map.js 决定，sim 启动时会校正）
    ARENA: { x: 0, y: 0, w: 2240, h: 2240 },
    VIEW: { x: 0, y: 0, w: 960, h: 540 },        // 战场视口：铺满全屏，HUD 悬浮在四角
    MAX_ENEMIES: 150,   // M0 同屏验收要 150；波次模式共用这个池
    // 字体：导入的 OFL 字体子集（fonts/，由 tools/fonts.js 生成），系统中文字体兜底
    FONT: '"FG Sans", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", sans-serif',
    FONT_TITLE: '"FG Serif", "FG Sans", "Songti SC", "SimSun", serif',   // 标题：粗体且字号不小于 FONT_TITLE_MIN 时用衬线体
    FONT_TITLE_MIN: 22,
    FONT_FILES: [['FG Sans', 'fonts/fg-sans-500.woff2', '400'], ['FG Sans', 'fonts/fg-sans-700.woff2', '700'], ['FG Serif', 'fonts/fg-serif-900.woff2', '700']],
    player: {
      hp: 30, mp: 100, mpRegen: 18, speed: 165, radius: 10,
      accel: 2300, turnAccel: 3600, friction: 1150,
      iframes: 0.55, pickup: 36, crit: 0.05, critMul: 2,
      hurtPush: 190
    },
    dash: { speed: 560, time: 0.16, iframes: 0.26, cd: 2.2, dmg: 6, knock: 180 },
    camera: { lead: 0.28, follow: 7 },
    barracksCmd: { recallNear: 60 },   // 站在兵营这么近的地方按布防键 = 召回
    hitstop: { gap: 0.12, heavy: 3, shellKill: 2, eliteCrit: 2, eliteKill: 8, playerHurt: 5, mine: 3, evolve: 8, budget: 0.2 },
    shard: { life: 8, blink: 2, recallRate: 0.5, magnetSpeed: 560 },
    spawn: { telegraph: 0.8, safeDist: 170, ringMin: 260, ringMax: 470, anywhere: 0.05, idleR: 420, idleKick: 1.5 },   // idle*：身边 idleR 内没怪超过 idleKick 秒，下一群直接刷在身边（心流不断档）
    biomass: { count: 40, respawn: 14, mass: 1, near: 0.45, nearMin: 110, nearMax: 620 },   // near：刷在战线附近的比例（地图可用 orbNear 覆盖）
    momentum: { near: 160, per: 1, decayDelay: 1.6, decay: 6, tiers: [15, 40, 80], rate: [0.15, 0.3, 0.45], dmg: [0, 0.1, 0.2], speed: [0, 0, 0.1], max: 100 },
    healOrb: { chance: 0.08, near: 160, heal: 2, life: 7 },
    build: { max: 8, spacing: 34, step: 0.15, time: 0.5, coreClear: 96 },   // coreClear：圣火周围这么近不许造（留出圣火和复活点，塔也不会挡住英雄）
    // 圣火：村子中央的守护目标。它熄灭 = 值守失败（位置由地图里的 C 决定）。
    core: { x: 580, y: 900, r: 30, hp: 260, gunDmg: 6, gunCd: 0.5, gunRange: 170, waveHeal: 0.5, repairCost: 14, repairPart: 0.5, armorCost: 20, armorHp: 50, interceptDist: 110 },
    priceGrowth: 0.06,          // 每波物价 +6%，买数值要赶在曲线前面
    rerollBase: 2, rerollPerWave: 1, rerollStep: 2,
    sellRate: 0.5,
    armorPerPoint: 12,          // 护甲减伤 = 护甲 / (护甲 + 12)，最高 75%
    armorNeg: 0.08,              // 负护甲：每点受伤 +8%
    harvestBase: 6,              // 每波结束固定收成
    harvestPer: 30,              // 金币获取每 +100% ，收成 +30
    lifestealPerSec: 8,         // 吸血每秒最多触发次数
    dodgeCap: 0.6,              // 闪避上限
    thornsR: 70,                // 反伤范围
    interestCap: 40             // 单次利息上限
  };

  // ---------- 位阶（吸收灵火 / 践踏小怪 攒魂量） ----------
  // eatR：能直接踩碎的敌人半径上限（精英永远踩不动）。位阶越高越强，体型也越大、越慢、越好被打中。
  RW.EVO = [
    { name: '见习',   mass: 0,   r: 10,   color: '#ffc861', eatR: 0,    armor: 0, hp: 0,  dmg: 0,    speed: 1 },
    { name: '精英',   mass: 30,  r: 11.5, color: '#9dff7a', eatR: 8.5,  armor: 1, hp: 4,  dmg: 0,    speed: 0.97 },
    { name: '英雄',   mass: 95,  r: 13,   color: '#6fd6ff', eatR: 10.5, armor: 1, hp: 8,  dmg: 0.08, speed: 0.93 },
    { name: '传奇',   mass: 210, r: 14.5, color: '#e2a6ff', eatR: 12.5, armor: 2, hp: 12, dmg: 0.15, speed: 0.9 }
  ];

  // ---------- 武器表（6） ----------
  RW.WEAPONS = {
    needle: {
      name: '飞弩', kind: 'needle', color: '#ffe08a', cost: 16,
      dmg: 8, cd: [0.38, 0.32, 0.26], range: 235, speed: 560, knock: 80, tag: 'ranged',
      pros: '射程远、弹道快，站远了也能稳定输出',
      cons: '只打单体，打有护甲的敌人每发都被削',
      extraNote: '额外弹数：每 +1 多一发，呈扇形'
    },
    scatter: {
      name: '霰火', kind: 'scatter', color: '#ff9a3c', cost: 18,
      dmg: 4, cd: [0.9, 0.84, 0.78], range: 150, speed: 440, knock: 150, pellets: 5, spread: 0.62, recoil: 55, tag: 'ranged',
      pros: '贴脸喷出 5 团火焰，击退强，瞬间打散怪群',
      cons: '射程很短，还会把你往后推',
      extraNote: '额外弹数：每 +1 多两团火'
    },
    blades: {
      name: '护身剑环', kind: 'blades', color: '#bff5ff', cost: 18,
      dmg: 4, cd: [0.35, 0.33, 0.3], range: 54, spin: 4.4, knock: 110, count: 3, bladeR: 8, tag: 'melee',
      pros: '不用瞄准，绕身旋转，贴身清杂兵',
      cons: '没有射程，得主动往怪里钻',
      extraNote: '额外弹数：每 +1 多一片刃'
    },
    lance: {
      name: '雷光矛', kind: 'lance', color: '#b58cff', cost: 26,
      dmg: 34, cd: [1.1, 1.0, 0.9], range: 340, charge: 0.34, width: 12, knock: 90, tag: 'spell',
      pros: '一道雷光贯穿整条线，单发高伤，打精英最强',
      cons: '蓄力 0.34 秒才开火，方向提前锁死，快怪能躲开',
      extraNote: '额外弹数：每 +1 多一道偏 ±6° 的雷光'
    },
    arc: {
      name: '连锁闪电', kind: 'arc', color: '#8fc2ff', cost: 20,
      dmg: 7, cd: [0.8, 0.74, 0.68], range: 170, jumps: 3, jumpRange: 110, falloff: 0.8, knock: 30, tag: 'spell',
      pros: '必中，在敌人之间连跳，越密越赚',
      cons: '每跳一次伤害 ×0.8，单挑精英很乏力',
      extraNote: '额外弹数：每 +1 多跳一次'
    },
    mines: {
      name: '符文陷阱', kind: 'mines', color: '#ff7a4a', cost: 20,
      dmg: 15, cd: [1.4, 1.28, 1.16], range: 58, maxMines: 4, arm: 0.45, trigger: 24, life: 12, knock: 230, tag: 'spell',
      pros: '符文爆炸范围大、击退猛，把怪引过来就清场',
      cons: '只在你脚下布雷，站着不动就没有输出',
      extraNote: '额外弹数：每 +1 同时存在的雷 +2'
    }
  };
  // ---- 第二批武器（M1）：沿用已有攻击方式，按流派补齐，每个流派都能凑满 6 层套装 ----
  RW.WEAPONS.repeater = {
    name: '连弩', kind: 'needle', color: '#d8ff8a', cost: 18,
    dmg: 4, cd: [0.2, 0.17, 0.14], range: 200, speed: 620, knock: 30, tag: 'ranged',
    pros: '射速极快，适合叠攻速和暴击',
    cons: '单发很轻，护甲怪会把每一发都削掉',
    extraNote: '额外弹数：每 +1 多一发'
  };
  RW.WEAPONS.javelin = {
    name: '标枪', kind: 'lance', color: '#ffd9a0', cost: 22,
    dmg: 26, cd: [1.2, 1.1, 1.0], range: 380, charge: 0.18, width: 9, knock: 140, tag: 'ranged',
    pros: '远距离贯穿一条线，出手快',
    cons: '间隔长，近身的怪来不及处理',
    extraNote: '额外弹数：每 +1 多一支偏 ±6° 的标枪'
  };
  RW.WEAPONS.cleaver = {
    name: '巨斧', kind: 'swing', color: '#ffb08a', cost: 20,
    dmg: 14, cd: [0.95, 0.85, 0.75], range: 92, arc: 1.2, knock: 260, tag: 'melee',
    pros: '朝最近的敌人挥出宽扇形一斧，击退很猛',
    cons: '只打身前，得贴着怪群走',
    extraNote: '额外弹数：每 +1 挥砍角度更宽'
  };
  RW.WEAPONS.pike = {
    name: '长枪', kind: 'lance', color: '#e0e8ff', cost: 20,
    dmg: 16, cd: [0.7, 0.62, 0.55], range: 135, charge: 0.1, width: 10, knock: 120, tag: 'melee',
    pros: '短距离直刺贯穿，出手几乎不用等',
    cons: '只有一条线，侧面的怪戳不到',
    extraNote: '额外弹数：每 +1 多刺一枪'
  };
  RW.WEAPONS.flail = {
    name: '流星锤', kind: 'blades', color: '#c8b8ff', cost: 22,
    dmg: 10, cd: [0.5, 0.46, 0.42], range: 78, spin: 3.2, knock: 220, count: 1, bladeR: 12, tag: 'melee',
    pros: '一颗大锤绕身转，伤害和击退都比剑环重',
    cons: '只有一颗，转一圈才打一次',
    extraNote: '额外弹数：每 +1 多一颗锤'
  };
  RW.WEAPON_ORDER = ['needle', 'repeater', 'scatter', 'javelin', 'blades', 'flail', 'cleaver', 'pike', 'lance', 'arc', 'mines'];
  RW.TIER_DMG = [1, 1.85, 3.1];
  RW.TIER_COST = [1, 1.45, 2.2];     // 买 I / 升 II / 升 III 的价格倍率
  RW.MAX_SLOTS = 6;

  // ---------- 英雄（开局选一个；多数需要解锁） ----------
  // fx：与改造同一套属性（见 RW.STATS），英雄特性也用属性表达，卡面文字自动生成。
  // near / focus：法师、弩手的专属机制。look：3D 与头像的造型（帽子 hat、手持 prop）。
  // unlock：{ kind: 'free' } 默认可用；'wave' 用任意（或指定 hero）英雄打到第 n 波；'kills' / 'coins' / 'built' 为累计击杀 / 金币 / 建造。
  RW.CLASSES = {
    mage: {
      name: '法师', tag: '贴脸爆发', color: '#ff9a3c', cape: '#ff8a2a', look: { hat: 'wizard', prop: 'staff' },
      weapon: 'arc', skill: 'nova', hp: 30, fx: { spell: 0.2, regen: 0.2 },   // 新手默认英雄：比别的脆皮多一点容错
      passive: '近焰：离敌人越近伤害越高，贴身 +40%',
      near: { r0: 60, r1: 200, bonus: 0.4 },
      pros: '起手连锁闪电 + 炎爆；站进怪堆里打最痛',
      cons: '血薄；逃跑时输出会跟着掉',
      unlock: { kind: 'free' }
    },
    ranger: {
      name: '弩手', tag: '站桩狙击', color: '#9dff7a', cape: '#3e8a3a', look: { hat: 'hood', prop: 'crossbow' },
      weapon: 'needle', skill: 'storm', hp: 38, fx: { ranged: 0.3, armor: 1 },   // 审计：通关率比其他英雄低一大截，加远程伤害、血量，凝神叠得更快
      passive: '凝神：站定射击叠层，每层暴击 +8%，满 5 层弩箭穿透',
      focus: { still: 40, per: 0.3, max: 5, crit: 0.08, decay: 1.2 },
      pros: '起手飞弩 + 追魂箭雨；站稳了暴击高、能穿透',
      cons: '一移动凝神就掉，被围住很难受',
      unlock: { kind: 'free' }
    },
    knight: {
      name: '盾骑士', tag: '反伤坦克', color: '#9fc4ff', cape: '#3f5f9e', look: { hat: 'helm', prop: 'sword' },
      weapon: 'blades', skill: 'bash', hp: 38, fx: { armor: 3, thorns: 6, speed: -0.08, rate: -0.1, melee: 0.15 },
      passive: '荆棘：挨打时反震身边的敌人',
      pros: '血厚甲硬，盾击把贴脸的怪掀开，适合守桥头',
      cons: '走得慢、攻速低，追不上逃跑的怪',
      unlock: { kind: 'wave', wave: 5, text: '任意英雄打到第 5 波' }
    },
    rogue: {
      name: '影刺客', tag: '暴击收割', color: '#d6a8ff', cape: '#3a2a55', look: { hat: 'bandana', prop: 'dagger' },
      weapon: 'needle', skill: 'shade', hp: 22, fx: { crit: 0.15, critMul: 1, speed: 0.12, dashCd: -0.3, armor: -1, melee: 0.1 },
      passive: '致命：暴击伤害 ×3（别人 ×2），冲刺冷却 -30%',
      pros: '暴击高、跑得快，影步往前扎进怪堆再穿出来',
      cons: '血最薄，还自带 -1 护甲，被摸两下就危险',
      unlock: { kind: 'wave', wave: 6, hero: 'ranger', text: '用弩手打到第 6 波' }
    },
    engineer: {
      name: '工匠', tag: '建筑流', color: '#ffd27a', cape: '#8a6440', look: { hat: 'goggles', prop: 'wrench' },
      weapon: 'mines', skill: 'well', hp: 28, fx: { buildCost: -0.3, towerDmg: 0.4, dmg: -0.12 },
      passive: '图纸：建筑便宜 30%，建筑伤害 +40%',
      pros: '满地是塔，塔替你打，自己专心走位捡钱',
      cons: '自己的伤害 -12%，塔被拆了就很脆弱',
      unlock: { kind: 'built', n: 25, text: '累计建造 25 座建筑' }
    },
    berserker: {
      name: '狂战士', tag: '残血暴走', color: '#ff6a4a', cape: '#8a2a1a', look: { hat: 'horn', prop: 'axe' },
      weapon: 'blades', skill: 'cleave', hp: 34, fx: { rage: 0.8, dmg: 0.1, dmgTaken: 0.15, melee: 0.2 },
      passive: '狂怒：生命越低伤害越高，残血时最多 +80%',
      pros: '血越少越猛，狂斩在残血时一刀一片',
      cons: '受到伤害 +15%，玩脱了就是一瞬间',
      unlock: { kind: 'kills', n: 1500, text: '累计击杀 1500 只敌人' }
    },
    priest: {
      name: '圣女', tag: '续航守护', color: '#fff1a8', cape: '#f4f0e0', look: { hat: 'halo', prop: 'book' },
      weapon: 'arc', skill: 'hymn', hp: 30, fx: { regen: 0.5, healOrb: 1.5, healCore: 4, dmg: -0.12 },
      passive: '祝福：回血火光多 2.5 倍，捡到时还给圣火回 4 点',
      pros: '圣愈同时拉自己和圣火，很难被磨死',
      cons: '伤害 -12%，杀得慢',
      unlock: { kind: 'wave', wave: 8, hero: 'mage', text: '用法师打到第 8 波' }
    },
    bomber: {
      name: '爆破手', tag: '范围轰炸', color: '#ff7a4a', cape: '#5a4630', look: { hat: 'cap', prop: 'bomb' },
      weapon: 'mines', skill: 'salvo', hp: 28, fx: { blastR: 0.35, knock: 0.3, range: -0.2 },
      passive: '火药：所有爆炸范围 +35%',
      pros: '连环爆在身前丢三颗延时雷，爆炸范围更大',
      cons: '射程 -20%，远程武器不好用',
      unlock: { kind: 'wave', wave: 10, text: '任意英雄打到第 10 波' }
    },
    merchant: {
      name: '商人', tag: '滚雪球', color: '#ffe066', cape: '#6a3a8a', look: { hat: 'tophat', prop: 'coin' },
      weapon: 'needle', skill: 'bounty', hp: 26, fx: { harvest: 0.1, interest: 0.05, shopPrice: -0.05, dmg: -0.22 },   // 审计：金币滚雪球太快，各难度通关率都最高
      passive: '生意经：每次整备按手上金币给 10% 利息，商店打九折',
      pros: '赏金让接下来的击杀掉双倍钱，中后期装备最好',
      cons: '伤害 -15%，前几波会比较难熬',
      unlock: { kind: 'coins', n: 3000, text: '累计获得 3000 金币' }
    },
    gambler: {
      name: '赌徒', tag: '看脸', color: '#7affd0', cape: '#1f5a4a', look: { hat: 'crown', prop: 'dice' },
      weapon: 'scatter', skill: 'wager', hp: 28, fx: { luck: 0.6, freeReroll: 1, crit: 0.05, dmgTaken: 0.1 },
      passive: '好运：高品质道具更常出现，每次整备免费刷新 1 次',
      pros: '豪赌每次随机：炸一片、回一截血，或者直接掉一堆金币',
      cons: '受到伤害 +10%',
      unlock: { kind: 'wave', wave: 12, text: '任意英雄打到第 12 波' }
    }
  };
  RW.CLASS_ORDER = ['mage', 'ranger', 'knight', 'rogue', 'engineer', 'berserker', 'priest', 'bomber', 'merchant', 'gambler'];

  // 解锁判定：prog = { unlocked: {id:1}, heroBest: {id: 波数}, kills, coins, built }
  RW.isUnlocked = function (id, prog) {
    var u = RW.CLASSES[id].unlock;
    return u.kind === 'free' || !!(prog && prog.unlocked && prog.unlocked[id]);
  };
  RW.unlockProgress = function (id, prog) {
    var u = RW.CLASSES[id].unlock, pr = prog || {};
    if (u.kind === 'free') return { have: 1, need: 1 };
    if (u.kind === 'wave') {
      var best = 0, hb = pr.heroBest || {};
      if (u.hero) best = hb[u.hero] || 0;
      else for (var k in hb) best = Math.max(best, hb[k]);
      return { have: best, need: u.wave };
    }
    return { have: pr[u.kind] || 0, need: u.n };
  };

  // ---------- 主动技能（1 个技能槽；冲刺人人都有） ----------
  RW.SKILLS = {
    nova: {
      name: '炎爆', color: '#ff9a3c', cost: 18, cd: 10, dmg: 22, radius: 150, knock: 340, tag: 'spell',
      pros: '以自己为中心炸开一圈烈焰，把贴身的怪全部掀飞',
      cons: '只管身边 150，远处的威胁它碰不到'
    },
    veil: {
      name: '雷暴', color: '#a8d4ff', cost: 24, cd: 14, dur: 3, rate: 7, dmg: 12, radius: 210, tag: 'spell',
      pros: '3 秒内从天而降的落雷，自动劈周围的敌人',
      cons: '冷却最长；随机落点，救不了被单只精英追的急'
    },
    well: {
      name: '黑洞法阵', color: '#c07bff', cost: 24, cd: 12, pull: 1.8, force: 300, radius: 170, dmg: 42, blast: 115, tag: 'spell',
      pros: '把一大片怪吸成一团再内爆，配雷光矛、符文陷阱最香',
      cons: '要吸 1.8 秒才炸；精英几乎吸不动'
    },
    storm: {
      name: '追魂箭雨', color: '#ffd166', cost: 22, cd: 12, missiles: 16, dmg: 8, speed: 340, turn: 7, life: 2.4, tag: 'ranged',
      pros: '一次射出 16 支追魂箭，自己找目标，适合清散兵',
      cons: '单发伤害低，打护甲怪会被削得很厉害'
    },
    bash: {
      name: '盾击', color: '#9fc4ff', cost: 16, cd: 8, dmg: 14, len: 120, arc: 0.9, knock: 420, tag: 'melee',
      pros: '身前扇形掀飞，给贴脸的怪让出一条路',
      cons: '打不远，身后的怪碰不到'
    },
    shade: {
      name: '影步', color: '#d6a8ff', cost: 16, cd: 7, dmg: 18, len: 150, step: 96, knock: 80, tag: 'melee',
      pros: '向前穿一段，路径上的怪吃一刀',
      cons: '直线很窄，走位歪了就空'
    },
    cleave: {
      name: '狂斩', color: '#ff6a4a', cost: 18, cd: 8, dmg: 24, len: 130, arc: 1.3, knock: 200, tag: 'melee',
      pros: '身前宽斩。残血时吃狂怒，一刀比炎爆更痛',
      cons: '要贴着砍，站远处没有用'
    },
    hymn: {
      name: '圣愈', color: '#fff1a8', cost: 16, cd: 12, heal: 0.32, core: 22,
      pros: '立刻回复自己一截血，并给圣火回一截',
      cons: '不造成伤害，怪还在就得接着躲'
    },
    salvo: {
      name: '连环爆', color: '#ff7a4a', cost: 20, cd: 11, dmg: 16, radius: 78, step: 55, knock: 180, tag: 'spell',
      pros: '身前依次炸开三团火，吃爆炸范围加成',
      cons: '有延迟，怪走开了就炸空地'
    },
    bounty: {
      name: '赏金', color: '#ffe066', cost: 16, cd: 14, dur: 7,
      pros: '几秒内每次击杀多掉一枚金币',
      cons: '自己不打出伤害，要靠你接着杀'
    },
    wager: {
      name: '豪赌', color: '#7affd0', cost: 16, cd: 9, dmg: 22, radius: 130, heal: 0.4, coins: 8, tag: 'spell',
      pros: '随机变成爆炸、治疗或一笔金币',
      cons: '可能在你最需要伤害时变成回血'
    },
    fan: {
      name: '扇火', color: '#ffb15a', cost: 14, cd: 4.5, dmg: 6, pellets: 7, spread: 0.9, speed: 480, range: 220, knock: 40, tag: 'ranged', mp: 16,
      pros: '身前扇出一团火，专门清正面的杂兵',
      cons: '单发不高，侧面来的怪打不到'
    },
    ring: {
      name: '冲击环', color: '#9fe8ff', cost: 14, cd: 3.6, dmg: 8, len: 130, knock: 260, tag: 'spell', mp: 14,
      pros: '身边一圈推开，走位清怪最顺手',
      cons: '打不远'
    },
    lash: {
      name: '横扫', color: '#ffd1a8', cost: 14, cd: 3.2, dmg: 11, len: 150, arc: 1.5, knock: 160, tag: 'melee', mp: 16,
      pros: '宽扇形连砍，贴着怪群按就有伤害',
      cons: '要贴身'
    }
  };
  RW.SKILL_ORDER = ['nova', 'veil', 'well', 'storm'];
  RW.SKILL_TIER = [1, 1.7, 2.6];
  RW.LOADOUT = {
    mage: ['nova', 'ring', 'fan'],
    ranger: ['storm', 'fan', 'ring'],
    knight: ['bash', 'lash', 'ring'],
    rogue: ['shade', 'lash', 'fan'],
    engineer: ['well', 'ring', 'fan'],
    berserker: ['cleave', 'lash', 'nova'],
    priest: ['hymn', 'ring', 'nova'],
    bomber: ['salvo', 'nova', 'ring'],
    merchant: ['bounty', 'fan', 'ring'],
    gambler: ['wager', 'nova', 'fan']
  };
  // 圣火等级：10 级，越往后越贵、越变态（玩家反馈：圣火不要轻易满级，每级都要有新增益）
  // hp / dmg / range / cd / heal 是每级在上一级基础上再加的量；aura 是「圣域」半径（像素，绝对值）；
  // perk 是这一级新解锁的能力（效果数值见 RW.SANCTUARY）；note 写在升级按钮上，desc 写在说明里
  RW.CORE_LV = [
    null,
    { aura: 200, note: '基础', desc: '圣火照亮身边一圈：这就是圣域' },
    { cost: 22, hp: 50, dmg: 2, range: 30, cd: 0.05, heal: 0.05, aura: 260, perk: 'yield', note: '圣域收成', desc: '圣域里的田舍安心生产：每波结束按圣域覆盖的土地和房屋发金币' },
    { cost: 36, hp: 70, dmg: 2, range: 30, cd: 0.05, heal: 0.05, aura: 320, perk: 'form', note: '选形态', desc: '圣火选定形态：烈焰 / 守护 / 星火，6 级、9 级再各进阶一次' },
    { cost: 56, hp: 90, dmg: 3, range: 40, cd: 0.04, heal: 0.05, aura: 390, perk: 'hallow', note: '圣域减速', desc: '敌人踏进圣域就被拖慢；圣域里的建筑和同伴每秒回血' },
    { cost: 84, hp: 120, dmg: 4, range: 40, cd: 0.04, heal: 0.05, aura: 470, perk: 'bless', note: '圣域加护', desc: '英雄在圣域里每秒回血，同伴和建筑伤害提高' },
    { cost: 150, hp: 150, dmg: 5, range: 50, cd: 0.03, heal: 0.05, aura: 560, perk: 'form2', note: '形态二阶', desc: '圣火形态进阶：伤害、范围、次数全面变强' },
    { cost: 215, hp: 190, dmg: 6, range: 60, cd: 0.03, heal: 0.05, aura: 660, perk: 'twin', note: '双生火舌', desc: '火舌每次多射一发，各打不同的敌人' },
    { cost: 295, hp: 240, dmg: 7, range: 80, cd: 0.02, heal: 0.05, aura: 780, perk: 'rain', note: '流星火雨', desc: '每隔一会儿从天上砸下流星，落在射程内的敌群里' },
    { cost: 390, hp: 300, dmg: 9, range: 100, cd: 0.02, heal: 0.05, aura: 920, perk: 'form3', note: '形态三阶', desc: '圣火形态终极进阶；圣域里的敌人持续灼烧、受到的伤害提高' },
    { cost: 520, hp: 400, dmg: 12, range: 0, cd: 0.03, heal: 0.1, aura: 4000, perk: 'sky', note: '天火', desc: '圣域照遍全图：火舌与流星打得到地图上任何地方，收成翻倍' }
  ];
  RW.CORE_MAX_LV = RW.CORE_LV.length - 1;
  // 圣火熄灭后的重燃：每局 times 次，从 fromWave 波起可用；重燃后圣火至少回到 core 比例，身边 clear 像素内的小怪清掉
  RW.REKINDLE = { times: 3, fromWave: 1, core: 0.5, clear: 170 };
  // 圣域：圣火照亮的范围。镜头、视野、收成、各级能力都跟着它走
  RW.SANCTUARY = {
    formTierAt: [0, 3, 6, 9],       // 几级进到形态 I / II / III
    yield: { perCell: 0.015, perHouse: 0.25, skyMul: 2 },   // 每波收成 = 覆盖的可走地块 × perCell + 覆盖的房屋格 × perHouse
    hallow: { slow: 0.18, tend: 2 },                       // 圣域内敌人减速 18%；建筑与同伴每秒回 2
    bless: { regen: 0.015, allyDmg: 0.2 },                 // 英雄每秒回 1.5% 最大生命；同伴与建筑伤害 +20%
    twin: { shots: 1 },
    rain: { cd: 2.2, dmgMul: 3, blast: 70, skyCd: 1.2 },   // 流星：伤害 = 火舌伤害 × dmgMul；天火时更频繁
    judge: { burn: 0.6, taken: 0.2 },                      // 9 级：灼烧每秒 = 火舌伤害 × burn；受到伤害 +20%
    skyRange: 99999,
    dim: 0.32
  };
  // C1「光即是色」。冷暖只调这一处，着色器在 js/gl3d.js。不改玩法、镜头、视野。
  // 圣火是主光：饱和的橙金，按距离做指数衰减，没有光锥硬边。高光往橙金收，不漂成白。
  // 圈外比上一档暗一截，仍是能看清村屋的蓝灰。cool 的红低于绿、蓝最高。
  // band：固有色从「圈内更深的绿褐、饱和」收到「圈外低饱和冷蓝」。inner/outer 是圣域半径的倍数，smoothstep，很宽。
  // greenKill：圈内把过亮的绿草收到褐绿。fog 在圈外才加浓，近火是暖雾，远处是淡蓝灰。
  // enemy：圈外的敌人立牌再压暗、去饱和。bloom 阈值抬高，绿萤火不过阈值。
  // veil：旧的圣域黑盘，关掉。ring：圣域金圈的透明度，只留一条很淡的软边。
  RW.C1_LIGHT = {
    // gain 仍是 [1.63, 2.40]。颜色从浅黄收回到橙金，避免广场漂成米色。
    flame: { color: [1.0, 0.62, 0.22], fall: 1.35, gain: [1.63, 2.4] },
    band: { inner: 0.2, outer: 1.7 },
    // 圈外大约比上一档暗 35%。目标：白天远处 (40,52,86)，夜晚 (24,32,62)。
    albedo: { inSat: 1.25, outSat: 0.14, inGain: 0.96, outGain: [0.72, 0.62], greenKill: [0.7, 0.18] },
    cool: [0.42, 0.56, 0.88],
    fog: { warm: [1.0, 0.62, 0.22], start: 0.95, thick: 1.5, amount: [0.30, 0.34] },
    grade: { shadow: 0.36, high: 0.24, shad: [0.18, 0.26, 0.46], highCol: [1.0, 0.64, 0.24] },
    enemy: { gain: 0.66 },
    bloom: { thr: 0.92, radius: 0.5, add: 0.06 },
    exposure: 1.02,
    veil: 0,
    ring: 0.06
  };
  RW.SANCTUARY.dim = RW.C1_LIGHT.veil;
  // 圣火每升一级，王旗自动往外插一站（各地图的王旗位置写在 js/map.js 的 fronts 里，切图时换成当前图的）。
  RW.FRONTS = [null];

  // 圣火形态：升到 3 级时三选一，玩法和外形都不同（玩家反馈：圣火不能只有一种形态）
  // 英雄倒下后复活：圣火还亮着就不算输（玩家反馈：只要圣火没灭英雄就能倒计时复活）
  // 复活时间 = base + perWave × (波数 − 1)，最多 max 秒；复活后回 hp 比例的生命并无敌 inv 秒
  // 代价：倒下时圣火扣掉 coreCost × 最大生命（最多扣到剩 1 点，倒下本身不会让圣火熄灭）
  RW.RESPAWN = { base: 5, perWave: 0.35, max: 12, hp: 0.6, inv: 2.5, coreCost: 0.2 };

  RW.CORE_FORM_AT = 3;
  RW.CORE_FORMS = {
    blaze: { name: '烈焰圣火', color: '#ff7a2e', note: '火舌伤害 ×1.6，命中处小范围爆燃', dmgMul: 1.6, blast: 46, blastK: 0.5,
      tiers: [null, { dmgMul: 2.1, blast: 62, blastK: 0.6, note: '伤害 ×2.1，爆燃更大' }, { dmgMul: 2.8, blast: 84, blastK: 0.75, note: '伤害 ×2.8，爆燃覆盖一片' }] },
    ward:  { name: '守护圣火', color: '#8fe8ff', note: '每 1.5 秒一圈守护波：减速敌人，修复身边建筑与同伴，圣火每秒回 2', pulse: 1.5, slow: 0.4, slowT: 1.2, regen: 2, heal: 6, reach: 60,
      tiers: [null, { pulse: 1.2, slow: 0.5, regen: 4, heal: 10, reach: 110, note: '守护波更快更远，回复翻倍' }, { pulse: 1.0, slow: 0.6, regen: 7, heal: 16, reach: 180, note: '守护波每秒一次，覆盖大片圣域' }] },
    star:  { name: '星火圣火', color: '#d9a8ff', note: '一次射出 3 道星火，各打不同目标，射程 +40', shots: 3, range: 40, dmgMul: 0.75,
      tiers: [null, { shots: 5, range: 70, dmgMul: 0.85, note: '一次 5 道星火，射程再远' }, { shots: 8, range: 110, dmgMul: 0.95, note: '一次 8 道星火，满屏追敌' }] }
  };
  RW.CORE_FORM_ORDER = ['blaze', 'ward', 'star'];

  // 野外祭坛（地图上的 A 格）：站进圈里撑满进度就占领，每波每座一次。逼玩家离开圣火去开阔地
  RW.SHRINE = {
    r: 64, hold: 2.5,
    rewards: [
      { id: 'gold', name: '金币', w: 3 },         // 金币 = 10 + 波数 × 3
      { id: 'heal', name: '圣火回血', w: 2, k: 0.25 },
      { id: 'fury', name: '战意爆发', w: 2, dmg: 0.25, t: 20 },   // 伤害 +25%，持续 20 秒
      { id: 'chest', name: '金箱', w: 1 }
    ]
  };

  // 怪物的受击 / 死亡音色（玩家反馈：打击声要随怪物变化）。pitch 音高倍率，body 低频分量，
  // tone：'flesh' 肉 / 'shell' 甲壳金属 / 'goo' 黏液 / 'bone' 骨头 / 'spirit' 灵体
  RW.ENEMY_SFX = {
    mite: { pitch: 1.3, body: 0.4, tone: 'flesh' }, spore: { pitch: 1.6, body: 0.25, tone: 'spirit' },
    shell: { pitch: 0.7, body: 0.8, tone: 'shell' }, dasher: { pitch: 1.05, body: 0.55, tone: 'flesh' },
    splitter: { pitch: 0.9, body: 0.5, tone: 'goo' }, bomber: { pitch: 1.15, body: 0.5, tone: 'flesh' },
    spitter: { pitch: 1.1, body: 0.4, tone: 'goo' }, shielder: { pitch: 0.85, body: 0.6, tone: 'bone' },
    warden: { pitch: 0.75, body: 0.8, tone: 'spirit' }, brood: { pitch: 0.65, body: 0.9, tone: 'goo' },
    boss: { pitch: 0.55, body: 1, tone: 'shell' }, tyrant: { pitch: 0.5, body: 1, tone: 'spirit' }
  };

  // ---------- 建筑（战斗中随时在脚下建造；整备时买「科技」统一升级） ----------
  RW.TOWERS = {
    sentry: {
      name: '箭塔', kind: 'sentry', color: '#ffd27a', cost: 14, techCost: 18, hp: 30, r: 12,
      dmg: 5, cd: 0.5, range: 160, speed: 440, knock: 40,
      pros: '自动打射程内最近的敌人，把它建在你常跑的路线上',
      cons: '不会动；铁甲兽、炸药地精会专门去拆它'
    },
    pylon: {
      name: '寒霜塔', kind: 'pylon', color: '#8fe3ff', cost: 16, techCost: 18, hp: 40, r: 12,
      dmg: 3, cd: 1.6, range: 90, slow: 0.45, slowTime: 1.2, knock: 20,
      pros: '周期释放寒气：范围内敌人减速 45%，顺带少量伤害',
      cons: '几乎没有输出，只有把怪拖进范围才值'
    },
    siphon: {
      name: '聚金桩', kind: 'siphon', color: '#ffe066', cost: 10, techCost: 14, hp: 24, r: 11,
      range: 110, pull: 300, bonus: [0, 0.1, 0.2],
      pros: '范围内的金币自动吸走入账、不会过期',
      cons: '没有战斗力，血薄，是铁甲兽最爱拆的目标'
    },
    barracks: {
      name: '兵营', kind: 'barracks', color: '#ff8f6b', cost: 22, techCost: 24, hp: 50, r: 15,
      soldiers: [2, 3, 4], spawnCd: 5, leash: 190,
      pros: '自动出兵，可以换兵种、换阵型，按 G 把它的兵派到你脚下布防',
      cons: '贵；士兵会被小怪围死，兵营离你远了就帮不上'
    }
  };
  RW.TOWER_ORDER = ['sentry', 'pylon', 'siphon', 'barracks'];
  // 兵营的兵种与阵型（玩家反馈：兵营要能排兵布阵分兵种，指挥兵种在哪守卫）
  // 每座兵营选一个兵种；hp / dmg 再乘兵营科技的档位。armor 是受伤减免，reach 是近战多够出去的距离，
  // range 大于 0 的是远程（放箭），eliteMul 打精英和 Boss 的伤害倍率，taunt 越大越招怪
  RW.TROOPS = {
    guard:  { name: '盾卫', color: '#8fb8ff', hp: 26, dmg: 3, speed: 104, r: 7, atkCd: 0.6, armor: 0.3, taunt: 2, note: '血厚、受伤 -30%，最招怪：把怪拖在原地' },
    spear:  { name: '枪兵', color: '#ff8f6b', hp: 14, dmg: 4.5, speed: 118, r: 6, atkCd: 0.55, reach: 14, eliteMul: 1.6, note: '出手远一点，打精英和 Boss 伤害 ×1.6' },
    archer: { name: '弓手', color: '#9be27a', hp: 9, dmg: 4, speed: 112, r: 6, atkCd: 0.75, range: 160, arrow: 440, note: '站在后排放箭，射程 160，怕被近身' }
  };
  RW.TROOP_ORDER = ['spear', 'guard', 'archer'];
  // 阵型：leash 是追击半径倍率（以布防点为圆心），taken 受伤倍率，speed 移速倍率
  RW.FORMATIONS = {
    ring:  { name: '圆阵', leash: 0.8, taken: 0.85, note: '围着布防点站一圈，追得近，受伤 -15%' },
    line:  { name: '横阵', leash: 1, note: '面朝敌人来路排成一排，拦得最宽；弓手站第二排' },
    loose: { name: '散阵', leash: 1.6, speed: 1.15, note: '散开追击：追得远、跑得快' }
  };
  RW.FORMATION_ORDER = ['line', 'ring', 'loose'];
  RW.MATES = {
    spark: { name: '火童', color: '#ff8a3c', hp: 16, dmg: 5, cd: 0.45, speed: 150, r: 7 },
    bolt: { name: '弩童', color: '#9dff7a', hp: 12, dmg: 7, cd: 0.7, speed: 140, r: 6 },
    ward: { name: '盾童', color: '#9fc4ff', hp: 28, dmg: 4, cd: 0.55, speed: 120, r: 8 }
  };
  RW.MATE_ORDER = ['spark', 'bolt', 'ward'];
  RW.TOWER_TIER = { dmg: [1, 1.7, 2.6], hp: [1, 1.5, 2.2], range: [1, 1.12, 1.25] };
  RW.TECH_COST = [0, 1, 1.7];         // 科技 II / III 的价格倍率（乘 techCost）

  // ---------- 敌人表（10）：轮廓、速度、行为都要一眼能分开 ----------
  RW.ENEMIES = {
    mite: {
      name: '小鬼', hp: 6, speed: 70, dmg: 2, r: 8, armor: 0, knockRes: 1, shards: 1, shardVal: 1, mass: 1,
      color: '#b04cff', shape: 'imp', cluster: 4, soldierAggro: 60, coreBias: 0.2
    },
    spore: {
      name: '蝙蝠', fly: true, hp: 3, speed: 90, dmg: 1.5, r: 6, armor: 0, knockRes: 1.2, shards: 0, shardVal: 0, mass: 1,
      color: '#8a5cff', shape: 'bat', cluster: 1, soldierAggro: 60
    },
    shell: {
      name: '铁甲兽', hp: 28, speed: 32, dmg: 3, r: 14, armor: 3, armorGrow: 0.35, knockRes: 0.45, shards: 2, shardVal: 1, mass: 3,
      color: '#9aa4b8', shape: 'brute', cluster: 1, towerAggro: 260, chewCd: 0.8, coreBias: 0.8
    },
    dasher: {
      name: '狼骑', hp: 11, speed: 50, dmg: 4, r: 10, armor: 0, knockRes: 0.8, shards: 2, shardVal: 1, mass: 2,
      color: '#c08a5a', shape: 'wolf', cluster: 1,
      aim: 0.6, dash: 0.34, dashSpeed: 420, dashRange: 210, recover: 0.6, cdMin: 2.0, cdMax: 3.0
    },
    splitter: {
      name: '蝠囊怪', hp: 16, speed: 44, dmg: 3, r: 12, armor: 0, knockRes: 0.7, shards: 2, shardVal: 1, mass: 3,
      color: '#d05cff', shape: 'sack', cluster: 1, splits: 3, soldierAggro: 60, coreBias: 0.3
    },
    bomber: {
      name: '炸药地精', hp: 8, speed: 78, dmg: 8, r: 10, armor: 0, knockRes: 0.9, shards: 2, shardVal: 1, mass: 2,
      color: '#6fbf3a', shape: 'goblin', cluster: 1, fuse: 0.7, trigger: 44, blast: 64, soldierAggro: 90, towerAggro: 200, coreBias: 0.5
    },
    spitter: {
      name: '暗弓手', hp: 12, speed: 58, dmg: 4, r: 9, armor: 0, knockRes: 0.9, shards: 2, shardVal: 1, mass: 2,
      color: '#5a6a86', shape: 'archer', cluster: 1, keep: 210, aim: 0.55, fireCdMin: 2.2, fireCdMax: 3.2, boltSpeed: 280
    },
    shielder: {
      name: '护盾萨满', hp: 14, speed: 42, dmg: 2, r: 11, armor: 0, knockRes: 0.8, shards: 3, shardVal: 1, mass: 3,
      color: '#4f8cff', shape: 'shaman', cluster: 1, keep: 170, link: 120, links: 4, reduce: 0.5
    },
    warden: {
      name: '暗影术士', elite: true, hp: 180, speed: 26, dmg: 5, r: 22, armor: 2, armorGrow: 0.2, knockRes: 0.12, shards: 8, shardVal: 2, mass: 8,
      color: '#ff3b8c', shape: 'warlock', cluster: 1,
      fireCd: 3.2, charge: 0.7, bullets: 10, bulletsLate: 14, lateWave: 8, bulletSpeed: 105, bulletDmg: 3
    },
    brood: {
      name: '蝠母', elite: true, hp: 240, speed: 20, dmg: 5, r: 26, armor: 2, armorGrow: 0.2, knockRes: 0.08, shards: 10, shardVal: 2, mass: 10,
      color: '#9b4dff', shape: 'broodmother', cluster: 1, spawnCd: 4.5, spawnN: 3, coreBias: 1
    }
  };
  // ---------- Boss：第 5 / 10 / 15… 波出场 ----------
  RW.ENEMIES.boss = {
    name: '崩山巨像', elite: true, boss: true, hp: 520, speed: 32, dmg: 7, r: 38, armor: 3, armorGrow: 0.15, knockRes: 0.02, shards: 20, shardVal: 2, mass: 30,
    color: '#ff6a2e', shape: 'golem', cluster: 1,
    rest: [2.2, 1.4],                          // 两次大招之间的间隔（一阶段 / 二阶段）
    slam: { tele: [1.15, 0.9], r: 95, mul: 1.4 },
    barrage: { dur: 2.2, every: 0.12, arms: 3, speed: 150, turn: 0.35, dmg: 3 },
    charge: { aim: 0.9, time: 0.85, speed: 520, mul: 1.5 },
    phase2: 0.5, summonCd: 8, summon: ['dasher', 'spore', 'spore', 'bomber']
  };
  // 终局决战（审计：到点后只剩 Boss 时，弱构筑要打几分钟到几十分钟）：
  //   finalAdds / finalAddsCap：到点后 Boss 还活着就继续刷小怪，但场上最多 finalAddsCap 只，不会越刷越多
  //   到点后灭火者直扑圣火，决战打在圣域里（火舌、流星、建筑、士兵都能帮忙）
  //   再过 showdown 秒灭火者力竭：受到的伤害每秒 +exhaustRate，最多 +exhaustMax（保证决战会结束）
  RW.BOSS_WAVES = { every: 5, at: 0.2, rateCut: 0.35, finalAdds: 1, finalAddsCap: 36, showdown: 30, exhaustRate: 0.1, exhaustMax: 5, coreStop: 170 };
  // 终局 Boss：沿用巨像的招式（type 仍是 boss），数值更高、更大、召唤更多
  (function () {
    var b = RW.ENEMIES.boss, t = {};
    for (var k in b) t[k] = b[k];
    t.name = '灭火者'; t.hp = Math.round(b.hp * 2.4); t.r = 48; t.dmg = 9; t.color = '#7a3cff';
    t.rest = [1.8, 1.1]; t.phase2 = 0.6; t.summonCd = 6;
    t.summon = ['dasher', 'spore', 'spore', 'bomber', 'shell', 'spitter'];
    t.shards = 60;
    RW.ENEMIES.tyrant = t;
  })();

  // 全表只跟这一张走：血、怪伤、物价、开局金币、收成。改这里，战斗和商店一起变。
  RW.SHEET = {
    // 血量 1 + 0.18k + 0.06k²：第 10 波 7.5 倍、第 20 波 26 倍（白皮书 6.1）
    hpA: 0.18, hpB: 0.06, hpC9: 0.02, dmgC: 0.05, spdC: 0.012, spdCap: 0.22, priceC: 0.06,
    startGold: 14, harvestBase: 6, harvestPer: 30
  };
  RW.SHEET.hp = function (w) {
    var k = w - 1, s = RW.SHEET;
    return 1 + s.hpA * k + s.hpB * k * k + (w > 8 ? s.hpC9 * (w - 8) * (w - 8) : 0);
  };
  RW.SHEET.dmg = function (w) { return 1 + RW.SHEET.dmgC * (w - 1); };
  // 防御成长：圣火火舌、建筑、士兵的伤害跟着怪物血量曲线走一部分（科技只有三阶，不成长的话中后期形同虚设）
  RW.SHEET.defC = 0.3;
  RW.SHEET.def = function (w) { return 1 + RW.SHEET.defC * (RW.SHEET.hp(w) - 1); };
  RW.SHEET.price = function (w) { return 1 + RW.SHEET.priceC * Math.max(0, w - 1); };
  RW.GROWTH = RW.SHEET;
  RW.TUNE.priceGrowth = RW.SHEET.priceC;
  RW.TUNE.harvestBase = RW.SHEET.harvestBase;
  RW.TUNE.harvestPer = RW.SHEET.harvestPer;

  // ---------- 波次表 ----------
  // dur 秒；r0→r1 每秒刷怪数；mix 权重；elites = [出现时间占波长比例, 精英种类]
  RW.WAVES = [
    null,
    { dur: 20, r0: 1.8, r1: 2.6, mix: { mite: 1 }, elites: [] },
    { dur: 22, r0: 2.0, r1: 2.8, mix: { mite: 0.8, dasher: 0.1, splitter: 0.1 }, elites: [] },
    { dur: 25, r0: 2.2, r1: 3.0, mix: { mite: 0.6, shell: 0.12, dasher: 0.14, splitter: 0.14 }, elites: [] },
    { dur: 28, r0: 2.3, r1: 3.2, mix: { mite: 0.5, shell: 0.15, dasher: 0.15, splitter: 0.1, bomber: 0.1 }, elites: [[0.45, 'warden']] },
    { dur: 30, r0: 2.4, r1: 3.4, mix: { mite: 0.45, shell: 0.15, dasher: 0.12, splitter: 0.1, bomber: 0.08, spitter: 0.1 }, elites: [[0.4, 'warden']] },
    { dur: 32, r0: 2.5, r1: 3.6, mix: { mite: 0.4, shell: 0.15, dasher: 0.12, splitter: 0.1, bomber: 0.08, spitter: 0.09, shielder: 0.06 }, elites: [[0.35, 'brood']] },
    { dur: 34, r0: 2.7, r1: 3.8, mix: { mite: 0.4, shell: 0.15, dasher: 0.12, splitter: 0.1, bomber: 0.08, spitter: 0.09, shielder: 0.06 }, elites: [[0.25, 'warden'], [0.65, 'brood']] },
    { dur: 36, r0: 2.9, r1: 4.1, mix: { mite: 0.36, shell: 0.17, dasher: 0.12, splitter: 0.1, bomber: 0.09, spitter: 0.1, shielder: 0.06 }, elites: [[0.25, 'brood'], [0.6, 'warden']] },
    { dur: 38, r0: 3.2, r1: 4.6, mix: { mite: 0.34, shell: 0.17, dasher: 0.13, splitter: 0.1, bomber: 0.1, spitter: 0.1, shielder: 0.06 }, elites: [[0.2, 'warden'], [0.5, 'brood'], [0.75, 'warden']] },
    { dur: 40, r0: 3.5, r1: 5.0, mix: { mite: 0.32, shell: 0.17, dasher: 0.13, splitter: 0.1, bomber: 0.1, spitter: 0.11, shielder: 0.07 }, elites: [[0.15, 'warden'], [0.4, 'brood'], [0.6, 'warden'], [0.8, 'brood']] }
  ];
  RW.waveDef = function (w) {
    if (w < RW.WAVES.length) return RW.WAVES[w];
    // 第 11–20 波：时长涨到 60 秒，刷怪更密，精英逐波增加；21 波起为无尽，沿用第 20 波节奏
    var k = Math.min(w, 20) - 10, el = [];
    var n = 3 + Math.floor(k / 2);
    for (var i = 0; i < n; i++) el.push([0.1 + 0.8 * i / Math.max(1, n - 1), i % 2 ? 'brood' : 'warden']);
    return { dur: Math.min(60, 40 + 2 * k), r0: 3.5 + 0.22 * k, r1: 5.0 + 0.3 * k, mix: RW.WAVES[10].mix, elites: el };
  };

  // ---------- 改造 / 道具表 ----------
  // fx 里的值：pct 类是比例（0.3 = +30%），flat 类是绝对值。卡面「强/弱」由 fx 自动生成，数据和文字永远一致。
  RW.STATS = {
    dmg: { label: '伤害', pct: true },
    melee: { label: '近战伤害', pct: true },
    ranged: { label: '远程伤害', pct: true },
    spell: { label: '法术伤害', pct: true },
    rate: { label: '攻速', pct: true },
    speed: { label: '移速', pct: true },
    range: { label: '射程', pct: true },
    crit: { label: '暴击率', pct: true },
    maxHp: { label: '最大生命', pct: false },
    armor: { label: '护甲', pct: false },
    regen: { label: '每秒回血', pct: false },
    pickup: { label: '拾取半径', pct: true },
    harvest: { label: '收成', pct: true },
    knock: { label: '击退', pct: true },
    extra: { label: '额外弹数', pct: false },
    cdr: { label: '技能冷却', pct: true, inverse: true },
    dmgTaken: { label: '受到伤害', pct: true, inverse: true },
    bounty: { label: '精英悬赏', pct: false, special: true },
    lifesteal: { label: '吸血几率', pct: true },
    dodge: { label: '闪避', pct: true },
    critMul: { label: '暴击伤害', pct: true },
    luck: { label: '幸运', pct: true },
    towerDmg: { label: '建筑伤害', pct: true },
    blastR: { label: '爆炸范围', pct: true },
    thorns: { label: '反伤', pct: false },
    interest: { label: '整备利息', pct: true },
    healOrb: { label: '回血火光', pct: true },
    healCore: { label: '火光修圣火', pct: false },
    coreRegen: { label: '圣火每秒回复', pct: false },
    buildCost: { label: '建造价格', pct: true, inverse: true },
    rage: { label: '残血增伤', pct: true },
    shopPrice: { label: '商店价格', pct: true, inverse: true },
    freeReroll: { label: '免费刷新', pct: false },
    dashCd: { label: '冲刺冷却', pct: true, inverse: true },
    mpRegen: { label: '法力回复', pct: true }
  };
  // 道具品质：r = 0 普通 / 1 精良 / 2 稀有 / 3 传说。越往后的波次、幸运越高，高品质越常见。
  RW.RARITY = [
    { name: '普通', color: '#b8b0a0' },
    { name: '精良', color: '#5ab0ff' },
    { name: '稀有', color: '#c07bff' },
    { name: '传说', color: '#ffb13b' }
  ];
  // 返回各品质的权重（第 w 波、幸运 luck）
  RW.rarityWeights = function (w, luck) {
    var L = 1 + Math.max(0, luck || 0);
    return [100, Math.max(0, (w - 1) * 7) * L, Math.max(0, (w - 3) * 3.5) * L, Math.max(0, (w - 6) * 1.4) * L];
  };
  RW.MODS = {
    // ---- 普通 ----
    fins:    { name: '轻灵手套', r: 0, cost: 18, max: 3, fx: { rate: 0.22, dmg: -0.08 } },
    lens:    { name: '鹰眼', r: 0, cost: 16, max: 3, fx: { range: 0.30, rate: -0.10 }, note: '剑环半径、陷阱范围也吃射程' },
    hull:    { name: '疾风靴', r: 0, cost: 16, max: 3, fx: { speed: 0.16, armor: -1 } },
    nano:    { name: '再生护符', r: 0, cost: 20, max: 3, fx: { regen: 0.4, dmg: -0.06 } },
    magnet:  { name: '磁石', r: 0, cost: 14, max: 2, fx: { pickup: 0.7, rate: -0.05 } },
    whet:    { name: '磨刀石', r: 0, cost: 10, max: 6, fx: { dmg: 0.1 } },
    gauntlet: { name: '铁护手', r: 0, cost: 12, max: 4, fx: { melee: 0.25, ranged: -0.1 } },
    quiver:  { name: '箭袋', r: 0, cost: 12, max: 4, fx: { ranged: 0.25, melee: -0.1 } },
    tome:    { name: '残页', r: 0, cost: 12, max: 4, fx: { spell: 0.25, speed: -0.06 } },
    bracer:  { name: '皮护腕', r: 0, cost: 10, max: 6, fx: { armor: 1 } },
    apple:   { name: '红苹果', r: 0, cost: 8, max: 6, fx: { maxHp: 4 } },
    feather: { name: '羽毛', r: 0, cost: 8, max: 4, fx: { speed: 0.08, pickup: 0.15 } },
    purse:   { name: '小钱袋', r: 0, cost: 12, max: 4, fx: { harvest: 0.25 } },
    herb:    { name: '草药', r: 0, cost: 10, max: 4, fx: { regen: 0.3 } },
    // ---- 精良 ----
    coil:    { name: '狂暴药剂', r: 1, cost: 20, max: 3, fx: { dmg: 0.30, maxHp: -4 } },
    sight:   { name: '致命之眼', r: 1, cost: 18, max: 3, fx: { crit: 0.15, maxHp: -3 }, note: '暴击默认 ×2 伤害' },
    plate:   { name: '重甲', r: 1, cost: 18, max: 4, fx: { armor: 3, speed: -0.1 }, note: '减伤 = 护甲 / (护甲+12)，最高 75%' },
    greed:   { name: '贪婪之戒', r: 1, cost: 18, max: 3, fx: { harvest: 0.5, dmgTaken: 0.12 } },
    overclock: { name: '时之沙', r: 1, cost: 18, max: 2, fx: { cdr: -0.25, rate: -0.1 }, note: '冲刺和技能都算' },
    bounty:  { name: '悬赏令', r: 1, cost: 18, max: 1, fx: { bounty: 1 }, note: '强：精英掉落金币 ×2　弱：第3波起每波多来 1 只精英' },
    fang:    { name: '吸血獠牙', r: 1, cost: 20, max: 3, fx: { lifesteal: 0.06, maxHp: -2 }, note: '武器和技能命中时按几率回 1 血，每秒最多 8 次' },
    cloak:   { name: '幻影斗篷', r: 1, cost: 20, max: 3, fx: { dodge: 0.08, armor: -1 }, note: '闪避上限 60%' },
    maul:    { name: '重锤头', r: 1, cost: 18, max: 3, fx: { knock: 0.4, dmg: 0.08, rate: -0.08 } },
    blueprint: { name: '建筑图纸', r: 1, cost: 18, max: 3, fx: { towerDmg: 0.25, dmg: -0.05 } },
    powder:  { name: '火药桶', r: 1, cost: 18, max: 3, fx: { blastR: 0.2, dmgTaken: 0.08 }, note: '符文陷阱、炎爆、黑洞内爆都算' },
    thornmail: { name: '荆棘甲', r: 1, cost: 20, max: 3, fx: { thorns: 5, speed: -0.05 }, note: '挨打时对身边 70 内的敌人造成伤害' },
    piggy:   { name: '存钱罐', r: 1, cost: 16, max: 2, fx: { interest: 0.05, harvest: -0.08 }, note: '每次整备按手上金币发利息（单次最多 40）' },
    // ---- 稀有 ----
    prism:   { name: '分裂符文', r: 2, cost: 26, max: 2, fx: { extra: 1, dmg: -0.18 }, note: '每把武器含义不同：见武器说明' },
    contract: { name: '暗杀契约', r: 2, cost: 26, max: 2, fx: { critMul: 0.5, crit: 0.05, maxHp: -4 } },
    clover:  { name: '四叶草', r: 2, cost: 22, max: 2, fx: { luck: 0.4, dmg: -0.05 } },
    holy:    { name: '圣水', r: 2, cost: 24, max: 2, fx: { healOrb: 1, regen: 0.2 } },
    drum:    { name: '战鼓', r: 2, cost: 26, max: 2, fx: { rate: 0.2, dmg: 0.1, armor: -2 } },
    ember:   { name: '圣火护符', r: 2, cost: 24, max: 2, fx: { coreRegen: 1, healCore: 2, dmg: -0.05 } },
    // ---- 传说 ----
    heart:   { name: '龙之心', r: 3, cost: 40, max: 1, fx: { maxHp: 12, regen: 0.6, speed: -0.1 } },
    crown:   { name: '时之王冠', r: 3, cost: 40, max: 1, fx: { cdr: -0.35, rate: 0.15, dmgTaken: 0.2 } },
    belt:    { name: '巨人腰带', r: 3, cost: 42, max: 1, fx: { dmg: 0.4, maxHp: 6, speed: -0.15 } },
    trident: { name: '三叉符文', r: 3, cost: 44, max: 1, fx: { extra: 1, crit: 0.1, rate: -0.1 } }
  };
  RW.MOD_ORDER = Object.keys(RW.MODS);

  // =====================================================================
  // M1 · 一局闭环与构筑深度（白皮书第 4–8 节）
  // =====================================================================

  // 一局 20 波；第 20 波是终局 Boss，击败即通关，之后可选无尽
  RW.RUN = { waves: 20, endlessHp: 0.12 };

  // 危险等级：每个英雄独立，通关 n 级解锁 n+1 级；高等级包含低等级的全部规则
  // siege：额外有这么大比例的敌人从入口直奔圣火
  RW.DANGER = [
    { name: '危险 0', hp: 1.00, dmg: 1.00, note: '标准难度' },
    { name: '危险 1', hp: 1.18, dmg: 1.10, eliteEarly: 1, siege: 0.08, note: '敌人更硬；第 3 波就有精英；更多敌人冲圣火' },
    { name: '危险 2', hp: 1.36, dmg: 1.20, eliteEarly: 1, price: 0.1, siege: 0.16, note: '物价 +10%；攻城更凶' },
    { name: '危险 3', hp: 1.55, dmg: 1.30, eliteEarly: 1, price: 0.1, elite: 1, siege: 0.21, note: '每波多一只精英' },
    { name: '危险 4', hp: 1.72, dmg: 1.40, eliteEarly: 1, price: 0.1, elite: 1, coreHp: -0.2, siege: 0.23, note: '圣火最大生命 -20%' },
    { name: '危险 5', hp: 1.88, dmg: 1.55, eliteEarly: 1, price: 0.1, elite: 1, coreHp: -0.2, boss: 0.25, siege: 0.25, note: 'Boss 血量 +25%、更快' }
  ];
  RW.dangerOpen = function (hero, d, prog) {
    if (!d) return true;
    var hd = prog && prog.heroDanger ? prog.heroDanger[hero] : undefined;
    return hd != null && hd >= d - 1;
  };

  // 祝福：位阶晋升、击败 Boss 时获得，进整备前三选一。纯正面，数值约为同品质道具的 1.2 倍
  RW.BLESSINGS = {
    b_dmg:    { name: '战火祝福', r: 0, fx: { dmg: 0.1 } },
    b_hp:     { name: '坚韧祝福', r: 0, fx: { maxHp: 6 } },
    b_armor:  { name: '石肤祝福', r: 0, fx: { armor: 1 } },
    b_rate:   { name: '疾手祝福', r: 0, fx: { rate: 0.1 } },
    b_speed:  { name: '轻风祝福', r: 0, fx: { speed: 0.07 } },
    b_regen:  { name: '甘泉祝福', r: 0, fx: { regen: 0.35 } },
    b_crit:   { name: '鹰目祝福', r: 0, fx: { crit: 0.06 } },
    b_pick:   { name: '引金祝福', r: 0, fx: { pickup: 0.35, harvest: 0.08 } },
    b_melee:  { name: '刃锋祝福', r: 0, fx: { melee: 0.18 } },
    b_ranged: { name: '弦劲祝福', r: 0, fx: { ranged: 0.18 } },
    b_spell:  { name: '秘火祝福', r: 0, fx: { spell: 0.18 } },
    b_range:  { name: '远望祝福', r: 0, fx: { range: 0.14 } },
    b_dmg2:   { name: '烈焰祝福', r: 1, fx: { dmg: 0.16, crit: 0.03 } },
    b_hp2:    { name: '巨人祝福', r: 1, fx: { maxHp: 10, regen: 0.2 } },
    b_armor2: { name: '铁卫祝福', r: 1, fx: { armor: 2, thorns: 3 } },
    b_rate2:  { name: '狂风祝福', r: 1, fx: { rate: 0.16 } },
    b_leech:  { name: '血契祝福', r: 1, fx: { lifesteal: 0.05, dmg: 0.04 } },
    b_dodge:  { name: '幻影祝福', r: 1, fx: { dodge: 0.06, speed: 0.04 } },
    b_cdr:    { name: '时隙祝福', r: 1, fx: { cdr: -0.1, mpRegen: 0.2 } },
    b_critm:  { name: '断骨祝福', r: 1, fx: { critMul: 0.35, crit: 0.03 } },
    b_extra:  { name: '分光祝福', r: 2, fx: { extra: 1 } },
    b_all:    { name: '圣火眷顾', r: 2, fx: { dmg: 0.2, rate: 0.12, maxHp: 8 } },
    b_luck:   { name: '命运祝福', r: 2, fx: { luck: 0.35, harvest: 0.2 } },
    b_core:   { name: '守火祝福', r: 2, fx: { coreRegen: 1.5, healCore: 3, towerDmg: 0.25 } }
  };
  RW.BLESS_ORDER = Object.keys(RW.BLESSINGS);

  // 流派套装：按武器槽里同流派武器的「阶数之和」计层（I=1、II=2、III=3）
  RW.SETS = {
    melee:  { name: '近战', color: '#ffb08a', tiers: [[2, { armor: 2 }], [4, { melee: 0.2, lifesteal: 0.05 }], [6, { rate: 0.25, knock: 0.5 }]] },
    ranged: { name: '远程', color: '#d8ff8a', tiers: [[2, { range: 0.15 }], [4, { ranged: 0.2, crit: 0.08 }], [6, { extra: 1 }]] },
    spell:  { name: '法术', color: '#b58cff', tiers: [[2, { cdr: -0.1 }], [4, { spell: 0.2, blastR: 0.15 }], [6, { cdr: -0.2, mpRegen: 0.5 }]] }
  };
  RW.SET_ORDER = ['melee', 'ranged', 'spell'];

  // 武器进化：III 阶武器 + 背包里有指定道具 → 整备时可免费进化；伤害 ×1.5 并获得专属效果
  RW.EVOLVE = {
    needle:   { mod: 'lens',     name: '贯日弩',   pierce: 2, note: '每发穿透 2 个敌人' },
    repeater: { mod: 'fins',     name: '暴雨连弩', extra: 2, note: '每轮多射 2 发' },
    scatter:  { mod: 'powder',   name: '焚城霰',   extra: 1, note: '多喷两团火' },
    javelin:  { mod: 'sight',    name: '追星枪',   extra: 2, note: '多投两支标枪' },
    blades:   { mod: 'gauntlet', name: '千刃环',   extra: 3, range: 0.3, note: '剑刃 +3，半径 +30%' },
    flail:    { mod: 'plate',    name: '陨星锤',   extra: 1, range: 0.4, note: '锤子 +1，半径 +40%' },
    cleaver:  { mod: 'maul',     name: '开山斧',   extra: 2, range: 0.3, note: '挥砍更宽、更远' },
    pike:     { mod: 'contract', name: '龙牙枪',   extra: 2, note: '一次刺出三枪' },
    lance:    { mod: 'tome',     name: '天罚矛',   extra: 2, note: '两侧各多一道雷光' },
    arc:      { mod: 'coil',     name: '雷网',     extra: 3, nofall: 1, note: '连跳 +3，跳跃不衰减' },
    mines:    { mod: 'piggy',    name: '金符阵',   extra: 2, gold: 1, note: '陷阱 +2，炸死的敌人多掉金币' }
  };
  RW.EVOLVE_MUL = 1.5;

  // 设置页：同类游戏差评里最常见的是「后期满屏光污染看不清」「数字挡视线」「震屏晕」「音量没法调」，这里都给开关
  RW.SETTINGS = [
    { id: 'vol', name: '总音量', def: 1, min: 0, max: 1, step: 0.1, pct: true },
    { id: 'music', name: '音乐', def: 1, min: 0, max: 1, step: 0.1, pct: true },
    { id: 'sfx', name: '音效', def: 1, min: 0, max: 1, step: 0.1, pct: true },
    { id: 'shake', name: '屏幕震动', def: 1, min: 0, max: 1, step: 0.25, pct: true, note: '容易晕的话调低' },
    { id: 'flash', name: '闪光强度', def: 1, min: 0, max: 1, step: 0.25, pct: true, note: '对闪光敏感请调低或关掉' },
    { id: 'fx', name: '特效亮度', def: 1, min: 0.3, max: 1, step: 0.1, pct: true, note: '后期看不清自己时调低' },
    { id: 'nums', name: '伤害数字', def: 2, opts: ['关', '只看暴击和受伤', '全部'] },
    { id: 'ring', name: '主角脚下光圈', def: 1, opts: ['关', '开'], note: '人多时一眼找到自己' },
    { id: 'gfx', name: '画质', def: 0, opts: ['自动', '低', '中', '高'], note: '自动：掉帧时依次关泛光、环境光遮蔽、描边、阴影；低：关掉遮蔽和描边' },
    { id: 'cam', name: '镜头远近', def: 1, min: 0.85, max: 1.2, step: 0.05, pct: true, note: '调大看得更广' },
    { id: 'cb', name: '色弱辅助', def: 0, opts: ['关', '开'], note: '危险预警改成蓝 / 黄高对比色' },
    { id: 'blur', name: '切出窗口时暂停', def: 1, opts: ['关', '开'] }
  ];
  // 可改键的操作（设置 → 按键）。每个操作第一个键是主键，界面上的键帽跟着主键走；数字 1–4 造塔、Esc 暂停固定不变
  RW.KEY_ACTIONS = [
    ['up', '向上走'], ['down', '向下走'], ['left', '向左走'], ['right', '向右走'], ['dash', '冲刺'],
    ['skill0', '技能 1'], ['skill1', '技能 2'], ['skill2', '技能 3'], ['build', '造塔菜单'],
    ['cmd:post', '兵营布防'], ['cmd:recall', '兵营召回'], ['cmd:troop', '换兵种'], ['cmd:form', '换阵型'], ['pause', '暂停']
  ];
  RW.KEY_DEFAULTS = {
    up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
    dash: ['Space', 'ShiftLeft', 'ShiftRight'], skill0: ['KeyQ', 'KeyJ'], skill1: ['KeyE'], skill2: ['KeyR'], build: ['KeyB'],
    'cmd:post': ['KeyG'], 'cmd:recall': ['KeyH'], 'cmd:troop': ['KeyT'], 'cmd:form': ['KeyY'], pause: ['KeyP']
  };
  RW.keysDefault = function () { var o = {}; for (var k in RW.KEY_DEFAULTS) o[k] = RW.KEY_DEFAULTS[k].slice(); return o; };
  RW.keys = RW.keysDefault();
  // 键码 → 屏幕上显示的名字
  RW.keyName = function (code) {
    if (!code) return '—';
    var N = { Space: '空格', ShiftLeft: '左Shift', ShiftRight: '右Shift', ControlLeft: '左Ctrl', ControlRight: '右Ctrl', AltLeft: '左Alt', AltRight: '右Alt',
      ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', Enter: 'Enter', Backquote: '`', Minus: '-', Equal: '=',
      BracketLeft: '[', BracketRight: ']', Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backslash: '\\', CapsLock: 'Caps' };
    if (N[code]) return N[code];
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad/.test(code)) return '小键盘' + code.slice(6);
    return code;
  };
  RW.keyLabel = function (action) { var l = RW.keys[action]; return RW.keyName(l && l[0]); };
  RW.keyAction = function (code) { for (var k in RW.keys) if (RW.keys[k].indexOf(code) >= 0) return k; return null; };
  // 改键：新键设为这个操作的主键；别的操作原来占着这个键的，把它的主键换成本操作的旧主键（互换，不会有操作没键）
  RW.rebind = function (action, code) {
    var mine = RW.keys[action], old = mine[0];
    for (var k in RW.keys) {
      if (k === action) continue;
      var i = RW.keys[k].indexOf(code);
      if (i === 0) RW.keys[k][0] = old; else if (i > 0) RW.keys[k].splice(i, 1);
    }
    var j = mine.indexOf(code); if (j > 0) mine.splice(j, 1);
    mine[0] = code;
  };
  // 属性说明：整备页「属性说明」面板用。玩家常抱怨「这个数到底管什么」「叠加后算多少」，这里一句话讲清楚
  RW.STAT_DESC = {
    dmg: '所有武器、技能的伤害倍率，和近战 / 远程 / 法术加成相乘',
    melee: '只加近战武器（剑环、流星锤、巨斧、长枪）', ranged: '只加远程武器（飞弩、连弩、霰火、标枪）', spell: '只加法术武器和技能（闪电、雷光矛、陷阱、Q/E/R）',
    rate: '武器出手间隔 ÷ 攻速', speed: '走路速度倍率', range: '武器射程 / 剑环半径倍率',
    crit: '每次命中暴击的几率，最高 90%', critMul: '暴击时的伤害倍率（基础 ×2）',
    maxHp: '最大生命；整备时补满', armor: '减伤 = 护甲÷(护甲+12)，最高 75%；负护甲每点多受伤 8%',
    regen: '每秒回复的生命', dodge: '完全躲开一次伤害的几率，上限 60%', lifesteal: '你的武器和技能命中时回 1 点血的几率，每秒最多 8 次',
    dmgTaken: '受到的伤害倍率（越低越好）', thorns: '受伤时震伤身边的敌人（再乘伤害倍率）',
    pickup: '吸取金币和火光的距离', harvest: '每波结束时的固定收成，和捡金币的多少', luck: '商店出精良 / 稀有 / 传说货的几率',
    knock: '把敌人打退的距离', extra: '每把武器多一发弹 / 多一片刃 / 多跳一次（各武器卡上写了具体效果）',
    cdr: '技能冷却倍率（越低越好），最低 50%', mpRegen: '蓝（法力）的回复速度', dashCd: '冲刺冷却倍率（越低越好）',
    towerDmg: '箭塔、寒霜塔、兵营士兵的伤害倍率', buildCost: '造塔价格倍率（越低越好）', blastR: '你的爆炸（陷阱、炎爆）的范围',
    interest: '每次整备按手上金币发利息，单次最多 40', healOrb: '在身边击杀时掉回血火光的几率倍率', healCore: '捡到火光时同时给圣火回的血',
    coreRegen: '圣火每秒回血', rage: '生命越低伤害越高，满血时没有加成', shopPrice: '商店价格倍率（越低越好）', freeReroll: '每次整备的免费刷新次数',
    bounty: '精英掉落金币翻倍，但第 3 波起每波多一只精英'
  };

  RW.optDefaults = function () { var o = {}; for (var i = 0; i < RW.SETTINGS.length; i++) o[RW.SETTINGS[i].id] = RW.SETTINGS[i].def; return o; };
  RW.opt = RW.optDefaults();

  // 商店手气（玩家最常骂的是「怎么都刷不到要的东西」）：
  // 已有流派的武器权重 ×ownTag，能升阶的 ×upgrade；缺进化道具时连续 evoPity 次整备没刷到就保底放一件
  RW.SHOP_BIAS = { ownTag: 1.8, upgrade: 1.6, evoPity: 2, bans: 3 };   // bans：每局可以禁用几件货

  // 变异器：开局可选，难度越高分数倍率越高
  RW.MUTATORS = {
    night:   { name: '夜行',     score: 0.10, note: '全程夜晚' },
    swarm:   { name: '狂潮',     score: 0.20, spawn: 0.3, note: '刷怪 +30%' },
    iron:    { name: '铁壁',     score: 0.15, armor: 2, note: '敌人护甲 +2' },
    poor:    { name: '穷村',     score: 0.15, gold: -0.25, note: '收成与金币 -25%' },
    fragile: { name: '脆火',     score: 0.20, coreHp: -0.35, note: '圣火最大生命 -35%' },
    horde:   { name: '精英横行', score: 0.25, elite: 1, note: '每波多一只精英' },
    lonely:  { name: '无伴',     score: 0.15, nochest: 1, note: '不刷金箱，没有同伴' },
    nobuild: { name: '孤身',     score: 0.20, nobuild: 1, note: '不能建造' }
  };
  RW.MUT_ORDER = Object.keys(RW.MUTATORS);

  // 分数：清掉的波数、击杀、Boss、通关，乘以危险等级与变异器倍率
  RW.SCORE = { wave: 100, kill: 1, boss: 500, win: 3000, danger: 0.25 };

  // 成就：id 与以后的 Steam 成就一一对应（ACH_ + 大写 id）。check(pr 局外进度, r 本局汇总)
  RW.ACHIEVEMENTS = [
    { id: 'first_run', name: '初次守护', desc: '完成第一局', check: function (pr) { return pr.runs >= 1; } },
    { id: 'wave5', name: '站稳脚跟', desc: '撑到第 5 波', check: function (pr, r) { return r.wave >= 5; } },
    { id: 'wave10', name: '守夜人', desc: '撑到第 10 波', check: function (pr, r) { return r.wave >= 10; } },
    { id: 'wave15', name: '长夜将尽', desc: '撑到第 15 波', check: function (pr, r) { return r.wave >= 15; } },
    { id: 'boss1', name: '撼山', desc: '击败一个 Boss', check: function (pr, r) { return r.bossKills >= 1; } },
    { id: 'win', name: '圣火长明', desc: '击败灭火者，通关一局', check: function (pr, r) { return r.won; } },
    { id: 'win_d1', name: '危险 1', desc: '通关危险 1', check: function (pr, r) { return r.won && r.danger >= 1; } },
    { id: 'win_d2', name: '危险 2', desc: '通关危险 2', check: function (pr, r) { return r.won && r.danger >= 2; } },
    { id: 'win_d3', name: '危险 3', desc: '通关危险 3', check: function (pr, r) { return r.won && r.danger >= 3; } },
    { id: 'win_d4', name: '危险 4', desc: '通关危险 4', check: function (pr, r) { return r.won && r.danger >= 4; } },
    { id: 'win_d5', name: '不灭之火', desc: '通关危险 5', check: function (pr, r) { return r.won && r.danger >= 5; } },
    { id: 'heroes3', name: '三人成众', desc: '用 3 个不同英雄通关', check: function (pr) { return RW.countKeys(pr.heroDanger) >= 3; } },
    { id: 'heroes10', name: '群英', desc: '用 10 个不同英雄通关', check: function (pr) { return RW.countKeys(pr.heroDanger) >= 10; } },
    { id: 'endless25', name: '无尽之夜', desc: '无尽模式打到第 25 波', check: function (pr, r) { return r.wave >= 25; } },
    { id: 'endless30', name: '永夜', desc: '无尽模式打到第 30 波', check: function (pr, r) { return r.wave >= 30; } },
    { id: 'kills1k', name: '初试锋芒', desc: '累计击杀 1000', check: function (pr) { return pr.kills >= 1000; } },
    { id: 'kills10k', name: '割草人', desc: '累计击杀 10000', check: function (pr) { return pr.kills >= 10000; } },
    { id: 'kills50k', name: '收割季', desc: '累计击杀 50000', check: function (pr) { return pr.kills >= 50000; } },
    { id: 'streak100', name: '连斩', desc: '一局最高连杀达到 100', check: function (pr, r) { return r.streak >= 100; } },
    { id: 'mates6', name: '一队人马', desc: '同时拥有 6 个同伴', check: function (pr, r) { return r.mateMax >= 6; } },
    { id: 'mate_star', name: '合二为一', desc: '合成一个二星同伴', check: function (pr, r) { return r.mateStar; } },
    { id: 'evolve1', name: '淬火', desc: '进化一把武器', check: function (pr, r) { return r.evolved >= 1; } },
    { id: 'evolve3', name: '神兵', desc: '一局进化 3 把武器', check: function (pr, r) { return r.evolved >= 3; } },
    { id: 'set_melee', name: '近战宗师', desc: '近战流派达到 6 层', check: function (pr, r) { return (r.setMax.melee || 0) >= 6; } },
    { id: 'set_ranged', name: '远程宗师', desc: '远程流派达到 6 层', check: function (pr, r) { return (r.setMax.ranged || 0) >= 6; } },
    { id: 'set_spell', name: '法术宗师', desc: '法术流派达到 6 层', check: function (pr, r) { return (r.setMax.spell || 0) >= 6; } },
    { id: 'core_max', name: '天火降世', desc: '圣火升到 10 级，天火照遍全图', check: function (pr, r) { return r.coreLv >= RW.CORE_LV.length - 1; } },
    { id: 'legend', name: '传说', desc: '买到一件传说道具', check: function (pr, r) { return r.legendary; } },
    { id: 'rich', name: '富甲一村', desc: '一局累计获得 1000 金币', check: function (pr, r) { return r.gold >= 1000; } },
    { id: 'builder', name: '筑城者', desc: '一局建造 8 座建筑', check: function (pr, r) { return r.built >= 8; } },
    { id: 'bless5', name: '蒙福', desc: '一局获得 5 个祝福', check: function (pr, r) { return r.bless >= 5; } },
    { id: 'no_revive', name: '一命通关', desc: '英雄一次都没倒下、也没重燃圣火就通关', check: function (pr, r) { return r.won && !r.revived && !r.deaths; } },
    { id: 'mut1', name: '逆风', desc: '开着变异器通关', check: function (pr, r) { return r.won && r.mutators >= 1; } },
    { id: 'mut4', name: '逆天', desc: '开着 4 个变异器通关', check: function (pr, r) { return r.won && r.mutators >= 4; } },
    { id: 'no_build', name: '孤胆', desc: '一座建筑都不造就通关', check: function (pr, r) { return r.won && r.built === 0; } },
    { id: 'daily', name: '今日守护', desc: '完成一次每日挑战', check: function (pr, r) { return !!r.daily; } },
    { id: 'unlock_all', name: '满堂英雄', desc: '解锁全部英雄', check: function (pr) { for (var i = 0; i < RW.CLASS_ORDER.length; i++) if (!RW.isUnlocked(RW.CLASS_ORDER[i], pr)) return false; return true; } },
    { id: 'runs10', name: '常客', desc: '完成 10 局', check: function (pr) { return pr.runs >= 10; } },
    { id: 'runs50', name: '老兵', desc: '完成 50 局', check: function (pr) { return pr.runs >= 50; } },
    { id: 'score50k', name: '五万分', desc: '一局得分达到 50000', check: function (pr, r) { return r.score >= 50000; } },
    { id: 'shrine10', name: '巡礼者', desc: '一局占领 10 座祭坛', check: function (pr, r) { return r.shrines >= 10; } },
    { id: 'maps4', name: '走遍四方', desc: '在四张地图上都撑到第 10 波', check: function (pr) { var n = 0; for (var k in (pr.mapBest || {})) if (pr.mapBest[k] >= 10) n++; return n >= 4; } }
  ];
  RW.countKeys = function (o) { var n = 0; for (var k in (o || {})) n++; return n; };

  // ---------- M0 夜战（3 分钟守北桥）----------
  // 字段名按 docs/specs/M0_NIGHT_BATTLE.md；数值取调平稿（阈值 40、连击窗 2.5s、小鬼 40 血）。
  // 改这里即生效。slots 有内容时按 18×10s 时间轴刷；清空 slots 才回落到 spawn / bursts 起步曲线。
  RW.NIGHT = {
    map: 'm0bridge',
    introSec: 1.0,
    duration: 180,
    endSec: 0.8,
    rekindle: 0,
    gate: 'north',
    heroStart: 'bridgeSouth',
    spawnFromGates: true,   // 开：只从入口刷；关：退回英雄周围环刷（旧波次那套）
    allowFly: false,        // M0 不刷飞行敌人（蝠母 / 蝙蝠）
    spawnCutoff: 174,
    respawn: { base: 4, perWave: 0, max: 12, hp: 0.6, inv: 2.5, coreCost: 0.08 },
    slash: {
      dmg: 24, interval: 0.45, arc: 120, radius: 72, hitDelay: 0.05,
      heavyEvery: 3, heavyMul: 1.8, heavyKnockMul: 2, chainReset: 1.0, crit: false,
      knock: 368,
      near: { r0: 25, r1: 72, bonus: 0.4 }
    },
    hitstop: { hit: 0.06, heavy: 0.10, kill: 0.10, capPerSec: 0.20, playerHurt: 5 / 60, overload: 0.10 },
    knock: { normal: 40, elite: 12, boss: 0, capPerSec: 120 },
    shake: { hit: 0, heavy: 0.12, killElite: 0.5, overload: 0.6, coreHit: 0.2, playerHurt: 0.35, addPerSec: 1.0, decay: 2.6 },
    dmgText: { max: 40, perSec: 30, merge: 0.1, life: 0.7, color: '#ffffff', heavyColor: '#ffa24a', heavyScale: 1.25, rise: -62 },
    shatter: { shards: [6, 10], embers: [1, 3], life: 0.6 },
    enemies: {
      mite: { hp: 40, coreBias: 0.55 },
      dasher: { hp: 70, coreBias: 0.5 },
      spitter: { hp: 50, coreBias: 0.5 },
      warden: { hp: 320, knockRes: 0.3, coreBias: 1 }
    },
    // 起步曲线（M0_NIGHT_BATTLE §4）。slots 非空时不走这条。
    spawn: [
      [0, 60, { mite: 1.2 }],
      [60, 120, { mite: 0.5, dasher: 0.2, spitter: 0.15 }],
      [120, 160, { mite: 0.5, dasher: 0.1 }],
      [160, 180, { mite: 1.5, dasher: 0.25, spitter: 0.25 }]
    ],
    bursts: [[0.5, 'mite', 3], [125, 'warden', 1], [145, 'warden', 1], [150, 'mite', 12], [160, 'mite', 20]],
    // 18×10s，只数来自 M1 时间轴表（小鬼 / 狼骑 / 暗弓手 / 暗影术士）。开场 3 只改放到桥北口，保证首杀。
    opener: { n: 3, post: 'approach', telegraph: 0 },
    slots: [
      { t0: 0, t1: 10, gates: ['S3'], mite: 8 },
      { t0: 10, t1: 20, gates: ['S3', 'S2'], mite: 10 },
      { t0: 20, t1: 30, gates: ['S1', 'S2'], mite: 12 },
      { t0: 30, t1: 40, gates: ['S1', 'S2', 'S3'], mite: 18 },
      { t0: 40, t1: 50, gates: ['S1', 'S2'], mite: 10 },
      { t0: 50, t1: 60, gates: ['S2'], mite: 8 },
      { t0: 60, t1: 70, gates: ['S1', 'S2'], mite: 8, dasher: 4 },
      { t0: 70, t1: 80, gates: ['S3'], mite: 8, spitter: 3 },
      { t0: 80, t1: 90, gates: ['S1', 'S2', 'S3'], mite: 6, dasher: 2, spitter: 2 },
      { t0: 90, t1: 100, gates: ['S1', 'S2', 'S3'], mite: 12, dasher: 4, spitter: 3 },
      { t0: 100, t1: 110, gates: ['S1', 'S2'], mite: 6, dasher: 2, spitter: 2 },
      { t0: 110, t1: 120, gates: ['S3'], mite: 4 },
      { t0: 120, t1: 130, gates: ['S3'], mite: 4 },
      { t0: 130, t1: 140, gates: ['S3', 'S1'], mite: 6, dasher: 2, warden: 1, at: { warden: [130] } },
      { t0: 140, t1: 150, gates: ['S1', 'S2', 'S3'], mite: 12, dasher: 3, spitter: 3, warden: 1, at: { warden: [142] } },
      { t0: 150, t1: 160, gates: ['S1', 'S2'], mite: 8, dasher: 2, spitter: 2 },
      { t0: 160, t1: 170, gates: ['S1', 'S2', 'S3'], mite: 18, dasher: 4, spitter: 3 },
      { t0: 170, t1: 180, gates: ['S1', 'S2', 'S3'], mite: 16, dasher: 4, spitter: 3 }
    ],
    flame: { hp: 1000, touchDmg: 20, eliteTouchMul: 5, chewCd: 0.9, gunDmg: 10 },
    combo: { window: 2.5, countTowers: false },
    overload: { threshold: 40, duration: 8, cooldown: 40, towerRateMul: 2, slashRadiusMul: 1.4, shockDmg: 60 },
    comeback: { flameBelow: 0.3, thresholdMul: 0.5, dmgMul: 1.5, perNight: 1 },
    towers: [{ kind: 'sentry', tier: 1 }, { kind: 'sentry', tier: 1 }],
    result: { stars: [0.7, 0.4], showDelay: 0.8, restartLock: 0.3 }
  };
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));

// 环带值守 · 数据表（v3 奇幻守村）。逻辑只读这里的表，调数值只改这个文件。
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
    WORLD: { w: 1120, h: 1520 },                 // 地图总尺寸（由 js/map.js 决定，sim 启动时会校正）
    ARENA: { x: 0, y: 0, w: 1120, h: 1520 },
    VIEW: { x: 0, y: 0, w: 960, h: 540 },        // 战场视口：铺满全屏，HUD 悬浮在四角
    MAX_ENEMIES: 120,
    FONT: 'Consolas, "Courier New", monospace',
    player: {
      hp: 30, speed: 165, radius: 10,
      accel: 2300, turnAccel: 3600, friction: 1150,
      iframes: 0.55, pickup: 36, crit: 0.05, critMul: 2,
      hurtPush: 190
    },
    dash: { speed: 560, time: 0.16, iframes: 0.26, cd: 2.2, dmg: 6, knock: 180 },
    camera: { lead: 0.28, follow: 7 },
    hitstop: { gap: 0.12, heavy: 3, shellKill: 2, eliteCrit: 2, eliteKill: 8, playerHurt: 5, mine: 3, evolve: 8 },
    shard: { life: 8, blink: 2, recallRate: 0.5, magnetSpeed: 560 },
    spawn: { telegraph: 0.8, safeDist: 170, ringMin: 260, ringMax: 470, anywhere: 0.15 },
    biomass: { count: 40, respawn: 14, mass: 1 },
    momentum: { near: 160, per: 1, decayDelay: 1.6, decay: 6, tiers: [15, 40, 80], rate: [0.15, 0.3, 0.45], dmg: [0, 0.1, 0.2], speed: [0, 0, 0.1], max: 100 },
    healOrb: { chance: 0.08, near: 160, heal: 2, life: 7 },
    build: { max: 8, spacing: 34, step: 0.15, time: 0.5 },
    // 圣火：村子中央的守护目标。它熄灭 = 值守失败（位置由地图里的 C 决定）。
    core: { x: 580, y: 900, r: 30, hp: 260, gunDmg: 6, gunCd: 0.5, gunRange: 170, waveHeal: 0.5, repairCost: 14, repairPart: 0.5, armorCost: 20, armorHp: 50, interceptDist: 110 },
    priceGrowth: 0.08,          // 每波物价 +8%
    rerollBase: 2, rerollPerWave: 1, rerollStep: 2,
    sellRate: 0.5,
    armorPerPoint: 0.07,        // 每点护甲 受伤 -7%
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
      name: '飞弩', kind: 'needle', color: '#ffe08a', cost: 15,
      dmg: 8, cd: [0.38, 0.32, 0.26], range: 235, speed: 560, knock: 80,
      pros: '射程远、弹道快，站远了也能稳定输出',
      cons: '只打单体，打有护甲的敌人每发都被削',
      extraNote: '额外弹数：每 +1 多一发，呈扇形'
    },
    scatter: {
      name: '霰火', kind: 'scatter', color: '#ff9a3c', cost: 18,
      dmg: 4, cd: [0.9, 0.84, 0.78], range: 150, speed: 440, knock: 150, pellets: 5, spread: 0.62, recoil: 55,
      pros: '贴脸喷出 5 团火焰，击退强，瞬间打散怪群',
      cons: '射程很短，还会把你往后推',
      extraNote: '额外弹数：每 +1 多两团火'
    },
    blades: {
      name: '护身剑环', kind: 'blades', color: '#bff5ff', cost: 18,
      dmg: 4, cd: [0.35, 0.33, 0.3], range: 54, spin: 4.4, knock: 110, count: 3, bladeR: 8,
      pros: '不用瞄准，绕身旋转，贴身清杂兵',
      cons: '没有射程，得主动往怪里钻',
      extraNote: '额外弹数：每 +1 多一片刃'
    },
    lance: {
      name: '雷光矛', kind: 'lance', color: '#b58cff', cost: 22,
      dmg: 34, cd: [1.1, 1.0, 0.9], range: 340, charge: 0.34, width: 12, knock: 90,
      pros: '一道雷光贯穿整条线，单发高伤，打精英最强',
      cons: '蓄力 0.34 秒才开火，方向提前锁死，快怪能躲开',
      extraNote: '额外弹数：每 +1 多一道偏 ±6° 的雷光'
    },
    arc: {
      name: '连锁闪电', kind: 'arc', color: '#8fc2ff', cost: 20,
      dmg: 7, cd: [0.8, 0.74, 0.68], range: 170, jumps: 3, jumpRange: 110, falloff: 0.8, knock: 30,
      pros: '必中，在敌人之间连跳，越密越赚',
      cons: '每跳一次伤害 ×0.8，单挑精英很乏力',
      extraNote: '额外弹数：每 +1 多跳一次'
    },
    mines: {
      name: '符文陷阱', kind: 'mines', color: '#ff7a4a', cost: 20,
      dmg: 15, cd: [1.4, 1.28, 1.16], range: 58, maxMines: 4, arm: 0.45, trigger: 24, life: 12, knock: 230,
      pros: '符文爆炸范围大、击退猛，把怪引过来就清场',
      cons: '只在你脚下布雷，站着不动就没有输出',
      extraNote: '额外弹数：每 +1 同时存在的雷 +2'
    }
  };
  RW.WEAPON_ORDER = ['needle', 'scatter', 'blades', 'lance', 'arc', 'mines'];
  RW.TIER_DMG = [1, 1.65, 2.5];
  RW.TIER_COST = [1, 1.6, 2.6];     // 买 I / 升 II / 升 III 的价格倍率
  RW.MAX_SLOTS = 6;

  // ---------- 英雄（开局选一个；多数需要解锁） ----------
  // fx：与改造同一套属性（见 RW.STATS），英雄特性也用属性表达，卡面文字自动生成。
  // near / focus：法师、弩手的专属机制。look：3D 与头像的造型（帽子 hat、手持 prop）。
  // unlock：{ kind: 'free' } 默认可用；'wave' 用任意（或指定 hero）英雄打到第 n 波；'kills' / 'coins' / 'built' 为累计击杀 / 金币 / 建造。
  RW.CLASSES = {
    mage: {
      name: '法师', tag: '贴脸爆发', color: '#ff9a3c', cape: '#ff8a2a', look: { hat: 'wizard', prop: 'staff' },
      weapon: 'arc', skill: 'nova', hp: 26, fx: {},
      passive: '近焰：离敌人越近伤害越高，贴身 +40%',
      near: { r0: 60, r1: 200, bonus: 0.4 },
      pros: '起手连锁闪电 + 炎爆；站进怪堆里打最痛',
      cons: '血薄；逃跑时输出会跟着掉',
      unlock: { kind: 'free' }
    },
    ranger: {
      name: '弩手', tag: '站桩狙击', color: '#9dff7a', cape: '#3e8a3a', look: { hat: 'hood', prop: 'crossbow' },
      weapon: 'needle', skill: 'storm', hp: 30, fx: {},
      passive: '凝神：站定射击叠层，每层暴击 +8%，满 5 层弩箭穿透',
      focus: { still: 40, per: 0.45, max: 5, crit: 0.08, decay: 1.2 },
      pros: '起手飞弩 + 追魂箭雨；站稳了暴击高、能穿透',
      cons: '一移动凝神就掉，被围住很难受',
      unlock: { kind: 'free' }
    },
    knight: {
      name: '盾骑士', tag: '反伤坦克', color: '#9fc4ff', cape: '#3f5f9e', look: { hat: 'helm', prop: 'sword' },
      weapon: 'blades', skill: 'nova', hp: 38, fx: { armor: 3, thorns: 6, speed: -0.08, rate: -0.1 },
      passive: '荆棘：挨打时反震身边的敌人',
      pros: '血厚甲硬，挨打还能反伤，适合贴着桥头硬扛',
      cons: '走得慢、攻速低，追不上逃跑的怪',
      unlock: { kind: 'wave', wave: 5, text: '任意英雄打到第 5 波' }
    },
    rogue: {
      name: '影刺客', tag: '暴击收割', color: '#d6a8ff', cape: '#3a2a55', look: { hat: 'bandana', prop: 'dagger' },
      weapon: 'needle', skill: 'storm', hp: 22, fx: { crit: 0.15, critMul: 1, speed: 0.12, dashCd: -0.3, armor: -1 },
      passive: '致命：暴击伤害 ×3（别人 ×2），冲刺冷却 -30%',
      pros: '暴击高、暴击伤害高、跑得快，冲刺很勤',
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
      weapon: 'blades', skill: 'nova', hp: 34, fx: { rage: 0.8, dmg: 0.1, dmgTaken: 0.15 },
      passive: '狂怒：生命越低伤害越高，残血时最多 +80%',
      pros: '血越少越猛，残血时一刀一片',
      cons: '受到伤害 +15%，玩脱了就是一瞬间',
      unlock: { kind: 'kills', n: 1500, text: '累计击杀 1500 只敌人' }
    },
    priest: {
      name: '圣女', tag: '续航守护', color: '#fff1a8', cape: '#f4f0e0', look: { hat: 'halo', prop: 'book' },
      weapon: 'arc', skill: 'veil', hp: 30, fx: { regen: 0.5, healOrb: 1.5, healCore: 4, dmg: -0.12 },
      passive: '祝福：回血火光多 2.5 倍，捡到时还给圣火回 4 点',
      pros: '自己能回血，还能顺手修圣火，很难被磨死',
      cons: '伤害 -12%，杀得慢',
      unlock: { kind: 'wave', wave: 8, hero: 'mage', text: '用法师打到第 8 波' }
    },
    bomber: {
      name: '爆破手', tag: '范围轰炸', color: '#ff7a4a', cape: '#5a4630', look: { hat: 'cap', prop: 'bomb' },
      weapon: 'mines', skill: 'well', hp: 28, fx: { blastR: 0.35, knock: 0.3, range: -0.2 },
      passive: '火药：所有爆炸范围 +35%',
      pros: '符文陷阱、炎爆、黑洞的爆炸都更大，一炸一片',
      cons: '射程 -20%，远程武器不好用',
      unlock: { kind: 'wave', wave: 10, text: '任意英雄打到第 10 波' }
    },
    merchant: {
      name: '商人', tag: '滚雪球', color: '#ffe066', cape: '#6a3a8a', look: { hat: 'tophat', prop: 'coin' },
      weapon: 'needle', skill: 'storm', hp: 26, fx: { harvest: 0.3, interest: 0.1, shopPrice: -0.1, dmg: -0.15 },
      passive: '生意经：每次整备按手上金币给 10% 利息，商店打九折',
      pros: '钱越攒越多，中后期装备最好',
      cons: '伤害 -15%，前几波会比较难熬',
      unlock: { kind: 'coins', n: 3000, text: '累计获得 3000 金币' }
    },
    gambler: {
      name: '赌徒', tag: '看脸', color: '#7affd0', cape: '#1f5a4a', look: { hat: 'crown', prop: 'dice' },
      weapon: 'scatter', skill: 'veil', hp: 28, fx: { luck: 0.6, freeReroll: 1, crit: 0.05, dmgTaken: 0.1 },
      passive: '好运：高品质道具更常出现，每次整备免费刷新 1 次',
      pros: '更容易刷到稀有、传说道具',
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
      name: '炎爆', color: '#ff9a3c', cost: 20, cd: 10, dmg: 14, radius: 150, knock: 340,
      pros: '以自己为中心炸开一圈烈焰，把贴身的怪全部掀飞',
      cons: '只管身边 150，远处的威胁它碰不到'
    },
    veil: {
      name: '雷暴', color: '#a8d4ff', cost: 24, cd: 14, dur: 3, rate: 7, dmg: 12, radius: 210,
      pros: '3 秒内从天而降的落雷，自动劈周围的敌人',
      cons: '冷却最长；随机落点，救不了被单只精英追的急'
    },
    well: {
      name: '黑洞法阵', color: '#c07bff', cost: 24, cd: 12, pull: 1.8, force: 300, radius: 170, dmg: 34, blast: 115,
      pros: '把一大片怪吸成一团再内爆，配雷光矛、符文陷阱最香',
      cons: '要吸 1.8 秒才炸；精英几乎吸不动'
    },
    storm: {
      name: '追魂箭雨', color: '#ffd166', cost: 22, cd: 12, missiles: 16, dmg: 8, speed: 340, turn: 7, life: 2.4,
      pros: '一次射出 16 支追魂箭，自己找目标，适合清散兵',
      cons: '单发伤害低，打护甲怪会被削得很厉害'
    }
  };
  RW.SKILL_ORDER = ['nova', 'veil', 'well', 'storm'];
  RW.SKILL_TIER = [1, 1.5, 2.2];

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
      soldier: { hp: 14, dmg: 4, speed: 118, r: 6, atkCd: 0.55 },
      pros: '自动出兵，士兵会去拦截兵营附近的敌人，替你挡刀',
      cons: '贵；士兵会被小怪围死，兵营离你远了就帮不上'
    }
  };
  RW.TOWER_ORDER = ['sentry', 'pylon', 'siphon', 'barracks'];
  RW.TOWER_TIER = { dmg: [1, 1.7, 2.6], hp: [1, 1.5, 2.2], range: [1, 1.12, 1.25] };
  RW.TECH_COST = [0, 1, 1.7];         // 科技 II / III 的价格倍率（乘 techCost）

  // ---------- 敌人表（10）：轮廓、速度、行为都要一眼能分开 ----------
  RW.ENEMIES = {
    mite: {
      name: '小鬼', hp: 5, speed: 66, dmg: 2, r: 8, armor: 0, knockRes: 1, shards: 1, shardVal: 1, mass: 1,
      color: '#b04cff', shape: 'imp', cluster: 4, soldierAggro: 60, coreBias: 0.2
    },
    spore: {
      name: '蝙蝠', fly: true, hp: 3, speed: 90, dmg: 1.5, r: 6, armor: 0, knockRes: 1.2, shards: 0, shardVal: 0, mass: 1,
      color: '#8a5cff', shape: 'bat', cluster: 1, soldierAggro: 60
    },
    shell: {
      name: '铁甲兽', hp: 24, speed: 34, dmg: 3, r: 14, armor: 2, armorGrow: 0.25, knockRes: 0.45, shards: 2, shardVal: 1, mass: 3,
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
      name: '暗影术士', elite: true, hp: 150, speed: 28, dmg: 5, r: 22, armor: 1, armorGrow: 0.12, knockRes: 0.12, shards: 6, shardVal: 3, mass: 8,
      color: '#ff3b8c', shape: 'warlock', cluster: 1,
      fireCd: 3.2, charge: 0.7, bullets: 10, bulletsLate: 14, lateWave: 8, bulletSpeed: 105, bulletDmg: 3
    },
    brood: {
      name: '蝠母', elite: true, hp: 210, speed: 22, dmg: 5, r: 26, armor: 1, armorGrow: 0.12, knockRes: 0.08, shards: 8, shardVal: 3, mass: 10,
      color: '#9b4dff', shape: 'broodmother', cluster: 1, spawnCd: 4.5, spawnN: 3, coreBias: 1
    }
  };
  // ---------- Boss：第 5 / 10 / 15… 波出场 ----------
  RW.ENEMIES.boss = {
    name: '崩山巨像', elite: true, boss: true, hp: 400, speed: 34, dmg: 6, r: 38, armor: 1, armorGrow: 0.1, knockRes: 0.02, shards: 24, shardVal: 2, mass: 30,
    color: '#ff6a2e', shape: 'golem', cluster: 1,
    rest: [2.2, 1.4],                          // 两次大招之间的间隔（一阶段 / 二阶段）
    slam: { tele: [1.15, 0.9], r: 95, mul: 1.4 },
    barrage: { dur: 2.2, every: 0.12, arms: 3, speed: 150, turn: 0.35, dmg: 3 },
    charge: { aim: 0.9, time: 0.85, speed: 520, mul: 1.5 },
    phase2: 0.5, summonCd: 8, summon: ['dasher', 'spore', 'spore', 'bomber']
  };
  RW.BOSS_WAVES = { every: 5, at: 0.2, rateCut: 0.35 };

  // 敌人成长：hp × (1 + a(w-1) + b(w-1)^2 + c9(w-8)^2)，伤害 × (1 + c(w-1))
  RW.GROWTH = { hpA: 0.2, hpB: 0.035, hpC9: 0.35, dmgC: 0.09, spdC: 0.015, spdCap: 0.25 };

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
    var k = w - 10, el = [];
    var n = 4 + Math.floor(k / 2);
    for (var i = 0; i < n; i++) el.push([0.1 + 0.8 * i / Math.max(1, n - 1), i % 2 ? 'brood' : 'warden']);
    return { dur: 40, r0: 3.5 + 0.25 * k, r1: 5.0 + 0.3 * k, mix: RW.WAVES[10].mix, elites: el };
  };

  // ---------- 改造 / 道具表 ----------
  // fx 里的值：pct 类是比例（0.3 = +30%），flat 类是绝对值。卡面「强/弱」由 fx 自动生成，数据和文字永远一致。
  RW.STATS = {
    dmg: { label: '伤害', pct: true },
    rate: { label: '攻速', pct: true },
    speed: { label: '移速', pct: true },
    range: { label: '射程', pct: true },
    crit: { label: '暴击率', pct: true },
    maxHp: { label: '最大生命', pct: false },
    armor: { label: '护甲', pct: false },
    regen: { label: '每秒回血', pct: false },
    pickup: { label: '拾取半径', pct: true },
    harvest: { label: '金币获取', pct: true },
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
    dashCd: { label: '冲刺冷却', pct: true, inverse: true }
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
    whet:    { name: '磨刀石', r: 0, cost: 14, max: 5, fx: { dmg: 0.08 } },
    bracer:  { name: '皮护腕', r: 0, cost: 13, max: 5, fx: { armor: 1 } },
    apple:   { name: '红苹果', r: 0, cost: 12, max: 5, fx: { maxHp: 3 } },
    feather: { name: '羽毛', r: 0, cost: 12, max: 3, fx: { speed: 0.06, pickup: 0.2 } },
    purse:   { name: '小钱袋', r: 0, cost: 14, max: 3, fx: { harvest: 0.12 } },
    herb:    { name: '草药', r: 0, cost: 13, max: 3, fx: { regen: 0.25 } },
    // ---- 精良 ----
    coil:    { name: '狂暴药剂', r: 1, cost: 20, max: 3, fx: { dmg: 0.30, maxHp: -4 } },
    sight:   { name: '致命之眼', r: 1, cost: 18, max: 3, fx: { crit: 0.15, maxHp: -3 }, note: '暴击默认 ×2 伤害' },
    plate:   { name: '重甲', r: 1, cost: 20, max: 3, fx: { armor: 2, speed: -0.12 }, note: '每点护甲受伤 -7%' },
    greed:   { name: '贪婪之戒', r: 1, cost: 16, max: 2, fx: { harvest: 0.3, dmgTaken: 0.15 } },
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
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));

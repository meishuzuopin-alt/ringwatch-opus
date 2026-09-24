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
    W: 420, H: 760, DT: 1 / 60,
    WORLD: { w: 1120, h: 1520 },                 // 地图总尺寸（由 js/map.js 决定，sim 启动时会校正）
    ARENA: { x: 0, y: 0, w: 1120, h: 1520 },
    VIEW: { x: 0, y: 100, w: 420, h: 660 },      // 屏幕上的战场视口
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
    armorPerPoint: 0.07         // 每点护甲 受伤 -7%
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

  // ---------- 职业（开局二选一） ----------
  RW.CLASSES = {
    mage: {
      name: '法师', color: '#ff9a3c', cape: '#ff8a2a', weapon: 'arc', skill: 'nova', hp: 26,
      passive: '近焰：离敌人越近伤害越高，贴身 +40%',
      near: { r0: 60, r1: 200, bonus: 0.4 },
      pros: '起手连锁闪电 + 炎爆；站进怪堆里打最痛',
      cons: '血薄；逃跑时输出会跟着掉'
    },
    ranger: {
      name: '弩手', color: '#9dff7a', cape: '#3e8a3a', weapon: 'needle', skill: 'storm', hp: 30,
      passive: '凝神：站定射击叠层，每层暴击 +8%，满 5 层弩箭穿透',
      focus: { still: 40, per: 0.45, max: 5, crit: 0.08, decay: 1.2 },
      pros: '起手飞弩 + 追魂箭雨；站稳了暴击高、能穿透',
      cons: '一移动凝神就掉，被围住很难受'
    }
  };
  RW.CLASS_ORDER = ['mage', 'ranger'];

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

  // ---------- 改造表（12） ----------
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
    bounty: { label: '精英悬赏', pct: false, special: true }
  };
  RW.MODS = {
    coil:    { name: '狂暴药剂', cost: 20, max: 3, fx: { dmg: 0.30, maxHp: -4 } },
    fins:    { name: '轻灵手套', cost: 18, max: 3, fx: { rate: 0.22, dmg: -0.08 } },
    prism:   { name: '分裂符文', cost: 26, max: 2, fx: { extra: 1, dmg: -0.18 }, note: '每把武器含义不同：见武器说明' },
    lens:    { name: '鹰眼', cost: 16, max: 3, fx: { range: 0.30, rate: -0.10 }, note: '剑环半径、陷阱范围也吃射程' },
    sight:   { name: '致命之眼', cost: 18, max: 3, fx: { crit: 0.15, maxHp: -3 }, note: '暴击 ×2 伤害' },
    plate:   { name: '重甲', cost: 20, max: 3, fx: { armor: 2, speed: -0.12 }, note: '每点护甲受伤 -7%' },
    hull:    { name: '疾风靴', cost: 16, max: 3, fx: { speed: 0.16, armor: -1 } },
    nano:    { name: '再生护符', cost: 20, max: 3, fx: { regen: 0.4, dmg: -0.06 } },
    magnet:  { name: '磁石', cost: 14, max: 2, fx: { pickup: 0.7, rate: -0.05 } },
    greed:   { name: '贪婪之戒', cost: 16, max: 2, fx: { harvest: 0.3, dmgTaken: 0.15 } },
    overclock: { name: '时之沙', cost: 18, max: 2, fx: { cdr: -0.25, rate: -0.1 }, note: '冲刺和技能都算' },
    bounty:  { name: '悬赏令', cost: 18, max: 1, fx: { bounty: 1 }, note: '强：精英掉落金币 ×2　弱：第3波起每波多来 1 只精英' }
  };
  RW.MOD_ORDER = ['coil', 'fins', 'prism', 'lens', 'sight', 'plate', 'hull', 'nano', 'magnet', 'greed', 'overclock', 'bounty'];
})(typeof GameGlobal !== 'undefined' ? GameGlobal : (typeof window !== 'undefined' ? window : globalThis));

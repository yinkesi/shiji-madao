# -*- coding: utf-8 -*-
"""幂等配置接入：逐项检查并应用，直到全部完成"""
import io

p = 'js/engine.js'
s = io.open(p, encoding='utf-8', newline='').read().replace('\r\n', '\n')

if 'const CFG = window.SJI_CONFIG;' not in s:
    s = s.replace('window.SJI_ENGINE = (function () {\n  "use strict";',
                  'window.SJI_ENGINE = (function () {\n  "use strict";\n  const CFG = window.SJI_CONFIG;', 1)

ITEMS = [
    ("minHpSeen 字段", '      minHpSeen: null,\n', ''),
    ("序列化残留", '          _undo: u._undo, minHpSeen: u.minHpSeen', '          _undo: u._undo'),
    ("_hpScale 死变量", '        this._hpScale = k;\n', ''),
    ("初始血量表", '''        let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
          : (enemies.length >= 4 ? 0.62 : (enemies.length === 3 ? 0.7 : (enemies.length === 2 ? 0.85 : 1)));
        if (this.diff === "extreme") k *= 1.25;   // 极难：敌方更耐打''',
     '''        let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
          : CFG.HP_BY_COUNT[Math.min(4, enemies.length)];
        if (this.diff === "extreme") k *= CFG.DIFFICULTY.extreme.hpExtra;   // 极难：敌方更耐打'''),
    ("波次血量表", '''          : (ids.length >= 4 ? 0.62 : (ids.length === 3 ? 0.7 : (ids.length === 2 ? 0.85 : 1)));''',
     '''          : CFG.HP_BY_COUNT[Math.min(4, ids.length)];'''),
    ("乱斗倍率", '''        const mult = this.diff === "easy" ? 0.8 : (this.diff === "extreme" ? 1.35 : (this.diff === "hard" ? 1.2 : 1));''',
     '''        const mult = CFG.FREE_HP_MULT[this.diff] || 1;'''),
    ("行动点表", '''    enemyBaseAP() {
      const big = this.living("enemy").length >= 3;
      if (this.mode === "survival") return big ? 2 : 3;
      if (this.diff === "easy") return big ? 1 : 2;
      if (this.diff === "extreme") return big ? 3 : 5;
      if (this.diff === "hard") return big ? 2 : 4;
      return big ? 2 : 3;
    }''',
     '''    enemyBaseAP() {
      const d = CFG.DIFFICULTY[this.diff] || CFG.DIFFICULTY.normal;
      const big = this.living("enemy").length >= 3;
      if (this.mode === "survival") return d.apSolo;
      return big ? d.apBig : d.apSolo;
    }'''),
    ("伤害缩放表", '''      let base = n >= 4 ? 0.65 : (n === 3 ? 0.75 : (n === 2 ? 0.88 : 0.9));
      if (this.mode === "survival") base *= 0.9;
      if (this.diff === "extreme") base *= 1.35;
      else if (this.diff === "hard") base *= 1.15;
      else if (this.diff === "easy") base *= 0.7;
      return base;''',
     '''      let base = CFG.DMG_BY_COUNT[Math.min(4, n)];
      if (this.mode === "survival") base *= CFG.SURVIVAL_HP_EXTRA;
      base *= (CFG.DIFFICULTY[this.diff] || CFG.DIFFICULTY.normal).dmgMul;
      return base;'''),
    ("AI 档位表", '''      const T = {
        passive:  { skill: 0.35, sac: 0.04, retreat: 0.7, keep: 0.55, focus: "nearest", horse: 0.3 },
        measured: { skill: 0.65, sac: 0.20, retreat: 0.35, keep: 0.25, focus: "nearest", horse: 0.7 },
        active:   { skill: 0.90, sac: 0.40, retreat: 0.10, keep: 0, focus: "weakest", horse: 1 },
        frenzy:   { skill: 1.00, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }
      };
      return T[this.aiAggr] || T.active;''',
     '''      return CFG.AI_AGGR[this.aiAggr] || CFG.AI_AGGR.active;'''),
    ("友军档位", '''      const prof = (u.side === "ally")
        ? { skill: 0.9, sac: 0.4, retreat: 0.1, keep: 0, focus: "weakest", horse: 1 }
        : (this.diff === "extreme"
            ? { skill: 1.0, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }   // 极难：敌方死战不退
            : this.aiProfile());''',
     '''      const prof = (u.side === "ally")
        ? CFG.AI_ALLY
        : (this.diff === "extreme" ? CFG.AI_AGGR.frenzy
            : this.aiProfile());'''),
    ("以寡敌众", '''          const bonus = Math.min(3, n - 1);
          ap += bonus;
          const hpBonus = Math.min(2, n - 1);''',
     '''          const O = CFG.RULES.OUTNUMBER;
          const bonus = Math.min(O.apCap, (n - 1) * O.apPer);
          ap += bonus;
          const hpBonus = Math.min(O.hpCap, (n - 1) * O.hpPer);'''),
    ("血祭下限", '''      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < 2)) return false;''',
     '''      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < CFG.RULES.SAC_MIN_HP)) return false;'''),
    ("versus 上限", '''        if (this.round > 30) {''', '''        if (this.round > CFG.RULES.MAX_ROUND) {'''),
    ("story 上限", '''        if (this.round > MAX_ROUND) { this.finish("timeout"); break; }''',
     '''        if (this.round > CFG.RULES.MAX_ROUND) { this.finish("timeout"); break; }'''),
    ("种树上限", '''        if (live >= 3) {''', '''        if (live >= CFG.RULES.TREE_CAP) {'''),
    ("AP 上限", '''      return Math.max(0, Math.min(8, ap));''',
     '''      return Math.max(0, Math.min(CFG.RULES.AP_CAP, ap));'''),
]

applied, already = [], []
for tag, old, new in ITEMS:
    if old in s:
        s = s.replace(old, new, 1)
        applied.append(tag)
    else:
        already.append(tag)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print("本次应用:", applied or "无（均已完成）")
print("早已完成:", already or "无")

REQUIRED = [
    'const CFG = window.SJI_CONFIG;',
    'CFG.HP_BY_COUNT[Math.min(4, enemies.length)]',
    'CFG.HP_BY_COUNT[Math.min(4, ids.length)]',
    'CFG.FREE_HP_MULT[this.diff]',
    'CFG.DIFFICULTY[this.diff] || CFG.DIFFICULTY.normal',
    'CFG.DMG_BY_COUNT[Math.min(4, n)]',
    'CFG.AI_AGGR[this.aiAggr]',
    'CFG.AI_ALLY',
    'CFG.RULES.OUTNUMBER',
    'CFG.RULES.SAC_MIN_HP',
    'CFG.RULES.MAX_ROUND',
    'CFG.RULES.TREE_CAP',
    'CFG.RULES.AP_CAP',
]
missing = [k for k in REQUIRED if k not in s]
if missing:
    print("!! 缺失:", missing)
    sys.exit(1)
print("自检通过：config 全面接入")

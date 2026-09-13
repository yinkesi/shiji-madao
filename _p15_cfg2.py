# -*- coding: utf-8 -*-
"""engine.js：配置中心接入（余下步骤）+ 精英系统"""
import io

p = 'js/engine.js'
s = io.open(p, encoding='utf-8', newline='').read().replace('\r\n', '\n')

def rep(old, new, tag):
    global s
    assert old in s, "MISS: " + tag
    s = s.replace(old, new, 1)
    print("ok:", tag)

# ① CFG 声明 + 死代码
rep('window.SJI_ENGINE = (function () {\n  "use strict";',
    'window.SJI_ENGINE = (function () {\n  "use strict";\n  const CFG = window.SJI_CONFIG;', "1 CFG声明")
rep('      minHpSeen: null,\n', '', "2a minHpSeen")
rep('          _undo: u._undo, minHpSeen: u.minHpSeen', '          _undo: u._undo', "2b 序列化")
rep('        this._hpScale = k;\n', '', "2c _hpScale")

# ③ 血量按人数表 + 极难 + 关卡覆盖
rep('''        let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
          : (enemies.length >= 4 ? 0.62 : (enemies.length === 3 ? 0.7 : (enemies.length === 2 ? 0.85 : 1)));
        if (this.diff === "extreme") k *= 1.25;   // 极难：敌方更耐打''',
'''        let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
          : CFG.HP_BY_COUNT[Math.min(4, enemies.length)];
        if (this.diff === "extreme") k *= CFG.DIFFICULTY.extreme.hpExtra;   // 极难：敌方更耐打''', "3 初始血量")

rep('''          : (ids.length >= 4 ? 0.62 : (ids.length === 3 ? 0.7 : (ids.length === 2 ? 0.85 : 1)));''',
'''          : CFG.HP_BY_COUNT[Math.min(4, ids.length)];''', "4 波次血量")

# ⑤ 乱斗倍率
rep('''        const mult = this.diff === "easy" ? 0.8 : (this.diff === "extreme" ? 1.35 : (this.diff === "hard" ? 1.2 : 1));''',
'''        const mult = CFG.FREE_HP_MULT[this.diff] || 1;''', "5 乱斗倍率")

# ⑥ 敌方行动点表
rep('''    enemyBaseAP() {
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
    }''', "6 行动点表")

# ⑦ 伤害缩放表
rep('''      let base = n >= 4 ? 0.65 : (n === 3 ? 0.75 : (n === 2 ? 0.88 : 0.9));
      if (this.mode === "survival") base *= 0.9;
      if (this.diff === "extreme") base *= 1.35;
      else if (this.diff === "hard") base *= 1.15;
      else if (this.diff === "easy") base *= 0.7;
      return base;''',
'''      let base = CFG.DMG_BY_COUNT[Math.min(4, n)];
      if (this.mode === "survival") base *= CFG.SURVIVAL_HP_EXTRA;
      base *= (CFG.DIFFICULTY[this.diff] || CFG.DIFFICULTY.normal).dmgMul;
      return base;''', "7 伤害缩放表")

# ⑧ AI 档位表
rep('''      const T = {
        passive:  { skill: 0.35, sac: 0.04, retreat: 0.7, keep: 0.55, focus: "nearest", horse: 0.3 },
        measured: { skill: 0.65, sac: 0.20, retreat: 0.35, keep: 0.25, focus: "nearest", horse: 0.7 },
        active:   { skill: 0.90, sac: 0.40, retreat: 0.10, keep: 0, focus: "weakest", horse: 1 },
        frenzy:   { skill: 1.00, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }
      };
      return T[this.aiAggr] || T.active;''',
'''      return CFG.AI_AGGR[this.aiAggr] || CFG.AI_AGGR.active;''', "8 AI档位表")

# ⑨ 友军档位
rep('''      const prof = (u.side === "ally")
        ? { skill: 0.9, sac: 0.4, retreat: 0.1, keep: 0, focus: "weakest", horse: 1 }
        : (this.diff === "extreme"
            ? { skill: 1.0, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }   // 极难：敌方死战不退
            : this.aiProfile());''',
'''      const prof = (u.side === "ally")
        ? CFG.AI_ALLY
        : (this.diff === "extreme" ? CFG.AI_AGGR.frenzy
            : this.aiProfile());''', "9 友军档位")

# ⑩ 以寡敌众
rep('''          const bonus = Math.min(3, n - 1);
          ap += bonus;
          const hpBonus = Math.min(2, n - 1);''',
'''          const O = CFG.RULES.OUTNUMBER;
          const bonus = Math.min(O.apCap, (n - 1) * O.apPer);
          ap += bonus;
          const hpBonus = Math.min(O.hpCap, (n - 1) * O.hpPer);''', "10 以寡敌众")

# ⑪ 血祭下限
rep('''      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < 2)) return false;''',
'''      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < CFG.RULES.SAC_MIN_HP)) return false;''', "11 血祭下限")

# ⑫ 回合上限
rep('''        if (this.round > 30) {''', '''        if (this.round > CFG.RULES.MAX_ROUND) {''', "12 versus上限")
rep('''        if (this.round > MAX_ROUND) { this.finish("timeout"); break; }''',
'''        if (this.round > CFG.RULES.MAX_ROUND) { this.finish("timeout"); break; }''', "13 story上限")

# ⑬ 击破回血基础值
rep('''            const baseHeal = (this.diff === "extreme" && this.mode !== "versus") ? 0 : 2;''',
'''            const baseHeal = (this.diff === "extreme" && this.mode !== "versus") ? 0 : CFG.RULES.KILL_HEAL_BASE;''', "14 击破回血")

# ⑭ 种树上限
rep('''        if (live >= 3) {''', '''        if (live >= CFG.RULES.TREE_CAP) {''', "15 种树上限")

# ⑯ AP上限
rep('''      return Math.max(0, Math.min(8, ap));''',
'''      return Math.max(0, Math.min(CFG.RULES.AP_CAP, ap));''', "16 AP上限")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

chk = io.open(p, encoding='utf-8').read()
for k in ['CFG.DIFFICULTY', 'CFG.AI_AGGR', 'CFG.AI_ALLY', 'CFG.HP_BY_COUNT', 'CFG.DMG_BY_COUNT',
          'CFG.FREE_HP_MULT', 'CFG.RULES.OUTNUMBER', 'CFG.RULES.SAC_MIN_HP', 'CFG.RULES.MAX_ROUND',
          'CFG.RULES.TREE_CAP', 'CFG.RULES.AP_CAP', 'CFG.RULES.KILL_HEAL_BASE']:
    assert k in chk, "自检失败: " + k
assert 'minHpSeen' not in chk and '_hpScale' not in chk
print('自检通过：config 全面接入')

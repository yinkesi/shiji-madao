# -*- coding: utf-8 -*-
"""engine.js 接入配置中心 + 清理死代码"""
import io

p = 'js/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, "MISS: " + tag
    s = s.replace(old, new, 1)
    print("ok:", tag)

# ① 引用配置（文件头）
rep('''const D = window.SJI_DATA;''',
    '''const D = window.SJI_DATA;
const CFG = window.SJI_CONFIG;''', "1 引用配置")

# ② 死代码清理
rep('''      boons: { knife: 0, horse: 0, move: 0, dodge: 0, regen: 0, apBonus: 0, cdReduce: 0, blood2: false },
      minHpSeen: null,''',
'''      boons: { knife: 0, horse: 0, move: 0, dodge: 0, regen: 0, apBonus: 0, cdReduce: 0, blood2: false },''', "2a minHpSeen 字段")
rep('''          _undo: u._undo, minHpSeen: u.minHpSeen''',
'''          _undo: u._undo''', "2b 序列化残留")
rep('''        this._hpScale = k;
''', '', "2c _hpScale 死变量")

# ③ 血量/伤害缩放读配置
rep('''      // 剧情/生存：敌方血池随人数递减，避免一对多时输出不敷
      const stg = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
      let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
        : (enemies.length >= 4 ? 0.62 : (enemies.length === 3 ? 0.7 : (enemies.length === 2 ? 0.85 : 1)));
      if (this.diff === "extreme") k *= 1.25;   // 极难：敌方更耐打''',
'''      // 剧情/生存：敌方血池随人数递减，避免一对多时输出不敷
      const stg = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
      let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
        : CFG.HP_BY_COUNT[Math.min(4, enemies.length)];
      if (this.diff === "extreme") k *= CFG.DIFFICULTY.extreme.hpExtra;   // 极难：敌方更耐打''', "3 血量缩放读配置")

rep('''        const stg2 = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
        const k = (stg2 && stg2.hpScale !== undefined) ? stg2.hpScale
          : (ids.length >= 4 ? 0.62 : (ids.length === 3 ? 0.7 : (ids.length === 2 ? 0.85 : 1)));''',
'''        const stg2 = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
        const k = (stg2 && stg2.hpScale !== undefined) ? stg2.hpScale
          : CFG.HP_BY_COUNT[Math.min(4, ids.length)];''', "4 波次血量读配置")

# ④ 击破回血基础值读常量（含极难规则）
rep('''        if (def.side === "enemy" || (this.mode === "versus" && def.side === "p2")) {
          if (def.side === "enemy") this.stats.kills++;
          const humanKiller = att && (att.side === "player" || (this.mode === "versus" && att.side === "p2"));
          if (humanKiller && att !== def) {
            const beneficiary = (att.side === "player") ? this.player : att;
            const baseHeal = (this.diff === "extreme" && this.mode !== "versus") ? 0 : 2;
            const heal = baseHeal + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(beneficiary, heal, "大胜而归，");
          }''',
'''        if (def.side === "enemy" || (this.mode === "versus" && def.side === "p2")) {
          if (def.side === "enemy") this.stats.kills++;
          const humanKiller = att && (att.side === "player" || (this.mode === "versus" && att.side === "p2"));
          if (humanKiller && att !== def) {
            const beneficiary = (att.side === "player") ? this.player : att;
            const heal = CFG.RULES.KILL_HEAL_BASE + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(beneficiary, heal, "大胜而归，");
          }''', "5 击破回血常量")

# ⑤ 乱斗血量倍率读配置
rep('''        const mult = this.diff === "easy" ? 0.8 : (this.diff === "extreme" ? 1.35 : (this.diff === "hard" ? 1.2 : 1));''',
'''        const mult = CFG.FREE_HP_MULT[this.diff] || 1;''', "6 乱斗血量倍率")

# ⑥ 敌方行动点读难度表
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
      if (this.mode === "survival") return d.apSolo;   // 生存固定单敌档（波次自身控量）
      return big ? d.apBig : d.apSolo;
    }''', "7 行动点读难度表")

# ⑦ 伤害缩放读难度表
rep('''      let base = n >= 4 ? 0.65 : (n === 3 ? 0.75 : (n === 2 ? 0.88 : 0.9));
      if (this.mode === "survival") base *= 0.9;
      if (this.diff === "extreme") base *= 1.35;
      else if (this.diff === "hard") base *= 1.15;
      else if (this.diff === "easy") base *= 0.7;
      return base;''',
'''      let base = CFG.DMG_BY_COUNT[Math.min(4, n)];
      if (this.mode === "survival") base *= CFG.SURVIVAL_HP_EXTRA * 10 / 9;   // 生存稍缓
      const d = CFG.DIFFICULTY[this.diff] || CFG.DIFFICULTY.normal;
      base *= d.dmgMul;
      return base;''', "8 伤害缩放读表")

# ⑧ AI 档位读配置
rep('''      const T = {
        passive:  { skill: 0.35, sac: 0.04, retreat: 0.7, keep: 0.55, focus: "nearest", horse: 0.3 },
        measured: { skill: 0.65, sac: 0.2, retreat: 0.35, keep: 0.25, focus: "nearest", horse: 0.7 },
        active:   { skill: 0.9, sac: 0.4, retreat: 0.1, keep: 0, focus: "weakest", horse: 1 },
        frenzy:   { skill: 1.0, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }
      };
      return T[this.aiAggr] || T.active;''',
'''      return CFG.AI_AGGR[this.aiAggr] || CFG.AI_AGGR.active;''', "9 AI 档位读配置")

# ⑨ 友军固定主动档
rep('''      const prof = (u.side === "ally")
        ? { skill: 0.9, sac: 0.4, retreat: 0.1, keep: 0, focus: "weakest", horse: 1 }
        : (this.diff === "extreme"
            ? { skill: 1.0, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }   // 极难：敌方死战不退
            : this.aiProfile());''',
'''      const prof = (u.side === "ally")
        ? CFG.AI_ALLY
        : (this.diff === "extreme" ? CFG.AI_AGGR.frenzy   // 极难：敌方死战不退
            : this.aiProfile());''', "10 友军档位")

# ⑩ 以寡敌众/血祭/回合上限读常量
rep('''          const bonus = Math.min(3, n - 1);
          ap += bonus;
          const hpBonus = Math.min(2, n - 1);''',
'''          const bonus = Math.min(CFG.RULES.OUTNUMBER.apCap, (n - 1) * CFG.RULES.OUTNUMBER.apPer);
          ap += bonus;
          const hpBonus = Math.min(CFG.RULES.OUTNUMBER.hpCap, (n - 1) * CFG.RULES.OUTNUMBER.hpPer);''', "11a 以寡敌众")
rep('''      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < 2)) return false;''',
'''      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < CFG.RULES.SAC_MIN_HP)) return false;''', "11b 血祭下限")
rep('''        if (this.round > 30) {''',
'''        if (this.round > CFG.RULES.MAX_ROUND) {''', "11c versus 上限")
rep('''        if (this.round > MAX_ROUND) { this.finish("timeout"); break; }''',
'''        if (this.round > CFG.RULES.MAX_ROUND) { this.finish("timeout"); break; }''', "11d story 上限")
rep('''      if (this.round > 30) {
        const r1''', '''      if (this.round > CFG.RULES.MAX_ROUND) {
        const r1''') if False else None

# ⑪ 种树上限
rep('''        const live = this.units.filter(x => x.alive && x.charId === "tree" && x.side === u.side).length;
        if (live >= 3) {''',
'''        const live = this.units.filter(x => x.alive && x.charId === "tree" && x.side === u.side).length;
        if (live >= CFG.RULES.TREE_CAP) {''', "12 种树上限")

# ⑫ AP 上限 8 读配置（保留字面即可，改为常量）
rep('''      return Math.max(0, Math.min(8, ap));''',
'''      return Math.max(0, Math.min(CFG.RULES.AP_CAP || 8, ap));''', "13 AP 上限")

io.open(p, 'w', encoding='utf-8').write(s)

# 追加 AP_CAP 到 RULES
s = io.open(p, encoding='utf-8').read()
old = '''    SAC_MIN_HP: 2,                          // 血祭所需最低血量（无「以道代血」时）'''
new = '''    SAC_MIN_HP: 2,                          // 血祭所需最低血量（无「以道代血」时）
    AP_CAP: 8,                              // 单回合行动点上限'''
assert old in s; s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8').write(s)

chk = io.open(p, encoding='utf-8').read()
for k in ['CFG.DIFFICULTY', 'CFG.AI_AGGR', 'CFG.HP_BY_COUNT', 'CFG.DMG_BY_COUNT', 'CFG.RULES.KILL_HEAL_BASE',
          'CFG.RULES.TREE_CAP', 'CFG.RULES.AP_CAP', 'CFG.FREE_HP_MULT']:
    assert k in chk, "自检失败: " + k
assert 'minHpSeen' not in chk and '_hpScale' not in chk, "死代码残留"
print('自检通过：engine.js 全部读取配置、死代码清除')

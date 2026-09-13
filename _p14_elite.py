# -*- coding: utf-8 -*-
"""试炼篇：精英修饰符（关卡级 hp/dmg/ap/only）+ 3 个试炼关 + 成就 + 视觉标识"""
import io

# ================= engine.js =================
p = 'js/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, "MISS: " + tag
    s = s.replace(old, new, 1)
    print("ok:", tag)

# ① 精英应用（血量缩放之后）
rep('''        if (this.diff === "extreme") k *= CFG.DIFFICULTY.extreme.hpExtra;   // 极难：敌方更耐打
        if (k !== 1) enemies.forEach(u => { u.maxhp = Math.max(4, Math.round(u.maxhp * k)); u.hp = u.maxhp; });
        this._hpScale = k;
      }''',
'''        if (this.diff === "extreme") k *= CFG.DIFFICULTY.extreme.hpExtra;   // 极难：敌方更耐打
        if (k !== 1) enemies.forEach(u => { u.maxhp = Math.max(4, Math.round(u.maxhp * k)); u.hp = u.maxhp; });
      }

      // 试炼精英：关卡可配 hp/dmg/ap 倍率与作用对象（only: 指定角色id列表）
      const stageDef = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
      if (stageDef && stageDef.elite) {
        const el = stageDef.elite;
        const only = el.only || null;
        for (const u of enemies) {
          if (only && !only.includes(u.charId)) continue;
          u.maxhp = Math.max(4, Math.round(u.maxhp * (el.hp || 1))); u.hp = u.maxhp;
          u.eDmgMul = el.dmg || 1; u.eApBonus = el.ap || 0; u.elite = true;
          u.ch = Object.assign({}, u.ch, { name: u.ch.name + "·锐" });
        }
      }''', "1 精英应用")

# ② 精英伤害倍率（加算管线末端，敌方缩放之前）
rep('''      if (att.side === "enemy" && !opts.noScale) {
        const sc = this.enemyDmgScale();
        if (sc !== 1) dmg = Math.max(1, Math.round(dmg * sc));
      }''',
'''      if (att.eDmgMul && att.eDmgMul !== 1) dmg = Math.round(dmg * att.eDmgMul);
      if (att.side === "enemy" && !opts.noScale) {
        const sc = this.enemyDmgScale();
        if (sc !== 1) dmg = Math.max(1, Math.round(dmg * sc));
      }''', "2 精英伤害倍率")

# ③ 敌方行动点加成
rep('''        this.living("enemy").forEach(u => u.apNow = this.calcAP(u, this.enemyBaseAP()));''',
'''        this.living("enemy").forEach(u => u.apNow = this.calcAP(u, this.enemyBaseAP() + (u.eApBonus || 0)));''', "3 敌方AP加成")

# ④ 序列化精英字段
rep('''          _undo: u._undo''',
'''          _undo: u._undo, elite: !!u.elite, eDmgMul: u.eDmgMul || 1, eApBonus: u.eApBonus || 0''', "4 序列化精英")

# ⑤ 读档重建精英外观与数值
rep('''      b.log = (snap.log || []).slice();
      return b;''',
'''      b.log = (snap.log || []).slice();
      // 重建精英外观与加成（名称后缀/伤害倍率/行动点加成；血量已在快照内）
      const stg2 = (b.cfg && b.cfg.stage) ? b.cfg.stage : null;
      if (stg2 && stg2.elite) {
        for (const u of b.units) {
          if (!u.elite) continue;
          u.ch = Object.assign({}, u.ch, { name: u.ch.name.replace(/·锐$/, "") + "·锐" });
          u.eDmgMul = stg2.elite.dmg || 1; u.eApBonus = stg2.elite.ap || 0;
        }
      }
      return b;''', "5 读档精英")

io.open(p, 'w', encoding='utf-8').write(s)

chk = io.open(p, encoding='utf-8').read()
for k in ['试炼精英', 'att.eDmgMul', '(u.eApBonus || 0))', 'elite: !!u.elite', '重建精英外观']:
    assert k in chk, "自检失败: " + k
print('自检通过：engine 精英系统')

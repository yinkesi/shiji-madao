# -*- coding: utf-8 -*-
"""多人联机（本地热座）：引擎 p2 侧 + 双方猜拳 + 轮流行动 + 胜负判定"""
import io

p = 'js/engine.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, "MISS: " + tag
    s = s.replace(old, new, 1)
    print("ok:", tag)

# ① 敌我判定：versus 模式下任何不同侧皆为敌
rep('''    opponentsOf(u) {''',
'''    opponentsOf(u) {
      if (this.mode === "versus") {
        return this.units.filter(x => x.alive && x.offField <= 0 && x !== u && x.side !== u.side);
      }''', "versus 敌我判定")

# ② 布阵：p2 入场（对角）
rep('''      this.units = [p, ...allies, ...enemies];
      this.player = p;
      if (p.boons.shield > 0) p.st.shield += p.boons.shield;
      this._trackMinHp(p);''',
'''      // 双人同屏对战：二号位入场（对角）
      if (this.mode === "versus") {
        const p2 = makeUnit(this.cfg.p2Char, "p2", 0);
        this._place(p2, this.passable(0, 3) ? [0, 3] : this._randomFree());
        this.p2Unit = p2;
        this.units.push(p2);
      }
      this.units = this.units.filter(Boolean);
      this.player = p;
      if (p.boons.shield > 0) p.st.shield += p.boons.shield;
      this._trackMinHp(p);''', "p2 入场")

rep('''      this.units = this.units.filter(Boolean);
      this.player = p;''',
'''      this.units = [p, ...allies, ...enemies];
      this.player = p;''', "还原 units 赋值")

# ③ 击破回血对称化（p2 击破 p1 也回血，保持公平）
rep('''          if (att && att.side === "player") {
            const baseHeal = (this.diff === "extreme") ? 0 : 2;   // 极难：击破不再回血
            const heal = baseHeal + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(this.player, heal, "大胜而归，");
          }''',
'''          const humanKill = att && (att.side === "player" || (this.mode === "versus" && att.side === "p2"));
          if (humanKill) {
            const target = (this.mode === "versus") ? att : this.player;
            const baseHeal = (this.diff === "extreme" && this.mode !== "versus") ? 0 : 2;
            const heal = baseHeal + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(target, heal, "大胜而归，");
          }''', "击破回血对称")

# ④ 行动点：versus 下双方同规则（无以寡敌众、无难度加权）
rep('''    enemyBaseAP() {''',
'''    humanSides() {
      return this.mode === "versus" ? ["player", "p2"] : ["player"];
    }

    enemyBaseAP() {''', "humanSides")

# ⑤ 胜负判定：versus 分支
rep('''    async _checkBattleEnd() {
      if (this.over) return;
      const foes = this.living("enemy");''',
'''    async _checkBattleEnd() {
      if (this.over) return;
      if (this.mode === "versus") {
        const a = this.living("player").length, b = this.living("p2").length;
        if (a === 0 || b === 0) {
          this.winner = a === 0 ? "p2" : "p1";
          this.finish("win");
        }
        return;
      }
      const foes = this.living("enemy");''', "versus 胜负")

# ⑥ 主循环：versus 回合（双方各猜拳、轮流行动）
rep('''        this.round++;
        this.units.forEach(u => u.dampUsed = false);
        if (this.player._undo) this.player._undo.length = 0;
        for (const u of this.units) u._usedFirstStrike = false;
        await this._fireTriggers("roundStart");''',
'''        this.round++;
        this.units.forEach(u => u.dampUsed = false);
        if (this.player._undo) this.player._undo.length = 0;
        for (const u of this.units) u._usedFirstStrike = false;
        await this._fireTriggers("roundStart");
        if (this.mode === "versus") { await this.runVersusRound(); continue; }''', "主循环分支")

# ⑦ runVersusRound 实现
rep('''    /* 敌方伤害缩放：以少打多为常态，人多则单体伤害递减，避免围殴瞬杀 */''',
'''    /* 双人同屏：一个回合 = 双方各猜拳 → 依次行动 */
    async runVersusRound() {
      const ui = window.SJI_UI;
      const humans = this.humanSides().map(side => this.units.find(u => u.side === side)).filter(Boolean);
      if (this.round > 30) {
        const r1 = this.humans[0] ? this.humans[0].hp / this.humans[0].maxhp : 0;
        const r2 = this.humans[1] ? this.humans[1].hp / this.humans[1].maxhp : 0;
        this.winner = r1 >= r2 ? "p1" : "p2";
        this.finish("win");
        return;
      }
      // 双方各猜一次拳
      const a1 = await ui.rpsDuel(this, "p1");
      const a2 = await ui.rpsDuel(this, "p2");
      if (this.over) return;
      for (const u of humans) {
        u.apNow = this.calcAP(u, u.side === "p2" ? a2.ap : a1.ap);
        if (u._undo) u._undo.length = 0;
      }
      // 双方轮流行动（各出一次拳，交替行动）
      for (const u of humans) {
        if (!u.alive || this.over) break;
        this.player = u;          // HUD/撤销/状态跟随当前行动方
        if (u.offField > 0) { u.offField--; this._returnHome(u); continue; }
        if (this._tickStatusStart(u)) { ui.onState(); await sleep(400); continue; }
        await ui.playerPhase(this, u);
        this._tickStatusEnd(u);
      }
      for (const u of this.units) this._tickStatusEnd(u);
      ui.onState();
      await sleep(200);
      await this._checkBattleEnd();
    }

    /* 敌方伤害缩放：以少打多为常态，人多则单体伤害递减，避免围殴瞬杀 */''', "runVersusRound")

io.open(p, 'w', encoding='utf-8').write(s)
chk = io.open(p, encoding='utf-8').read()
for k in ['runVersusRound() {', 'this.p2Unit = p2;', 'rpsDuel']:
    assert k in chk, "自检失败: " + k
print('自检通过：versus 引擎已写入')

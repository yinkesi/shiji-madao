# -*- coding: utf-8 -*-
"""删除双人同屏对战模式：界面、引擎、测试、文档"""
import io, os, glob

def read(p):
    with io.open(p, encoding='utf-8', newline='') as f: return f.read()
def write(p, s):
    with io.open(p, 'w', encoding='utf-8', newline='\n') as f: f.write(s)
def cut(s, start, end=None):
    i = s.index(start)
    j = s.index(end, i) + len(end) if end else i + len(start)
    return s[:i] + s[j:]

# ---- index.html ----
p = 'index.html'
s = read(p)
s = s.replace('      <button class="btn big" id="btn-versus">双人 · 同屏对战</button>\n', '', 1)
old = '''  <!-- 双人点将 -->
  <div class="screen" id="screen-versus">
    <div class="topbar"><h2 id="versus-title">一号位点将</h2><div class="crumb">本地同屏 · 轮流执刀 · 各自猜拳</div></div>
    <div class="panel"><div class="char-grid" id="versus-grid"></div></div>
    <div class="sel-bar"><button class="btn" id="versus-back">返回</button><button class="btn primary" id="versus-go">确定</button></div>
  </div>

  <!-- 结算 -->'''
s = s.replace(old, '  <!-- 结算 -->', 1)
write(p, s)
print('ok: index.html')

# ---- ui.js ----
p = 'js/ui.js'
s = read(p)

# 移除 openVersusSelect 整个函数
i = s.index('  /* ---------------- 双人同屏对战：两步点将 ---------------- */')
j = s.index('  /* ---------------- 花瓣 ---------------- */')
s = s[:i] + s[j:]

# 移除 initTitle 中的 versus 绑定
old = '''    const vb = $("#btn-versus");
    if (vb) {
      vb.style.display = "block";
      vb.onclick = () => { AU.unlock(); AU.click(); openVersusSelect(); };
    }
    const ng = $("#btn-ngplus");'''
s = s.replace(old, '    const ng = $("#btn-ngplus");', 1)

# 移除 rpsDuel 函数
i = s.index('  /* ---------------- 双人猜拳（各自暗拳，同时亮出） ---------------- */')
j = s.index('  /* ---------------- 增益三选一 ---------------- */')
s = s[:i] + s[j:]

# 还原 playerPhase（移除 versus 相关）
old = '''  async function playerPhase(b, unit) {
    battle = b;
    const u = unit || b.player;
    if (u && u !== b.player && (b.mode === "versus")) b.player = u;
    b._playerPhaseActive = true;
    await showBanner(b.mode === "versus" ? (u.side === "p2" ? "二号位回合" : "一号位回合") : "汝之回合", 700);'''
new = '''  async function playerPhase(b) {
    battle = b;
    b._playerPhaseActive = true;
    await showBanner("汝之回合", 700);'''
assert old in s, "playerPhase 不匹配"
s = s.replace(old, new, 1)

# 移除 p2 环色和 versus 徽记
old = '''      ctx.strokeStyle = u.side === "player" ? "#d8a11f" : (u.side === "p2" ? "#8a5cd6" : (u.side === "ally" ? "#3a7d46" : "#6e2318"));'''
new = '''      ctx.strokeStyle = u.side === "player" ? "#d8a11f" : (u.side === "ally" ? "#3a7d46" : "#6e2318");'''
assert old in s; s = s.replace(old, new, 1)

old = '''      if (battle.mode === "versus") {
        ctx.font = "bold 12px KaiTi, serif";
        ctx.fillStyle = u.side === "player" ? "#ffd98a" : "#d8c8ff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(u.side === "player" ? "壹" : "贰", px, py - 40);
      }
'''
assert old in s, "MISS: versus badge"
s = s.replace(old, '', 1)

# 移除 rpsDuel 导出
s = s.replace('\n    rpsDuel,', '', 1)

write(p, s)
print('ok: ui.js')

# ---- engine.js ----
p = 'js/engine.js'
s = read(p)

# 1) 移除 p2 创建块
old = '''      // 双人同屏对战：二号位入场（对角）
      if (this.mode === "versus") {
        const p2 = makeUnit(this.cfg.p2Char, "p2", 0);
        this._place(p2, this.passable(0, 3) ? [0, 3] : this._randomFree());
        this.p2Unit = p2;
        this.units.push(p2);
      }
'''
assert old in s, "MISS: p2创建"
s = s.replace(old, '', 1)

# 2) 还原 opponentsOf（移除 versus 分支）
old = '''    opponentsOf(u) {
      if (this.mode === "versus") {
        return this.units.filter(x => x.alive && x.offField <= 0 && x !== u && x.side !== u.side);
      }
      const hostile'''
new = '''    opponentsOf(u) {
      const hostile'''
assert old in s, "MISS: opponentsOf"
s = s.replace(old, new, 1)

# 3) 还原击杀回血（移除 versus 检查）
old = '''        if (def.side === "enemy" || (this.mode === "versus" && def.side === "p2")) {
          if (def.side === "enemy") this.stats.kills++;
          const humanKiller = att && (att.side === "player" || (this.mode === "versus" && att.side === "p2"));
          if (humanKiller && att !== def) {
            const beneficiary = (att.side === "player") ? this.player : att;
            const baseHeal = (this.diff === "extreme" && this.mode !== "versus") ? 0 : CFG.RULES.KILL_HEAL_BASE;
            const heal = baseHeal + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(beneficiary, heal, "大胜而归，");
          }'''
new = '''        if (def.side === "enemy") {
          this.stats.kills++;
          if (att && att.side === "player") this.heal(this.player, CFG.RULES.KILL_HEAL_BASE + (att.boons.killHeal || 0), "大胜而归，");'''
assert old in s, "MISS: 击杀回血"
s = s.replace(old, new, 1)

# 4) 移除 humanSides 方法
i = s.index('    humanSides() {')
j = s.index('\n    ', i + 1)
s = s[:i] + s[j+1:]

# 5) 移除 runVersusRound 方法
i = s.index('    /* 双人同屏：一个回合 = 双方各猜拳 → 依次行动 */')
j = s.index('\n    ', s.index('await this._checkBattleEnd();', i)) + 1
s = s[:i] + s[j:]

# 6) 移除主循环 versus 分支
old = '''        if (this.mode === "versus") { await this.runVersusRound(); continue; }
'''
assert old in s, "MISS: 主循环"
s = s.replace(old, '', 1)

# 7) 移除 _checkBattleEnd versus 分支
old = '''      if (this.mode === "versus") {
        const a = this.living("player").length, b = this.living("p2").length;
        if (a === 0 || b === 0) {
          this.winner = a === 0 ? "p2" : "p1";
          this.finish("win");
        }
        return;
      }
'''
assert old in s, "MISS: checkBattleEnd versus"
s = s.replace(old, '', 1)

# 8) 序列化还原（移除 versus 击杀计分）
old = '''        if (this.mode === "versus" && def.side === "p2") this.stats.kills++;'''
s = s.replace(old + '\n', '', 1)

old = '''        if (this.mode === "versus" && att && att.side !== def.side && def.side === "p2") {
          this.heal(att, 2 + (att.boons.killHeal || 0), "大胜而归，");
        }
'''
s = s.replace(old + '\n', '', 1)

# 9) 移除 _pv 中 versus 相关引用（保留原有逻辑即可，无需改动）
write(p, s)
print('ok: engine.js')

# ---- 移除 versus 引用（确保无残留） ----
for p in ['js/engine.js', 'js/ui.js']:
    s = read(p)
    # 清理残留的 rpsDuel
    while 'rpsDuel' in s:
        i = s.index('rpsDuel')
        # 找到包含 rpsDuel 的完整语句行并删除
        line_start = s.rfind('\n', 0, i) + 1
        line_end = s.index('\n', i)
        s = s[:line_start] + s[line_end+1:]
    write(p, s)

# ---- 删除测试文件 ----
for f in ['test_versus.mjs', 'test_versus_ui.py']:
    if os.path.exists(f): os.remove(f); print('deleted:', f)

# ---- 文档 ----
p = 'README.md'
s = read(p)
s = s.replace('## 双人同屏对战\n\n`mode: "versus"`：本地热座。双方各自点将（可镜像同角色）、每回合各自暗拳猜拳\n（`ui.rpsDuel(b, who)`，两段式弹窗避免偷看）、轮流行动；30 回合按血量比例判定。\n引擎侧：`humanSides()`、`runVersusRound()`、`opponentsOf` 的 versus 分支、\n击破回血对称化。对战不计入成就与剧情存档。\n\n', '', 1)
write(p, s)

p = '实验史记·马刀风云-玩法说明.txt'
s = read(p)
# 移除双人模式介绍段
i = s.find('【双人同屏对战】')
if i > 0:
    j = s.find('\n\n', i)
    if j > 0: s = s[:i] + s[j+2:]
    else: s = s[:i]
write(p, s)

print('done')

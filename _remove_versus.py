#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""删除双人同屏对战模式：界面、引擎、测试、文档全部清除"""
import io, os, re

def read(p):
    with io.open(p, encoding='utf-8', newline='') as f:
        return f.read().replace('\r\n', '\n')

def write(p, s):
    with io.open(p, 'w', encoding='utf-8', newline='\n') as f:
        f.write(s)

# ================= index.html =================
p = 'index.html'
s = read(p)
s = s.replace('      <button class="btn big" id="btn-versus">双人 · 同屏对战</button>\n', '', 1)
# 移除 versus screen 块
i = s.find('  <!-- 双人点将 -->\n  <div class="screen" id="screen-versus">')
if i >= 0:
    j = s.find('  <!-- 结算 -->', i)
    if j >= 0:
        s = s[:i] + s[j:]
        print('ok: index.html 移除 versus screen')
write(p, s)

# ================= ui.js =================
p = 'js/ui.js'
s = read(p)

# 1) 移除 openVersusSelect 函数（含注释）
start_marker = '  /* ---------------- 双人同屏对战：两步点将 ---------------- */'
end_marker = '  /* ---------------- 花瓣 ---------------- */'
i = s.find(start_marker)
if i >= 0:
    j = s.find(end_marker, i)
    s = s[:i] + s[j:]
    print('ok: ui 移除 openVersusSelect')

# 2) 移除 initTitle 中的 versus 按钮绑定
vb_code = '    const vb = $("#btn-versus");\n    if (vb) {\n      vb.style.display = "block";\n      vb.onclick = () => { AU.unlock(); AU.click(); openVersusSelect(); };\n    }\n'
if vb_code in s:
    s = s.replace(vb_code, '', 1)
    print('ok: ui 移除 versus 绑定')

# 3) 还原 playerPhase（移除 unit 参数和 versus 判断）
old_pp = 'async function playerPhase(b, unit) {\n    battle = b;\n    const u = unit || b.player;\n    if (u && u !== b.player && (b.mode === "versus")) b.player = u;\n    b._playerPhaseActive = true;\n    await showBanner(b.mode === "versus" ? (u.side === "p2" ? "二号位回合" : "一号位回合") : "汝之回合", 700);'
new_pp = 'async function playerPhase(b) {\n    battle = b;\n    b._playerPhaseActive = true;\n    await showBanner("汝之回合", 700);'
if old_pp in s:
    s = s.replace(old_pp, new_pp, 1)
    print('ok: ui 还原 playerPhase')

# 4) 移除 rpsDuel 函数
start_marker = '  /* ---------------- 双人猜拳（各自暗拳，同时亮出） ---------------- */'
end_marker = '  /* ---------------- 增益三选一 ---------------- */'
i = s.find(start_marker)
if i >= 0:
    j = s.find(end_marker, i)
    s = s[:i] + s[j:]
    print('ok: ui 移除 rpsDuel')

# 5) 移除 p2 环色
s = s.replace('u.side === "p2" ? "#8a5cd6" : ', '', 1)
print('ok: ui 移除 p2 环色')

# 6) 移除 versus 徽记块
vs_badge = '      if (battle.mode === "versus") {\n        ctx.font = "bold 12px KaiTi, serif";\n        ctx.fillStyle = u.side === "player" ? "#ffd98a" : "#d8c8ff";\n        ctx.textAlign = "center"; ctx.textBaseline = "middle";\n        ctx.fillText(u.side === "player" ? "壹" : "贰", px, py - 40);\n      }\n'
if vs_badge in s:
    s = s.replace(vs_badge, '', 1)
    print('ok: ui 移除 versus 徽记')

# 7) 移除 rpsDuel 导出
s = s.replace('\n    rpsDuel,', '', 1)
print('ok: ui 移除 rpsDuel 导出')

write(p, s)

# ================= engine.js =================
p = 'js/engine.js'
s = read(p)

# 1) 移除 p2 创建块
p2_create = '''      // 双人同屏对战：二号位入场（对角）
      if (this.mode === "versus") {
        const p2 = makeUnit(this.cfg.p2Char, "p2", 0);
        this._place(p2, this.passable(0, 3) ? [0, 3] : this._randomFree());
        this.p2Unit = p2;
        this.units.push(p2);
      }
'''
if p2_create in s:
    s = s.replace(p2_create, '', 1)
    print('ok: engine 移除 p2 创建')

# 2) 移除 opponentsOf versus 分支
opp_vs = '''      if (this.mode === "versus") {
        return this.units.filter(x => x.alive && x.offField <= 0 && x !== u && x.side !== u.side);
      }
'''
if opp_vs in s:
    s = s.replace(opp_vs, '', 1)
    print('ok: engine 移除 opponentsOf versus')

# 3) 还原击杀回血
old_kh = '''        if (def.side === "enemy" || (this.mode === "versus" && def.side === "p2")) {
          if (def.side === "enemy") this.stats.kills++;
          const humanKiller = att && (att.side === "player" || (this.mode === "versus" && att.side === "p2"));
          if (humanKiller && att !== def) {
            const beneficiary = (att.side === "player") ? this.player : att;
            const baseHeal = (this.diff === "extreme" && this.mode !== "versus") ? 0 : 2;
            const heal = baseHeal + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(beneficiary, heal, "大胜而归，");
          }'''
new_kh = '''        if (def.side === "enemy") {
          this.stats.kills++;
          if (att && att.side === "player") this.heal(this.player, CFG.RULES.KILL_HEAL_BASE + (att.boons.killHeal || 0), "大胜而归，");'''
if old_kh in s:
    s = s.replace(old_kh, new_kh, 1)
    print('ok: engine 还原击杀回血')

# 4) 移除 humanSides 方法
hs_start = '    humanSides() {'
i = s.find(hs_start)
if i >= 0:
    # 找到方法体结束（下一个 \n    开头的方法或属性）
    j = s.find('\n    ', i + 10)
    if j < 0: j = len(s)
    s = s[:i] + s[j+1:]
    print('ok: engine 移除 humanSides')

# 5) 移除 runVersusRound 方法
rvr_start = '    /* 双人同屏：一个回合 = 双方各猜拳 → 依次行动 */'
i = s.find(rvr_start)
if i >= 0:
    # 找方法体结束（下一个方法/属性定义）
    next_def = s.find('\n    ', i + 10)
    # 找到下一个方法定义标记
    search = s[i:i+2000]
    # 往后找到方法结束
    brace_count = 0
    method_start = s.find('{', s.find('runVersusRound', i))
    for k in range(method_start, len(s)):
        if s[k] == '{': brace_count += 1
        elif s[k] == '}':
            brace_count -= 1
            if brace_count == 0:
                s = s[:i] + s[k+1:]
                break
    print('ok: engine 移除 runVersusRound')

# 6) 移除主循环 versus 分支
loop_vs = '        if (this.mode === "versus") { await this.runVersusRound(); continue; }\n'
if loop_vs in s:
    s = s.replace(loop_vs, '', 1)
    print('ok: engine 移除主循环 versus')

# 7) 移除 _checkBattleEnd versus 分支
cb_vs = '''      if (this.mode === "versus") {
        const a = this.living("player").length, b = this.living("p2").length;
        if (a === 0 || b === 0) {
          this.winner = a === 0 ? "p2" : "p1";
          this.finish("win");
        }
        return;
      }
'''
if cb_vs in s:
    s = s.replace(cb_vs, '', 1)
    print('ok: engine 移除 checkBattleEnd versus')

# 8) 移除 versus 击杀计分
vs_kill = '        if (this.mode === "versus" && def.side === "p2") this.stats.kills++;\n'
if vs_kill in s:
    s = s.replace(vs_kill, '', 1)

# 9) 移除 versus 击杀回血
vs_heal = '''        if (this.mode === "versus" && att && att.side !== def.side && def.side === "p2") {
          this.heal(att, 2 + (att.boons.killHeal || 0), "大胜而归，");
        }
'''
if vs_heal in s:
    s = s.replace(vs_heal, '', 1)

write(p, s)

# 验证
chk = read(p)
if 'versus' in chk.lower():
    # 列出残余
    for i, line in enumerate(chk.split('\n'), 1):
        if 'versus' in line.lower():
            print(f'  残留 line {i}: {line.strip()[:80]}')
print('engine 清理完成')

# ================= 删除测试文件 =================
for f in ['test_versus.mjs', 'test_versus_ui.py']:
    if os.path.exists(f):
        os.remove(f)
        print('deleted:', f)

# ================= 文档 =================
p = 'README.md'
s = read(p)
i = s.find('## 双人同屏对战')
if i >= 0:
    j = s.find('\n## ', i + 5)
    if j >= 0: s = s[:i] + s[j:]
write(p, s)

p = '实验史记·马刀风云-玩法说明.txt'
s = read(p)
i = s.find('【双人同屏对战】')
if i >= 0:
    j = s.find('\n\n', i)
    if j >= 0: s = s[:i] + s[j+2:]
write(p, s)

print('done')

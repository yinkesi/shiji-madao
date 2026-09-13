# -*- coding: utf-8 -*-
"""浏览器验证：双人同屏对战 + 角色解锁系统"""
import sys, time, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
errors = []

def log(m): print(m, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 800})
    pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
    pg.on("console", lambda m: errors.append("console:" + m.text[:160]) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate("window.SJI_DEBUG.fast = true")
    pg.evaluate("window.SJI_SAVE.setSetting('speed', 3)")

    # ---- ① 解锁系统：初始只有大哥，通关后解锁万震 ----
    roster0 = pg.evaluate("window.SJI_DATA.PLAYABLE.filter(id => window.SJI_SAVE.isUnlocked(id))")
    assert roster0 == ["dage"], f"初始解锁异常: {roster0}"
    pg.evaluate("window.SJI_SAVE.unlockChars(['wanzhen'])")
    roster1 = pg.evaluate("window.SJI_DATA.PLAYABLE.filter(id => window.SJI_SAVE.isUnlocked(id))")
    assert roster1 == ["dage", "wanzhen"], "解锁失败"
    pg.reload(); pg.wait_for_load_state("networkidle")
    assert pg.evaluate("window.SJI_SAVE.isUnlocked('wanzhen')"), "解锁未持久化"
    pg.evaluate("window.SJI_DEBUG.fast = true")
    log("[1] 解锁系统：初始大哥 → 通关解锁万震 → 持久化 OK")

    # ---- ② 双人同屏对战：完整跑通 ----
    pg.evaluate("window.SJI_SAVE.setSetting('rpsMode', 'auto')")   # 对战小节：自动猜拳
    pg.evaluate("window.SJI_SAVE.unlockChars(['shenren', 'xiannv'])")   # 丰富对战名单
    pg.evaluate("window.SJI_UI.showScreen('title')")
    pg.click("#btn-versus")
    pg.wait_for_selector("#screen-versus.on")
    title1 = pg.text_content("#versus-title")
    assert "一号位" in title1, f"点将标题异常: {title1}"
    pg.evaluate("document.querySelector('#versus-grid .char-card:nth-child(3)').click()")  # 仙女
    pg.click("#versus-go")
    pg.wait_for_selector("#screen-versus.on")
    title2 = pg.text_content("#versus-title")
    assert "二号位" in title2, f"第二步点将标题异常: {title2}"
    pg.evaluate("document.querySelector('#versus-grid .char-card:nth-child(2)').click()")  # 神人
    pg.click("#versus-go")
    pg.wait_for_selector("#screen-battle.on")
    pg.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=25000)
    sides = pg.evaluate("window.SJI.battle.units.filter(u=>u.side==='player'||u.side==='p2').map(u=>u.ch.hao+'/'+u.side).join(' ')")
    log(f"[2] 双人点将 OK：{sides}")

    # ---- ③ 连续若干回合：双方各自行动、互有攻防、无异常 ----
    pg.evaluate("window.SJI_SAVE.setSetting('rpsMode', 'auto')")
    for i in range(40):
        over = pg.evaluate("window.SJI.battle.over")
        if over: break
        phase = pg.evaluate("window.SJI.battle._playerPhaseActive===true")
        modal = pg.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')")
        if modal:
            log("  !! 自动猜拳模式下不应出现猜拳弹窗"); errors.append("自动猜拳弹窗泄漏"); break
        if phase:
            acted = pg.evaluate("""(() => {
              const b=window.SJI.battle, u=b.player, E=window.SJI_ENGINE;
              const foes=b.opponentsOf(u); if(!foes.length) return 'no-foes';
              const t=foes.sort((a,c)=>E.manh(u,a)-E.manh(u,c))[0];
              if(!u.hasKnife){ b.doBuyKnife(u); return 'buy'; }
              if(E.adj(u,t)){ b.doKnife(u,t); return 'hit'; }
              const st=b._stepToward(u,t);
              if(st && !(st[0]===u.r&&st[1]===u.c)){ b.doMove(u,st[0],st[1]); return 'move'; }
              return 'wait';
            })()""")
            pg.evaluate("document.querySelector('#b-wait').click()")
        if i % 5 == 4:
            st = pg.evaluate("""(() => {
              const b=window.SJI.battle;
              return JSON.stringify({round:b.round, over:b.over, modal:!!document.querySelector('#modal-mask.on .rps-btn'),
                p1ap:(b.units.find(u=>u.side==='player')||{}).apNow, p2ap:(b.units.find(u=>u.side==='p2')||{}).apNow,
                log:(b.log.slice(-1)||[''])[0]});
            })()""")
            log("   [" + str(i) + "] " + st)
        pg.wait_for_timeout(150)
    state = pg.evaluate("""(() => {
      const b=window.SJI.battle;
      return JSON.stringify({round:b.round, over:b.over, winner:b.winner||null,
        p1hp:b.units.find(u=>u.side==='player').hp, p2hp:(b.units.find(u=>u.side==='p2')||{hp:0}).hp,
        invariants: (function(){ const s=new Set(); for(const u of b.units.filter(x=>x.alive)){ const k=u.r+','+u.c; if(s.has(k)) return '同格'; s.add(k);} return 'ok'; })()});
    })()""")
    log(f"[3] 自动对局推进：{state}")
    d = json.loads(state)
    assert d["round"] >= 3, "对局回合过少"

    # ---- ④ 分出胜负或达到回合判定 ----
    log(f"[4] 战斗状态：over={d['over']}, winner={d['winner']}")
    b.close()

if errors:
    print("!! 错误:", errors[:5]); sys.exit(1)
print("=== 双人同屏 + 解锁系统验证 ALL PASS ===")

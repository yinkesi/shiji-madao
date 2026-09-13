# -*- coding: utf-8 -*-
"""端到端测试：实验史记·马刀风云"""
import sys
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
SHOT = "D:/code/shiji-madao/testshots"
errors = []

def log(msg): print(msg, flush=True)

# 引擎原语行动（模拟一个贪心玩家）
ACT_JS = """(() => {
  const b=window.SJI.battle, p=b.player, E=window.SJI_ENGINE;
  if(!p.alive || b.over) return 'dead';
  const foes=b.opponentsOf(p); if(!foes.length) return 'none';
  const t=foes.sort((a,c)=>E.manh(p,a)-E.manh(p,c))[0];
  if(window.SJI.battle.skillCd(p,0)<=0 && Math.random()<0.5){
    const pick=b.aiPickSkill(p); if(pick){ b.doSkill(p,pick.idx,pick.target); return 'skill'; }
  }
  if(!p.hasKnife){ b.doBuyKnife(p); return 'bought'; }
  if(!p.hasHorse && Math.random()<0.5){ b.doBuyHorse(p); return 'horse'; }
  if(p.hp>=7 && E.manh(p,t)<=2 && Math.random()<0.25){ b.doSacrifice(p); return 'blood'; }
  if(p.hasHorse && E.isWall(p.r,p.c) && E.isWall(t.r,t.c) && E.manh(p,t)<=3){ b.doHorse(p,t); return 'kick'; }
  if(p.hasKnife && E.adj(p,t)){ b.doKnife(p,t); return 'hit'; }
  const step=b._stepToward(p,t);
  if(step && !(step[0]===p.r&&step[1]===p.c)){ b.doMove(p,step[0],step[1]); return 'move'; }
  return 'wait';
})()"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="msedge")
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.on("console", lambda m: errors.append(("console:" + m.type, m.text)) if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))

    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.evaluate("window.SJI_DEBUG.skipScenes = true")
    page.screenshot(path=SHOT + "/01-title.png")
    log("[1] 标题页 OK")

    def try_wait_click(timeout=2000):
        try:
            page.wait_for_selector("#b-wait:not([disabled])", timeout=timeout)
            page.click("#b-wait")
            return True
        except Exception:
            return False

    def diag():
        try:
            st = page.evaluate("""(() => {
              const b=window.SJI.battle;
              return JSON.stringify({over:b.over, round:b.round, phase:b._playerPhaseActive,
                modal:!!document.querySelector('#modal-mask.on'),
                log:b.log.slice(-4)});
            })()""")
            print("   [诊断]", st, flush=True)
        except Exception as e:
            print("   [诊断失败]", e, flush=True)

    def wait_for(label, js, timeout=60000):
        try:
            page.wait_for_function(js, timeout=timeout)
        except Exception:
            print(f"   !! 等待超时: {label}", flush=True)
            diag()
            raise

    def round_cycle(max_rounds, act=ACT_JS):
        """推进若干回合。注意：玩家可能因"跳过"（晕眩/被惑）而失去本回合，
        故每次处理完猜拳即回到循环顶部重新判定，不能假定"猜拳后必有玩家阶段"。"""
        for _ in range(max_rounds):
            if page.evaluate("window.SJI.battle.over"): return
            wait_for("回合/弹窗/结束", """() => {
              const b=window.SJI.battle;
              return b.over || b._playerPhaseActive===true || !!document.querySelector('#modal-mask.on .rps-btn');
            }""", 40000)
            if page.evaluate("window.SJI.battle.over"): return
            if page.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')"):
                page.click("#modal-box .rps-btn")
                wait_for("猜拳收起", "() => !document.querySelector('#modal-mask').classList.contains('on')", 10000)
                continue          # 回到顶部：可能是玩家阶段，也可能被跳过
            if page.evaluate("window.SJI.battle._playerPhaseActive===true"):
                page.evaluate("window.SJI_DEBUG.healPlayer(99)")   # 测试专用：保持满血
                page.evaluate(act)
                try_wait_click(2500)
                wait_for("回合结束", "() => { const b=window.SJI.battle; return b.over || b._playerPhaseActive!==true; }", 40000)

    # ===== 剧情·序章 =====
    page.click("#btn-story")
    page.wait_for_selector("#screen-story.on")
    locked = page.evaluate("[...document.querySelectorAll('.stage-card.locked')].length")
    log(f"[2] 剧情列表 25 关, 锁定 {locked}（应24）")
    page.click(".stage-card:not(.locked)")
    page.wait_for_selector("#modal-mask.on")
    page.screenshot(path=SHOT + "/03-stage-intro.png")
    page.click("#m-go")
    page.wait_for_selector("#screen-charselect.on")
    cards = page.query_selector_all("#charselect-grid .char-card")
    page.evaluate("window.SJI_SAVE.unlockChars(['wonder'])")   # 确定性：解锁 wonder
    cards = page.query_selector_all("#charselect-grid .char-card")
    cards[5].click()  # wonder
    page.click("#cs-go")
    page.wait_for_selector("#screen-battle.on")
    page.screenshot(path=SHOT + "/05-battle-start.png")
    log("[3] 进入战斗 OK")
    page.evaluate("window.SJI_DEBUG.fast = true")
    page.evaluate("window.SJI_DEBUG.skipScenes = true")
    page.evaluate("window.SJI_SAVE.setSetting('speed',3)")

    # 回合1：真实 UI 交互（购刀按钮 + 画布点击移动）
    page.click("#modal-box .rps-btn")
    page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=8000)
    page.wait_for_function("() => window.SJI.battle._playerPhaseActive===true", timeout=30000)
    page.wait_for_selector("#b-knife:not([disabled])")
    page.click("#b-knife")
    assert page.evaluate("window.SJI.battle.player.hasKnife"), "购刀失败"
    log("[4] 真实点击购刀 OK")
    mv = page.evaluate("""(() => {
      const E=window.SJI_ENGINE, b=window.SJI.battle, p=b.player;
      const reach=b._reachable(p, b.moveRange(p));
      const foes=b.opponentsOf(p); if(!foes.length) return null;
      const t=foes.sort((a,c)=>E.manh(p,a)-E.manh(p,c))[0];
      let best=null,bd=999;
      for(const key of reach.keys){
        const [r,c]=key.split(',').map(Number);
        if(b.unitAt(r,c)||(r===p.r&&c===p.c)) continue;
        const d=Math.abs(r-t.r)+Math.abs(c-t.c);
        if(d<bd){bd=d;best={r,c,d};}
      }
      return best;
    })()""")
    pos = page.evaluate(f"""(() => {{
      const cv=document.querySelector('#battle-canvas'), rect=cv.getBoundingClientRect();
      const CS=window.SJI_ENGINE.SIZE*96+40, TILE=96, PAD=20;
      return {{x: rect.left+(PAD+{mv['c']}*TILE+TILE/2)*rect.width/CS,
              y: rect.top+(PAD+{mv['r']}*TILE+TILE/2)*rect.height/CS}};
    }})()""")
    page.mouse.click(pos["x"], pos["y"])
    page.wait_for_timeout(250)
    now = page.evaluate("(()=>{const p=window.SJI.battle.player;return [p.r,p.c];})()")
    assert now == [mv["r"], mv["c"]], f"画布移动失败 {now} != {[mv['r'],mv['c']]}"
    log(f"[5] 画布点击移动 OK -> {now}")
    try_wait_click(2000)
    page.wait_for_function("() => { const b=window.SJI.battle; return b.over || b._playerPhaseActive!==true; }", timeout=60000)
    round_cycle(8)
    log("[6] 序章数回合运转 OK, 回合=" + str(page.evaluate("window.SJI.battle.round")))

    # 秒杀 → 自然流转至结算
    page.evaluate("window.SJI_DEBUG.killEnemies()")
    round_cycle(4)
    page.wait_for_selector("#screen-result.on", timeout=30000)
    page.screenshot(path=SHOT + "/06-result.png")
    seal = page.text_content(".result-seal").strip()
    log("[7] 结算页 OK 判印=" + seal)
    assert "胜" in seal

    page.click("#r-menu")
    page.wait_for_selector("#screen-title.on")
    assert page.evaluate("window.SJI_SAVE.clearedCount()") >= 1, "存档未写入"
    page.reload(); page.wait_for_load_state("networkidle")
    page.click("#btn-story")
    page.wait_for_selector("#screen-story.on")
    locked2 = page.evaluate("[...document.querySelectorAll('.stage-card.locked')].length")
    log(f"[8] 刷新后锁定 {locked2}（应23）→ 存档持久化 OK")
    assert locked2 == 23

    # ===== 图鉴 =====
    page.evaluate("window.SJI_UI.showScreen('title')")
    page.click("#btn-codex")
    page.wait_for_selector("#screen-codex.on")
    page.click("#codex-grid .char-card")
    page.wait_for_selector("#modal-mask.on")
    page.screenshot(path=SHOT + "/07-codex.png")
    page.click("#m-close")
    log("[9] 图鉴 OK")

    # ===== 乱斗 1v1 完整打赢 =====
    page.evaluate("window.SJI_UI.showScreen('title')")
    page.click("#btn-free")
    page.wait_for_selector("#screen-free.on")
    page.click("#free-pgrid .char-card")
    page.click("#free-egrid .char-card")
    page.screenshot(path=SHOT + "/08-free.png")
    page.click("#free-go")
    page.wait_for_selector("#screen-battle.on")
    round_cycle(12)
    page.evaluate("window.SJI_DEBUG.killEnemies()")
    round_cycle(4)
    page.wait_for_selector("#screen-result.on", timeout=30000)
    log("[10] 乱斗流程 OK 判印=" + page.text_content(".result-seal").strip())
    page.evaluate("window.SJI_UI.showScreen('title')")

    # ===== 生存：两波 + 增益 =====
    page.click("#btn-survival")
    page.wait_for_selector("#screen-charselect.on")
    page.click("#charselect-grid .char-card:nth-child(4)")  # 头哥
    page.click("#cs-go")
    page.wait_for_selector("#screen-battle.on")
    for w in (2, 3):
        page.wait_for_function("() => { const b=window.SJI.battle; return b.over || b._playerPhaseActive===true || !!document.querySelector('#modal-mask.on .rps-btn'); }", timeout=60000)
        if page.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')"):
            page.click("#modal-box .rps-btn")
            page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=10000)
            page.wait_for_function("() => window.SJI.battle._playerPhaseActive===true", timeout=30000)
        page.evaluate("window.SJI_DEBUG.killEnemies()")
        try_wait_click(3000)
        page.wait_for_selector("#modal-mask.on .boon-b", timeout=30000)
        page.screenshot(path=SHOT + "/09-boon.png")
        page.click("#modal-box .boon-b")
        page.wait_for_function(f"() => window.SJI.battle.survivalWaveNo >= {w}", timeout=20000)
    log("[11] 生存两波+增益 OK, 第 " + str(page.evaluate("window.SJI.battle.survivalWaveNo")) + " 波")
    page.screenshot(path=SHOT + "/10-survival.png")
    page.click("#b-exit")
    page.wait_for_selector("#screen-title.on")
    page.wait_for_timeout(600)
    assert not page.evaluate("document.querySelector('#modal-mask').classList.contains('on')"), "离场后有残留弹窗"
    log("[11.5] 离场无残留弹窗 OK")

    # ===== 成就 =====
    page.click("#btn-ach")
    page.wait_for_selector("#screen-ach.on")
    got = page.evaluate("document.querySelectorAll('.ach-card.got').length")
    log(f"[12] 成就已达成 {got} 项")
    page.screenshot(path=SHOT + "/11-ach.png")

    browser.close()

print()
if errors:
    print(f"!! 控制台/页面错误 {len(errors)} 条:")
    for t, e in errors[:20]:
        print("  -", t, e[:300])
    sys.exit(1)
print("=== E2E ALL PASS · 控制台零报错 ===")

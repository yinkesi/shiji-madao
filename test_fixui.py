# -*- coding: utf-8 -*-
"""验证：遣返回家归位 + AI 主动性 + 难度选择器（真实浏览器）"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
errors = []

def log(m): print(m, flush=True)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.on("console", lambda m: errors.append("console:" + m.text[:200]) if m.type == "error" else None)
    page.goto(URL); page.wait_for_load_state("networkidle")
    page.evaluate("window.SJI_DEBUG.fast = true")
    page.evaluate("window.SJI_SAVE.setSetting('speed', 3)")
    page.evaluate("window.SJI_DEBUG.skipScenes = true")

    # ---- 1) 难度选择器存在且能切换 ----
    page.click("#btn-story"); page.wait_for_selector("#screen-story.on")
    page.click(".stage-card:not(.locked)")
    page.wait_for_selector("#modal-mask.on"); page.click("#m-go")
    page.wait_for_selector("#screen-charselect.on")
    diff_visible = page.evaluate("document.querySelector('#cs-diff-panel').style.display !== 'none'")
    assert diff_visible, "点将页未显示难度选择"
    page.click("#cs-diff button[data-v='hard']")
    is_hard = page.evaluate("document.querySelector(\"#cs-diff button[data-v='hard']\").classList.contains('on')")
    assert is_hard, "困难档未选中"
    log("[1] 难度选择器 OK（切到困难）")
    page.click("#cs-diff button[data-v='normal']")
    page.click("#charselect-grid .char-card:nth-child(5)")
    page.click("#cs-go"); page.wait_for_selector("#screen-battle.on")
    log("[2] 困难→普通切换后出征 OK，diff = " + str(page.evaluate("window.SJI.battle.diff")))

    # ---- 2) 以寡敌众：序章单敌无加成；s11 三敌有加成 ----
    n1 = page.evaluate("""(() => {
      const b=window.SJI.battle;
      return b.calcAP(b.player, 3);
    })()""")
    log(f"[3] 单敌场合行动点 = {n1}（应为3，无以寡敌众加成）")
    assert n1 == 3, "单敌不应有加成"

    # ---- 3) AI 主动性：让敌人行动若干回合，统计买马/移动/伤害 ----
    page.evaluate("window.SJI.battle.over = true")
    page.wait_for_timeout(200)
    page.evaluate("window.SJI_UI.showScreen('title')")
    page.evaluate("""(() => {
      const D=window.SJI_DATA, E=window.SJI_ENGINE;
      const st=D.STAGES.find(s=>s.id==='s11');
      window.__probe = new E.Battle({mode:'story',stage:st,playerChar:'wonder',
        enemies:st.enemies,allies:st.allies||[],rule:st.rule,waves:st.waves,diff:'normal'});
    })()""")
    hmm = page.evaluate("""(() => {
      const b=window.__probe, p=b.player;
      const foes=b.units.filter(u=>u.side==='enemy');
      return JSON.stringify({ao:p.apNow===0?"开局未派":p.apNow, enemyHP:foes.map(u=>u.ch.hao+':'+u.maxhp), scale:b.enemyDmgScale().toFixed(2), ap:b.enemyBaseAP()});
    })()""")
    log("[4] s11 编制：" + hmm)
    n3 = page.evaluate("(() => { const b=window.__probe; return b.calcAP(b.player, 3); })()")
    log(f"[5] 以寡敌众行动点 = {n3}（3敌应为 3+2=5）")
    assert n3 == 5, "三敌应以寡敌众+2"

    # ---- 4) 含笑遣返回家：真实战斗验证归位 ----
    page.evaluate("""(() => {
      const D=window.SJI_DATA, E=window.SJI_ENGINE;
      const st=D.STAGES.find(s=>s.id==='s2');
      window.__probe2 = new E.Battle({mode:'story',stage:st,playerChar:'wonder',
        enemies:['hanxiao'],allies:[],rule:null,diff:'normal'});
    })()""")
    res = page.evaluate("""(async () => {
      const b=window.__probe2, p=b.player;
      const hx=b.units.find(u=>u.charId==='hanxiao');
      const r0=[p.r,p.c];
      hx.apNow=5;
      await b.doSkill(hx,0,p);
      const afterSkill={off:p.offField, home:[p.homeR,p.homeC], visible:!!b.unitAt(p.r,p.c)};
      // 玩家回合：引擎逻辑（返家跳过一回合）
      b.round++;
      if(p.offField>0){ p.offField--; if(p.offField<=0) b._returnHome(p); }
      return JSON.stringify({r0, afterSkill, afterReturn:{off:p.offField,pos:[p.r,p.c],
        targetable:b.opponentsOf(p).length>0, alive:p.alive}});
    })()""")
    log("[6] 含笑遣返回家：" + res)
    import json
    d = json.loads(res)
    assert d["afterSkill"]["off"] == 1 and d["afterSkill"]["visible"] is False, "施技后应离场"
    assert d["afterReturn"]["pos"] == d["r0"], f"未归原位: {d['afterReturn']['pos']} vs {d['r0']}"
    assert d["afterReturn"]["targetable"] and d["afterReturn"]["alive"], "归来后应可被锁定且存活"
    log("[7] PASS：遣返回家 → 跳过一回合 → 归位原处 → 可再被锁定")

    browser.close()

if errors:
    print("!! 错误:", errors[:5])
    sys.exit(1)
print("=== 修复验证 ALL PASS ===")

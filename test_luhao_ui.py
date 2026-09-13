# -*- coding: utf-8 -*-
"""鲁豪数值验证（20血 / 仅刀击翻倍 / 锦绣昼行 / 无行动点惩罚）"""
import sys, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
    pg.on("console", lambda m: errors.append("console:" + m.text[:160]) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate("window.SJI_DEBUG.fast = true; window.SJI_DEBUG.skipScenes = true")
    pg.evaluate("window.SJI_SAVE.setSetting('speed', 3)")

    # [1] 图鉴：鲁豪条目
    pg.click("#btn-codex"); pg.wait_for_selector("#screen-codex.on")
    pg.evaluate("""(() => {
      const cards=[...document.querySelectorAll('#codex-grid .char-card')];
      const c=cards.find(x=>x.textContent.includes('刘鲁豪'));
      c.click();
    })()""")
    pg.wait_for_selector("#modal-mask.on")
    txt = pg.text_content("#modal-box")
    assert "血20" in txt or "血 20" in txt, "图鉴未显示20血: " + txt[:60]
    assert "刀击数值翻倍" in txt, "被动未更新"
    assert "行动点" not in txt.split("锦绣昼行")[0].split("大腹如斗")[1], "不应有行动点惩罚"
    assert "锦绣昼行" in txt, "技能未更新"
    print("[1] 图鉴：20血 / 大腹如斗(仅刀击翻倍) / 锦绣昼行 — OK")
    pg.evaluate("document.querySelector('#m-close').click()")

    # [2] 实战：解锁鲁豪 → 乱斗选他 → 刀击造成 2 点、马踢 3 点
    pg.evaluate("window.SJI_SAVE.unlockChars(['luhao'])")
    pg.evaluate("window.SJI_UI.showScreen('title')")
    pg.evaluate("document.querySelector('#btn-free').click()")
    pg.wait_for_selector("#screen-free.on")
    pg.evaluate("""(() => {
      const c=[...document.querySelectorAll('#free-pgrid .char-card')].find(x=>x.textContent.includes('刘鲁豪'));
      if (!c) throw new Error('pgrid 无刘鲁豪（未解锁？）');
      c.click();
      document.querySelector('#free-egrid .char-card').click();
    })()""")
    pg.evaluate("document.querySelector('#free-go').click()")
    pg.wait_for_selector("#screen-battle.on")
    pg.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=20000)
    out = pg.evaluate("""(async () => {
      const b=window.SJI.battle, p=b.player, E=window.SJI_ENGINE;
      const t=b.opponentsOf(p)[0];
      const spot=[[t.r+1,t.c],[t.r-1,t.c],[t.r,t.c+1],[t.r,t.c-1]].find(([r,c])=>E.inB(r,c)&&!b.unitAt(r,c));
      if(!spot) return JSON.stringify({err:'无相邻空位'});
      p.r=spot[0];p.c=spot[1];p.rx=p.c;p.ry=p.r;
      if(!E.adj(p,t)) return JSON.stringify({err:'未贴身'});
      p.hasKnife=true; p.apNow=9;
      const hp0=t.hp;
      await b.doKnife(p,t);
      const d1=hp0-t.hp;
      const hp1=t.hp;
      p.hasHorse=true;
      const dHorse=b.calcDamage(p,t,3,{type:'horse'});
      const apNoPenalty=b.calcAP(p,4);
      return JSON.stringify({player:p.ch.name, hp:p.maxhp, knifeDmg:d1, horseDmg:dHorse, apNoPenalty, enemyHP:hp1});
    })()""")
    print("[2] 实战：" + out)
    d = json.loads(out)
    assert "err" not in d, d.get("err")
    assert d["hp"] == 20, f"血上限非20: {d['hp']}"
    assert d["knifeDmg"] == 2, f"刀击非2: {d['knifeDmg']}"
    assert d["horseDmg"] == 3, f"马踢非3: {d['horseDmg']}"
    assert d["apNoPenalty"] == 4, f"行动点应无惩罚: {d['apNoPenalty']}"
    print("[3] PASS：鲁豪 20血，刀击2（翻倍），马踢3（不翻倍），无行动点惩罚")
    b.close()

if errors:
    print("!! 错误:", errors[:4]); sys.exit(1)
print("=== 鲁豪数值验证 ALL PASS ===")

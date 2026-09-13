# -*- coding: utf-8 -*-
"""浏览器验证：本轮体验改进（撤销 / 点敌看图鉴 / 敌方行动点 / 自动猜拳 / 动效 / 存读档 / 续战）"""
import sys, time, json
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
errors = []

def log(m): print(m, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
    pg.on("console", lambda m: errors.append("console:" + m.text[:160]) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate("window.SJI_DEBUG.fast = true")
    pg.evaluate("window.SJI_SAVE.setSetting('speed', 3)")

    def pump(seconds, stop=None, kill=False, end_turn=False):
        end = time.time() + seconds
        while time.time() < end:
            if stop and pg.evaluate(stop): return True
            if pg.evaluate("!!document.querySelector('#dlg-skip')"):
                pg.evaluate("document.querySelector('#dlg-skip').click()"); pg.wait_for_timeout(120); continue
            if pg.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')"):
                pg.click("#modal-box .rps-btn")
                try: pg.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=8000)
                except Exception: pass
                continue
            if pg.evaluate("window.SJI.battle && window.SJI.battle._playerPhaseActive===true"):
                if kill: pg.evaluate("window.SJI_DEBUG.killEnemies()")
                if end_turn:
                    pg.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
                    pg.evaluate("document.querySelector('#b-wait').click()")
                pg.wait_for_timeout(140); continue
            pg.wait_for_timeout(120)
        return False

    # ---- 设置页三项（猜拳/动效/存档）----
    pg.click("#btn-settings"); pg.wait_for_selector("#screen-settings.on")
    for sel, val in (("#set-rps", "auto"), ("#set-fx", "lite")):
        pg.click(f"{sel} button[data-v='{val}']")
    assert pg.evaluate("window.SJI_SAVE.settings.rpsMode") == "auto", "猜拳设置未写入"
    assert pg.evaluate("window.SJI_SAVE.settings.fx") == "lite", "动效设置未写入"
    log("[1] 设置页：猜拳=自动、动效=精简 — OK")

    # ---- 存档导出/导入 ----
    pg.evaluate("window.SJI_SAVE.clearStage('s0')")
    pg.click("#set-export"); pg.wait_for_selector("#modal-mask.on")
    exported = pg.evaluate("document.querySelector('#save-box').value")
    assert '"progress"' in exported and len(exported) > 40, "导出内容异常"
    pg.click("#m-close2")
    pg.click("#set-reset"); pg.wait_for_selector("#modal-mask.on"); pg.click("#m-yes")
    pg.wait_for_timeout(200)
    assert pg.evaluate("window.SJI_SAVE.clearedCount()") == 0, "焚稿失败"
    pg.click("#set-import"); pg.wait_for_selector("#modal-mask.on")
    pg.evaluate("t => { document.querySelector('#imp-box').value = t; }", exported)
    pg.click("#m-yes2")
    pg.wait_for_timeout(1200)   # 导入后会 reload
    pg.wait_for_load_state("networkidle")
    assert pg.evaluate("window.SJI_SAVE.clearedCount()") >= 1, "导入后进度未恢复"
    log("[2] 存档导出/导入/焚稿 — OK（导入后进度恢复）")

    # ---- 自动猜拳：开战后不应出现猜拳弹窗 ----
    pg.evaluate("window.SJI_DEBUG.skipScenes = true")
    pg.evaluate("window.SJI_SAVE.setSetting('rpsMode','auto'); window.SJI_SAVE.setSetting('fx','full')")
    pg.evaluate("window.SJI_UI.showScreen('title')")
    pg.evaluate("document.querySelector('#btn-free').click()")
    pg.wait_for_selector("#screen-free.on")
    pg.evaluate("document.querySelector('#free-pgrid .char-card').click()")
    pg.evaluate("document.querySelector('#free-egrid .char-card').click()")
    pg.evaluate("document.querySelector('#free-go').click()")
    pg.wait_for_selector("#screen-battle.on")
    got_rps = pg.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')")
    pg.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=20000)
    time.sleep(0.8)
    still_rps = pg.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')")
    assert not still_rps, "自动猜拳仍弹出猜拳窗口"
    log("[3] 自动猜拳：无猜拳弹窗，直接进入玩家回合 — OK")

    # ---- 敌方行动点显示 ----
    ap_dots = pg.evaluate("document.querySelectorAll('#enemy-list .ap-mini').length")
    log(f"[4] 敌军列表行动点圆点数量 = {ap_dots}")
    assert ap_dots > 0, "未显示敌方行动点"

    # ---- 撤销按钮 ----
    pg.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
    mv = pg.evaluate("""(() => {
      const b=window.SJI.battle, p=b.player, E=window.SJI_ENGINE;
      const reach=b._reachable(p, b.moveRange(p));
      const k=reach.keys.find(k=>{const [r,c]=k.split(',').map(Number); return !b.unitAt(r,c)&&!(r===p.r&&c===p.c);});
      const [r,c]=k.split(',').map(Number);
      window.__mv=[r,c];
      return JSON.stringify([r,c]);
    })()""")
    r, c = json.loads(mv)
    pos = pg.evaluate(f"""(() => {{
      const cv=document.querySelector('#battle-canvas'), rect=cv.getBoundingClientRect();
      const CS=window.SJI_ENGINE.SIZE*96+40, TILE=96, PAD=20;
      return {{x: rect.left+(PAD+{c}*TILE+TILE/2)*rect.width/CS, y: rect.top+(PAD+{r}*TILE+TILE/2)*rect.height/CS}};
    }})()""")
    before = pg.evaluate("(()=>{const p=window.SJI.battle.player;return [p.r,p.c,p.apNow];})()")
    pg.mouse.click(pos["x"], pos["y"])
    pg.wait_for_timeout(300)
    after = pg.evaluate("(()=>{const p=window.SJI.battle.player;return [p.r,p.c,p.apNow];})()")
    assert after[:2] == [r, c], f"移动未生效 {after} vs {[r,c]}"
    log(f"[5] 画布移动 {before[:2]} → {after[:2]}（AP {before[2]}→{after[2]}）")
    undo_enabled = pg.evaluate("!document.querySelector('#b-undo').disabled")
    assert undo_enabled, "撤销按钮未启用"
    pg.click("#b-undo")
    pg.wait_for_timeout(300)
    undone = pg.evaluate("(()=>{const p=window.SJI.battle.player;return [p.r,p.c,p.apNow];})()")
    assert undone == before, f"撤销未还原 {undone} vs {before}"
    log(f"[6] 撤销移动：回到 {undone[:2]}，行动点退还为 {undone[2]} — OK")

    # ---- 点敌军看图鉴 ----
    # 先确保处于玩家阶段且无弹层（否则点击会被遮罩拦下）
    pg.wait_for_function("() => window.SJI.battle._playerPhaseActive===true", timeout=15000)
    assert not pg.evaluate("document.querySelector('#modal-mask').classList.contains('on')"), "点击前有弹层未关"
    pg.evaluate("""(() => {
      const b=window.SJI.battle, p=b.player;
      const t=b.opponentsOf(p)[0];
      const spot=[[t.r+1,t.c],[t.r-1,t.c],[t.r,t.c+1],[t.r,t.c-1]].find(([rr,cc])=>b.passable(rr,cc));
      if (spot) { p.r=spot[0]; p.c=spot[1]; p.rx=p.c; p.ry=p.r; }
    })()""")
    pg.wait_for_timeout(300)
    tgt = pg.evaluate("""(() => {
      const b=window.SJI.battle, p=b.player, t=b.opponentsOf(p)[0];
      const cv=document.querySelector('#battle-canvas'), rect=cv.getBoundingClientRect();
      const CS=window.SJI_ENGINE.SIZE*96+40, TILE=96, PAD=20;
      return JSON.stringify({x: rect.left+(PAD+t.c*TILE+TILE/2)*rect.width/CS, y: rect.top+(PAD+t.r*TILE+TILE/2)*rect.height/CS, name:t.ch.name});
    })()""")
    td = json.loads(tgt)
    has_card = False
    for attempt in range(3):
        # 画布点击前必须确保画布完整在视口内（此前的按钮点击可能把页面滚下去）
        pg.evaluate("window.scrollTo(0, 0)")
        pg.wait_for_timeout(150)
        rect_ok = pg.evaluate("""(() => {
          const r=document.querySelector('#battle-canvas').getBoundingClientRect();
          return r.top >= 0 && r.left >= 0;
        })()""")
        if not rect_ok:
            pg.evaluate("document.querySelector('#battle-canvas').scrollIntoView({block:'start'})")
            pg.wait_for_timeout(200)
        td2 = json.loads(pg.evaluate("""(() => {
          const b=window.SJI.battle, p=b.player, t=b.opponentsOf(p)[0];
          const cv=document.querySelector('#battle-canvas'), rect=cv.getBoundingClientRect();
          const CS=window.SJI_ENGINE.SIZE*96+40, TILE=96, PAD=20;
          return JSON.stringify({x: rect.left+(PAD+t.c*TILE+TILE/2)*rect.width/CS, y: rect.top+(PAD+t.r*TILE+TILE/2)*rect.height/CS});
        })()"""))
        pg.mouse.click(td2["x"], td2["y"])
        try:
            pg.wait_for_selector("#modal-box h3", timeout=2500)
            has_card = True
            break
        except Exception:
            time.sleep(0.4)
    card_title = pg.text_content("#modal-box h3").strip() if has_card else ""
    assert has_card and td["name"] in card_title, f"点敌未弹出图鉴（第{attempt+1}次）：{card_title!r}"
    log(f"[7] 点敌军弹出图鉴：「{card_title.strip()}」— OK")
    pg.evaluate("document.querySelector('#m-close').click()")

    # ---- 续战：产生快照 → 回标题 → 继续上局 ----
    pg.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
    pg.evaluate("document.querySelector('#b-wait').click()")
    pg.wait_for_timeout(2500)   # 让引擎跑完一回合并写下断点
    snap = pg.evaluate("!!window.SJI_SAVE.loadBattle()")
    assert snap, "回合末未写断点"
    rnd0 = pg.evaluate("window.SJI.battle.round")
    pg.evaluate("window.SJI_UI.showScreen('title'); window.SJI_UI.boot ? null : null")
    pg.evaluate("document.querySelector('#b-exit').click()")
    pg.wait_for_selector("#screen-title.on")
    pg.wait_for_timeout(300)
    resume_visible = pg.evaluate("document.querySelector('#btn-resume').style.display !== 'none'")
    assert resume_visible, "标题页未显示『继续上局』"
    pg.click("#btn-resume")
    pg.wait_for_selector("#screen-battle.on", timeout=15000)
    rnd1 = pg.evaluate("window.SJI.battle.round")
    log(f"[8] 断点续战：快照回合 {rnd0} → 续战回合 {rnd1}（应相等）— OK")
    assert rnd1 == rnd0, f"续战回合不符 {rnd1} vs {rnd0}"
    assert pg.evaluate("window.SJI.battle.player.alive") is True, "续战后玩家异常"

    # ---- 动效开关不报错 ----
    for lv in ("lite", "off", "full"):
        pg.evaluate(f"window.SJI_SAVE.setSetting('fx','{lv}')")
        pg.wait_for_timeout(400)
    log("[9] 动效三档切换（精简/关闭/全效）无异常 — OK")

    # ---- 结算页列出本场成就 ----
    pg.evaluate("window.SJI_SAVE.setSetting('fx','full')")
    pg.evaluate("window.SJI_DEBUG.killEnemies()")
    pump(30, stop="() => !!document.querySelector('#screen-result.on')", kill=True, end_turn=True)
    pg.wait_for_selector("#screen-result.on", timeout=20000)
    body = pg.text_content("#result-body")
    has_ach_block = "本场新解锁" in body
    log(f"[10] 结算页成就清单：{'有' if has_ach_block else '无（本场无新成就时属正常）'}")
    pg.screenshot(path="D:/code/shiji-madao/testshots/16-result-ach.png")
    b.close()

if errors:
    print("!! 错误:", errors[:5]); sys.exit(1)
print("=== 体验改进验证 ALL PASS ===")

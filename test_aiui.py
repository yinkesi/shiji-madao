# -*- coding: utf-8 -*-
"""验证：AI 进攻性设置项（持久化/显示/实际生效）"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
errors = []
with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width":1280,"height":900})
    pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
    pg.on("console", lambda m: errors.append("console:"+m.text[:200]) if m.type=="error" else None)
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate("window.SJI_DEBUG.fast = true; window.SJI_DEBUG.skipScenes = true")
    pg.evaluate("window.SJI_SAVE.setSetting('speed', 3)")

    # 1) 设置页有四档，可切换并写入
    pg.click("#btn-settings"); pg.wait_for_selector("#screen-settings.on")
    opts = pg.evaluate("[...document.querySelectorAll('#set-aiaggr button')].map(b=>b.dataset.v)")
    assert opts == ["passive","measured","active","frenzy"], f"档位不对: {opts}"
    pg.click("#set-aiaggr button[data-v='frenzy']")
    v = pg.evaluate("window.SJI_SAVE.settings.aiAggr")
    desc = pg.text_content("#set-aiaggr-desc")
    assert v == "frenzy", "未写入 frenz y"
    assert "狂攻" in desc, "说明未更新"
    print("[1] 设置页四档可切换，写入 =", v, "| 说明:", desc[:22] + "…")

    # 2) 刷新后持久化
    pg.reload(); pg.wait_for_load_state("networkidle")
    v2 = pg.evaluate("window.SJI_SAVE.settings.aiAggr")
    assert v2 == "frenzy", "未持久化"
    pg.click("#btn-settings"); pg.wait_for_selector("#screen-settings.on")
    on = pg.evaluate("document.querySelector(\"#set-aiaggr button[data-v='frenzy']\").classList.contains('on')")
    assert on, "刷新后未高亮"
    print("[2] 刷新后持久化并高亮 OK")

    # 3) 出征后战场顶栏显示档位，且战斗 cfg 生效
    pg.evaluate("window.SJI_UI.showScreen('title')")
    pg.evaluate("document.querySelector('#btn-free').click()")
    pg.wait_for_selector("#screen-free.on")
    pg.evaluate("document.querySelector('#free-pgrid .char-card').click()")
    pg.evaluate("document.querySelector('#free-egrid .char-card').click()")
    pg.evaluate("document.querySelector('#free-go').click()")
    pg.wait_for_selector("#screen-battle.on")
    pg.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=20000)
    aggr = pg.evaluate("window.SJI.battle.aiAggr")
    label = pg.text_content("#ai-label")
    assert aggr == "frenzy", f"cfg 未携带: {aggr}"
    assert "狂攻" in label, f"顶栏未显示: {label}"
    print(f"[3] 战场生效：battle.aiAggr={aggr}，顶栏「{label}」")

    # 4) 切到消极再打一场，确认配置随设置变化
    pg.evaluate("window.SJI.battle.over = true")
    pg.evaluate("window.SJI_UI.showScreen('title')")
    pg.click("#btn-settings"); pg.wait_for_selector("#screen-settings.on")
    pg.click("#set-aiaggr button[data-v='passive']")
    pg.evaluate("window.SJI_UI.showScreen('title')")
    pg.evaluate("document.querySelector('#btn-free').click()")
    pg.wait_for_selector("#screen-free.on")
    pg.evaluate("document.querySelector('#free-pgrid .char-card').click()")
    pg.evaluate("document.querySelector('#free-egrid .char-card').click()")
    pg.evaluate("document.querySelector('#free-go').click()")
    pg.wait_for_selector("#screen-battle.on")
    pg.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=20000)
    aggr2 = pg.evaluate("window.SJI.battle.aiAggr")
    prof = pg.evaluate("JSON.stringify(window.SJI.battle.aiProfile())")
    assert aggr2 == "passive", f"未切到消极: {aggr2}"
    print(f"[4] 切档后新战斗生效：aiAggr={aggr2}，档位参数={prof}")
    b.close()

if errors:
    print("!! 错误:", errors[:4]); sys.exit(1)
print("=== AI 进攻性设置验证 ALL PASS ===")

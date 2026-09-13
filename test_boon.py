# -*- coding: utf-8 -*-
"""回归：生存模式增益选择 不得被猜拳弹窗覆盖（含慢速玩家场景）"""
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
    page.evaluate("window.SJI_DEBUG.fast = true; window.SJI_DEBUG.skipScenes = true")
    page.evaluate("window.SJI_SAVE.setSetting('speed', 3)")

    # 进入生存模式
    page.click("#btn-survival")
    page.wait_for_selector("#screen-charselect.on")
    page.click("#charselect-grid .char-card:nth-child(4)")
    page.click("#cs-go")
    page.wait_for_selector("#screen-battle.on")
    page.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=20000)
    log("[1] 生存模式开局 OK")

    # 第 1 波 → 增益：故意等 4 秒（模拟玩家慢慢阅读三个选项）
    for wave in (2, 3, 4):
        # 等到可以击杀（可能在猜拳弹窗或玩家阶段）
        page.wait_for_function("""() => {
          const b=window.SJI.battle;
          return b.over || b._playerPhaseActive===true || !!document.querySelector('#modal-mask.on .rps-btn');
        }""", timeout=30000)
        if page.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')"):
            page.click("#modal-box .rps-btn")
            page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=10000)
            page.wait_for_function("() => window.SJI.battle._playerPhaseActive===true", timeout=20000)
        page.evaluate("window.SJI_DEBUG.killEnemies()")
        # 结束玩家回合（波次切换发生在回合末结算里）
        page.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
        page.evaluate("document.querySelector('#b-wait').click()")
        page.wait_for_selector("#modal-mask.on .boon-b", timeout=30000)
        boon_n = page.evaluate("document.querySelectorAll('#modal-mask.on .boon-b').length")
        assert boon_n == 3, f"增益选项数不对: {boon_n}"
        log(f"[{wave}] 增益弹窗出现（3 选项），故意等待 4 秒观察是否被顶掉…")
        # —— 关键断言：静置 4 秒后，增益弹窗必须还在、且没有被猜拳替换 ——
        page.wait_for_timeout(4000)
        still_boon = page.evaluate("!!document.querySelector('#modal-mask.on .boon-b')")
        has_rps = page.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')")
        assert still_boon, "增益弹窗在等待期间消失了"
        assert not has_rps, "增益弹窗被猜拳弹窗覆盖了（本次修复的 bug 复现）"
        log(f"    静置4秒后：增益仍在={still_boon}，猜拳未插队={not has_rps} ✓")
        # 再等 3 秒，双保险
        page.wait_for_timeout(3000)
        assert page.evaluate("!!document.querySelector('#modal-mask.on .boon-b')"), "更长等待后增益消失"
        # 现在才点选增益
        page.click("#modal-box .boon-b")
        page.wait_for_function(f"() => window.SJI.battle.survivalWaveNo >= {wave}", timeout=20000)
        log(f"    点选后进入第 {page.evaluate('window.SJI.battle.survivalWaveNo')} 波 ✓")

    # 波次确实生成了新敌人
    foes = page.evaluate("window.SJI.battle.living('enemy').length")
    assert foes > 0, "新波次未生成敌人"
    log(f"[5] 第 4 波敌人已入场：{foes} 名")
    page.screenshot(path="D:/code/shiji-madao/testshots/15-survival-boon.png")
    browser.close()

if errors:
    print("!! 错误:", errors[:5]); sys.exit(1)
print("=== 生存增益弹窗回归 ALL PASS（含 7 秒静置）===")

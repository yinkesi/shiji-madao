# -*- coding: utf-8 -*-
"""验证：剧情多波次关卡（卷一：大哥→神人→仙女）波次切换正常 + 胜利结算"""
import sys, time
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

URL = "file:///D:/code/shiji-madao/index.html"
errors = []
dlg = 0

def log(m): print(m, flush=True)

with sync_playwright() as p:
    b = p.chromium.launch(channel="msedge", headless=True)
    pg = b.new_page(viewport={"width": 1280, "height": 900})
    pg.on("pageerror", lambda e: errors.append(str(e)[:200]))
    pg.on("console", lambda m: errors.append("console:" + m.text[:160]) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_load_state("networkidle")
    pg.evaluate("window.SJI_DEBUG.fast = true")
    pg.evaluate("window.SJI_SAVE.setSetting('speed', 3)")
    pg.evaluate("window.SJI_SAVE.clearStage('s0'); window.SJI_SAVE.markPrologue()")
    pg.reload(); pg.wait_for_load_state("networkidle")
    pg.evaluate("window.SJI_DEBUG.fast = true")

    pg.click("#btn-story"); pg.wait_for_selector("#screen-story.on")
    pg.evaluate("""(() => {
      const cards=[...document.querySelectorAll('.stage-card:not(.locked)')];
      const c = cards.find(x => x.textContent.includes('三异能者')) || cards[0];
      c.click();
    })()""")

    def pump(seconds, stop=None, kill=True, end_turn=True):
        """通用泵：处理对话/猜拳/玩家阶段，直到 stop() 为真或超时"""
        global dlg
        end = time.time() + seconds
        while time.time() < end:
            if stop and pg.evaluate(stop):
                return True
            if pg.evaluate("!!document.querySelector('#dlg-skip')"):
                pg.evaluate("document.querySelector('#dlg-skip').click()")
                dlg += 1
                pg.wait_for_timeout(120)
                continue
            if pg.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')"):
                pg.click("#modal-box .rps-btn")
                try:
                    pg.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=8000)
                except Exception:
                    pass
                continue
            if pg.evaluate("window.SJI.battle && window.SJI.battle._playerPhaseActive===true"):
                if kill:
                    pg.evaluate("window.SJI_DEBUG.killEnemies()")
                if end_turn:
                    pg.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
                    pg.evaluate("document.querySelector('#b-wait').click()")
                pg.wait_for_timeout(150)
                continue
            pg.wait_for_timeout(120)
        return False

    pump(20, stop="() => !!document.querySelector('#modal-mask.on')", kill=False, end_turn=False)
    pg.evaluate("document.querySelector('#m-go').click()")
    pg.wait_for_selector("#screen-charselect.on")
    pg.click("#charselect-grid .char-card:nth-child(6)")
    pg.evaluate("document.querySelector('#cs-go').click()")
    pg.wait_for_selector("#screen-battle.on")
    # 先跳过战前对话剧，直到第 1 回合开始
    pump(30, stop="() => window.SJI.battle && window.SJI.battle.round >= 1", kill=False, end_turn=False)
    assert pg.evaluate("window.SJI.battle.round >= 1"), "第1回合未开始"
    log("[开局] 战前对话已过，进入第 1 回合")

    first_wave = pg.evaluate("window.SJI.battle.living('enemy').map(u => u.ch.hao).join('、')")
    log(f"[波1] 敌人：{first_wave}")
    total_waves = pg.evaluate("window.SJI.battle.waves.length")
    log(f"[编制] 该关共 {total_waves} 波：{pg.evaluate('JSON.stringify(window.SJI.battle.waves)')}")

    # 打完整关（连续清波，直到胜利）
    pump(60, stop="() => window.SJI.battle.over === true")
    assert pg.evaluate("window.SJI.battle.over"), "战斗未结束"

    state = pg.evaluate("""(() => {
      const b = window.SJI.battle;
      return JSON.stringify({
        over: b.over, result: b.result, waveIndex: b.waveIndex, round: b.round,
        killed: b.stats.kills,
        triggersFired: b.triggers.filter(t => t.fired).map(t => t.when + ':' + (t.wave || t.round || t.char || '')),
        logWaves: b.log.filter(l => l.indexOf('下一阵') >= 0).length
      });
    })()""")
    log("[引擎状态] " + state)
    import json
    st = json.loads(state)
    assert st["result"] == "win", f"结果 {st['result']}"
    assert st["waveIndex"] == total_waves - 1, f"最终波索引 {st['waveIndex']}（应 {total_waves-1}）"
    assert st["killed"] >= 3, f"击破数 {st['killed']}"
    assert st["logWaves"] >= total_waves - 1, f"波次切换次数不足 {st['logWaves']}"
    assert len(st["triggersFired"]) >= 2, f"战中触发台词未全部触发：{st['triggersFired']}"
    log(f"[PASS] 三波次全部推进（waveIndex {st['waveIndex']}，击破 {st['killed']}，触发台词 {st['triggersFired']}）")

    ok = pump(40, stop="() => !!document.querySelector('#screen-result.on')")
    assert ok, "未能抵达结算页"
    seal = pg.text_content(".result-seal").strip()
    assert "胜" in seal, f"判印 {seal}"
    log(f"[结算] 判印「{seal}」，对话 {dlg} 场")
    b.close()

if errors:
    print("!! 错误:", errors[:4]); sys.exit(1)
print("=== 剧情多波次关卡 ALL PASS（三波次依次登场）===")

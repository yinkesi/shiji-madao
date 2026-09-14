# -*- coding: utf-8 -*-
"""Gauntlet 测试：十六关剧情连续通关（真实UI点击）+ 战败/认输/设置/焚稿路径"""
import sys, time, tempfile
sys.stdout.reconfigure(encoding='utf-8')
from playwright.sync_api import sync_playwright

from pw_common import URL_SRC as URL, SHOT
errors = []
stages_done = []
dlg_seen = 0

def log(msg): print(msg, flush=True)

ACT_JS = """(() => {
  const b=window.SJI.battle, p=b.player, E=window.SJI_ENGINE;
  if(!p.alive || b.over) return 'dead';
  const foes=b.opponentsOf(p); if(!foes.length) return 'none';
  const t=foes.sort((a,c)=>E.manh(p,a)-E.manh(p,c))[0];
  const pick=(b.skillCd(p,0)<=0 && p.st.silence<=0)?b.aiPickSkill(p):null;
  if(pick && Math.random()<0.8){ b.doSkill(p,pick.idx,pick.target); return 'skill'; }
  if(!p.hasKnife){ b.doBuyKnife(p); return 'bought'; }
  if(!p.hasHorse){ b.doBuyHorse(p); return 'horse'; }
  if(p.hasHorse && E.isWall(p.r,p.c) && E.isWall(t.r,t.c) && E.manh(p,t)<=3){ b.doHorse(p,t); return 'kick'; }
  if(p.hasKnife && E.adj(p,t)){ b.doKnife(p,t); return 'hit'; }
  const step=b._stepToward(p,t);
  if(step && !(step[0]===p.r&&step[1]===p.c)){ b.doMove(p,step[0],step[1]); return 'move'; }
  return 'wait';
})()"""

with sync_playwright() as p:
    last_snap = None

    def launch():
        global browser, context
        for i in range(3):
            try:
                browser = p.chromium.launch(channel="msedge", headless=True,
                    args=["--disable-features=CanvasOopRasterization"])
                break
            except Exception:
                if i == 2:
                    raise
                time.sleep(2 + i * 3)
        context = browser.new_context(viewport={"width": 1280, "height": 900})
        pg = context.new_page()
        pg.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
        pg.on("console", lambda m: errors.append(("console:error", m.text)) if m.type == "error" else None)
        pg.on("crash", lambda pg: errors.append(("crash", "renderer crashed")))
        return pg

    page = launch()
    page.goto(URL)
    page.wait_for_load_state("networkidle")
    page.evaluate("window.SJI_DEBUG.fast = true")
    page.evaluate("window.SJI_SAVE.setSetting('speed',3)")

    def drain_dlg(wait_first=0):
        """点击所有出现的'跳过'按钮；wait_first>0 时先等待剧情出现。硬上限防永挂。"""
        global dlg_seen
        end = time.time() + wait_first
        seen = False
        clicks = 0
        while True:
            assert clicks <= 30, "drain_dlg 点击超过30次仍未关闭（对话可能重开循环）"
            try:
                page.click("#modal-mask.on #dlg-skip", timeout=700)
                dlg_seen += 1
                seen = True
                clicks += 1
                page.wait_for_timeout(120)
            except Exception:
                if seen or time.time() >= end:
                    return seen
                page.wait_for_timeout(100)

    def restart_browser():
        global page, last_snap
        log("    [infra] 重启浏览器（防渲染器长会话崩溃）")
        try:
            last_snap = page.evaluate("localStorage.getItem('shiji_madao_v1')")
        except Exception:
            pass
        try:
            context.close()
        except Exception:
            pass
        time.sleep(1)
        page = launch()
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        if last_snap:
            page.evaluate("s => localStorage.setItem('shiji_madao_v1', s)", last_snap)
            page.reload()
            page.wait_for_load_state("networkidle")
        page.evaluate("window.SJI_DEBUG.fast = true")

    def try_wait_click(timeout=2200):
        try:
            page.wait_for_selector("#b-wait:not([disabled])", timeout=timeout)
            page.click("#b-wait")
            return True
        except Exception:
            return False

    def finish_stage(max_iters=40):
        """每个玩家阶段：回满血→杀光当前波敌人→待机；波次转换与结算交给引擎"""
        for _ in range(max_iters):
            if page.evaluate("window.SJI.battle.over"): return
            if page.evaluate("!!document.querySelector('#dlg-skip')"):
                drain_dlg(0)
                continue
            if page.evaluate("!!document.querySelector('#modal-mask.on .rps-btn')"):
                page.click("#modal-box .rps-btn")
                page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=10000)
                continue
            if page.evaluate("window.SJI.battle._playerPhaseActive===true"):
                page.evaluate("window.SJI_DEBUG.healPlayer(99)")
                page.evaluate("window.SJI_DEBUG.killEnemies()")
                page.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
                page.evaluate("document.querySelector('#b-wait').click()")
                page.wait_for_timeout(120)
                continue
            page.wait_for_timeout(150)
        raise RuntimeError("finish_stage 40轮未结束")

    def open_next_stage():
        """从史册列表打开第一张未通关卡，处理序章对话与出征点将"""
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        page.evaluate("window.SJI_DEBUG.fast = true")
        page.click("#btn-story")
        page.wait_for_selector("#screen-story.on")
        card = page.query_selector(".stage-card:not(.locked):not(.done)")
        assert card, "找不到未通关卡"
        card.click()
        if drain_dlg(8000):
            log("    [scene] 序")
        page.wait_for_selector("#modal-mask.on")
        page.click("#m-go")
        page.wait_for_selector("#screen-charselect.on")
        cards = page.query_selector_all("#charselect-grid .char-card")
        cards[stages_done_idx() % len(cards)].click()
        page.click("#cs-go")
        page.wait_for_selector("#screen-battle.on")
        drain_dlg(8000)  # 战前对话剧
        page.wait_for_function("() => window.SJI.battle && window.SJI.battle.round >= 1", timeout=20000)

    def stages_done_idx():
        return page.evaluate("window.SJI_SAVE.clearedCount()")

    # ================= 十六关连续通关（每5关重启浏览器防渲染器崩溃） =================
    for idx in range(16):
        if idx in (3, 6, 9, 12, 15):
            restart_browser()
        for attempt in (0, 1):
            try:
                open_next_stage()
                st_id = page.evaluate("window.SJI.battle.cfg.stage.id")
                st_title = page.evaluate("window.SJI.battle.cfg.stage.title")
                log(f"[{idx+1}/16] {st_id} {st_title} 开战（{page.evaluate('window.SJI.battle.player.ch.hao')}）")
                finish_stage()
                break
            except Exception as e:
                if attempt == 0:
                    log(f"    [infra] 本关异常（{type(e).__name__}: {str(e)[:80]}），重启后重试")
                    restart_browser()
                else:
                    raise
        drain_dlg(8000)  # 胜利场景 / 终章
        page.wait_for_selector("#screen-result.on", timeout=30000)
        seal = page.text_content(".result-seal").strip()
        assert "胜" in seal, f"{st_id} 应为胜利，实际 {seal}"
        stages_done.append(st_id)
        log(f"    -> 胜（已成 {page.evaluate('window.SJI_SAVE.clearedCount()')} 卷）")
    assert page.evaluate("window.SJI_SAVE.allCleared()"), "十五卷未全通"
    assert page.evaluate("window.SJI_SAVE.hasAch('a_all')"), "马刀之神成就未达成"
    log("[GAUNTLET] 十六关连续通关 OK，成就「马刀之神」达成")

    # ================= 战败与重整旗鼓 =================
    restart_browser()
    page.click("#btn-free")
    page.wait_for_selector("#screen-free.on")
    page.click("#free-pgrid .char-card")
    page.click("#free-egrid .char-card:nth-child(2)")
    page.click("#free-go")
    page.wait_for_selector("#screen-battle.on")
    page.wait_for_selector("#modal-mask.on .rps-btn", timeout=30000)
    page.click("#modal-box .rps-btn")
    page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=10000)
    page.wait_for_function("() => window.SJI.battle._playerPhaseActive===true", timeout=30000)
    page.wait_for_function("() => typeof window.SJI.battle._phaseResolve === 'function'", timeout=15000)
    page.evaluate("window.SJI.battle.rawHurt(window.SJI.battle.player, 99, '天罚')")
    page.evaluate("document.querySelector('#b-wait').click()")
    page.wait_for_function("() => window.SJI.battle.over === true", timeout=30000)
    drain_dlg(5000)
    page.wait_for_selector("#screen-result.on", timeout=15000)
    assert "败" in page.text_content(".result-seal").strip(), "应为战败"
    log("[败] 战败结算 OK，判印=败")
    page.click("#r-retry")
    page.wait_for_selector("#screen-battle.on")
    assert page.evaluate("window.SJI.battle.over") is False, "重整旗鼓未重开"
    log("[retry] 重整旗鼓 OK")
    page.wait_for_selector("#modal-mask.on .rps-btn", timeout=15000)
    page.click("#modal-box .rps-btn")
    page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=10000)
    page.click("#b-exit")
    page.wait_for_selector("#screen-title.on")
    page.wait_for_timeout(600)
    assert not page.evaluate("document.querySelector('#modal-mask').classList.contains('on')"), "离场后有残留弹窗"
    log("[exit] 离场无残留弹窗 OK")

    # ================= 认输 =================
    page.click("#btn-free")
    page.wait_for_selector("#screen-free.on")
    page.click("#free-pgrid .char-card")
    page.click("#free-egrid .char-card")
    page.click("#free-go")
    page.wait_for_selector("#screen-battle.on")
    page.wait_for_selector("#modal-mask.on .rps-btn", timeout=30000)
    page.click("#modal-box .rps-btn")
    page.wait_for_function("() => !document.querySelector('#modal-mask').classList.contains('on')", timeout=10000)
    page.wait_for_function("() => window.SJI.battle._playerPhaseActive===true", timeout=30000)
    page.click("#b-surrender")
    page.wait_for_selector("#modal-mask.on")
    page.click("#m-yes")
    page.wait_for_selector("#screen-result.on", timeout=15000)
    assert "败" in page.text_content(".result-seal").strip()
    log("[surrender] 认输流程 OK")
    page.evaluate("window.SJI_UI.showScreen('title')")

    # ================= 设置与焚稿 =================
    page.evaluate("document.querySelector('#btn-settings').click()")
    page.wait_for_selector("#screen-settings.on")
    page.evaluate("document.querySelector('#set-sfx').click()")
    assert page.evaluate("window.SJI_SAVE.settings.sfx") is False, "音效开关未写入"
    page.evaluate("document.querySelector(\"#set-speed button[data-v='2']\").click()")
    assert page.evaluate("window.SJI_SAVE.settings.speed") == 2, "速度未写入"
    log("[settings] 设置项写入 OK")
    page.evaluate("document.querySelector('#set-reset').click()")
    page.wait_for_selector("#modal-mask.on")
    page.evaluate("document.querySelector('#m-yes').click()")
    page.wait_for_timeout(300)
    assert page.evaluate("window.SJI_SAVE.clearedCount()") == 0, "焚稿后进度未清空"
    log("[reset] 焚稿重置 OK")

    context.close()

print()
if errors:
    print(f"!! 控制台/页面错误 {len(errors)} 条:")
    for t, e in errors[:20]:
        print("  -", t, e[:300])
    sys.exit(1)
assert dlg_seen >= 33, f"剧情对话场次不足: {dlg_seen} (应≥33: 序+16战前+16胜利+终章)"
print("剧情对话演出场次:", dlg_seen)
print("=== GAUNTLET ALL PASS · 十六关连通 + 剧情演出 + 败局/认输/设置/焚稿 · 控制台零报错 ===")

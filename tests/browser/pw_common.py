# -*- coding: utf-8 -*-
"""浏览器层（Playwright + Edge 无头）测试的共享基座。

原先「启动浏览器 → 挂错误采集 → 打开页面 → 注入调试开关」这段样板在
各 test_*.py 里各复制一份，路径还硬编码了本机 D:/ 盘符；现收敛于此，
各测试只保留自己的操作与断言流程。

用法：
    from playwright.sync_api import sync_playwright
    from pw_common import URL_SRC, URL_BUNDLE, SHOT, errors, log, open_page, finish

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="msedge")
        pg = open_page(browser, URL_SRC, fast=True, skip_scenes=True)
        ...
        browser.close()
    finish("XX 测试")
"""
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parents[2]
URL_SRC = (ROOT / "index.html").as_uri()
URL_BUNDLE = (ROOT / "实验史记·马刀风云.html").as_uri()
SHOT = str(ROOT / "testshots")  # 截图输出目录（已 gitignore）

errors = []  # pageerror / console.error 收集，测试结尾用 finish() 检查


def log(m):
    print(m, flush=True)


def watch(page):
    """挂上 pageerror / console.error 采集（写入本模块的 errors）。"""
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)[:200]))
    page.on("console", lambda m: errors.append("console: " + m.text[:160]) if m.type == "error" else None)


def open_page(browser, url=URL_SRC, *, fast=True, skip_scenes=False, speed=3):
    """按统一规格开页：1280×900、错误采集、networkidle、调试开关与速度档。

    fast/skip_scenes 对应 window.SJI_DEBUG 开关；speed=None 时不动速度设置。
    """
    pg = browser.new_page(viewport={"width": 1280, "height": 900})
    watch(pg)
    pg.goto(url)
    pg.wait_for_load_state("networkidle")
    flags = []
    if fast:
        flags.append("window.SJI_DEBUG.fast = true")
    if skip_scenes:
        flags.append("window.SJI_DEBUG.skipScenes = true")
    if flags:
        pg.evaluate("; ".join(flags))
    if speed is not None:
        pg.evaluate(f"window.SJI_SAVE.setSetting('speed', {speed})")
    return pg


def finish(title):
    """统一收尾：有错误则打印并 exit 1，否则打印总结。"""
    if errors:
        print("!! 错误:", errors[:5])
        sys.exit(1)
    print(f"=== {title} ALL PASS ===")

#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""一键测试入口：引擎层（秒级）→ 断言层 → 浏览器层（分钟级）。
用法:
    python run_tests.py          # 引擎层+断言层（快速）
    python run_tests.py --full   # 加上浏览器端到端与长链回归（慢）
"""
import subprocess, sys, time, os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

ENGINE = [
    (sys.executable.replace("python.exe","node.exe") if False else "node", ["stress.mjs"], "引擎全量压力"),
    ("node", ["test_features.mjs"], "新功能专项"),
    ("node", ["test_status.mjs"], "状态计时回归"),
    ("node", ["test_bugfix.mjs"], "修复断言"),
    ("node", ["test_review.mjs"], "体检修复断言"),
    ("node", ["test_extreme.mjs"], "极难模式专项"),
    ("node", ["test_versus.mjs"], "双人对战引擎"),
]
BROWSER = [
    (sys.executable, ["test_e2e.py"], "端到端（源码版）"),
    (sys.executable, ["test_bundle.py"], "端到端（打包版）"),
    (sys.executable, ["test_ux.py"], "体验改进 11 项"),
    (sys.executable, ["test_fixui.py"], "遣返回场归位"),
    (sys.executable, ["test_boon.py"], "生存增益抗覆盖"),
    (sys.executable, ["test_wave_story.py"], "剧情多波次"),
    (sys.executable, ["test_aiui.py"], "AI 进攻性设置"),
    (sys.executable, ["test_luhao_ui.py"], "鲁豪数值"),
]

def run(cmd_list, label, timeout):
    t0 = time.time()
    r = subprocess.run(cmd_list, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    ok = (r.returncode == 0)
    print(("  PASS  " if ok else "  FAIL  ") + label + f"  ({time.time()-t0:.0f}s)")
    if not ok:
        tail = (r.stdout or r.stderr or "").strip().splitlines()
        for line in tail[-4:]:
            print("         " + line[:160])
    return ok

def main():
    full = "--full" in sys.argv
    results = []
    print("== 引擎层 ==")
    for cmd, args, label in ENGINE:
        results.append((label, run([cmd] + args, label, 400)))
    if full:
        print("== 浏览器层 ==")
        for cmd, args, label in BROWSER:
            results.append((label, run([cmd] + args, label, 500)))
    bad = [name for name, ok in results if not ok]
    print()
    if bad:
        print("!! 失败：" + "、".join(bad)); sys.exit(1)
    print(f"=== 全部 {len(results)} 项通过 ===")

if __name__ == "__main__":
    main()

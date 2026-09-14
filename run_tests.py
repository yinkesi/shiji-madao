#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""一键测试入口。

分层（可叠加）:
    python run_tests.py          # 快速层：确定性引擎断言（约 1 分钟）
    python run_tests.py --stat   # + 统计层：胜率/行为模拟（分钟级，轻微随机）
    python run_tests.py --full   # + 浏览器层：Playwright + Edge 无头端到端（分钟级）
    python run_tests.py --slow   # + 重型层：全量压测、十六关连续通关（约 10 分钟）

CI 只跑快速层 + 单文件包新鲜度检查（见 .github/workflows/ci.yml）。
测试文件在 tests/engine（Node 直跑引擎，无浏览器）与 tests/browser（真实 UI）。
"""
import subprocess, sys, time, os

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)

NODE = "node"
PY = sys.executable

# 快速层：确定性断言，随机成分不影嚮判定（fuzz 只查崩溃/不变量）
ENGINE = [
    (NODE, ["tests/engine/test_features.mjs"], "新功能专项"),
    (NODE, ["tests/engine/test_status.mjs"], "状态计时回归"),
    (NODE, ["tests/engine/test_bugfix.mjs"], "修复断言"),
    (NODE, ["tests/engine/test_review.mjs"], "体检修复断言"),
    (NODE, ["tests/engine/test_extreme.mjs"], "极难模式专项"),
    (NODE, ["tests/engine/test_bugs2.mjs"], "Bug 探针 1-7"),
    (NODE, ["tests/engine/test_bugs3.mjs"], "Bug 探针 8-12"),
    (NODE, ["tests/engine/test_luhao.mjs"], "鲁豪数值"),
    (NODE, ["tests/engine/test_fuzz.mjs", "40"], "模糊测试(40场)"),
]
# 统计层：多场对局模拟，输出胜率表并断言聚合行为（较耗时）
STAT = [
    (NODE, ["tests/engine/test_balance.mjs"], "全角色平衡模拟"),
    (NODE, ["tests/engine/test_duel.mjs"], "角色对战胜率"),
    (NODE, ["tests/engine/test_aiaggr.mjs"], "AI 进攻性四档"),
]
# 浏览器层：真实 UI 回归（依赖本机 Edge + playwright）
BROWSER = [
    (PY, ["tests/browser/test_e2e.py"], "端到端（源码版+打包版）"),
    (PY, ["tests/browser/test_ux.py"], "体验改进回归"),
    (PY, ["tests/browser/test_fixui.py"], "遣返回场归位"),
    (PY, ["tests/browser/test_boon.py"], "生存增益抗覆盖"),
    (PY, ["tests/browser/test_wave_story.py"], "剧情多波次"),
    (PY, ["tests/browser/test_aiui.py"], "AI 进攻性设置"),
    (PY, ["tests/browser/test_luhao_ui.py"], "鲁豪数值 UI"),
]
# 重型层：单跑就要好几分钟
SLOW = [
    (NODE, ["tests/engine/stress.mjs"], "引擎全量压力"),
    (PY, ["tests/browser/test_gauntlet.py"], "十六关连续通关"),
]


def run(cmd_list, label, timeout):
    t0 = time.time()
    r = subprocess.run(cmd_list, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=timeout)
    ok = (r.returncode == 0)
    print(("  PASS  " if ok else "  FAIL  ") + label + f"  ({time.time()-t0:.0f}s)", flush=True)
    if not ok:
        tail = (r.stdout or r.stderr or "").strip().splitlines()
        for line in tail[-4:]:
            print("         " + line[:160])
    return ok


def main():
    argv = sys.argv[1:]
    tiers = [("== 快速层 ==", ENGINE, 400)]
    if "--stat" in argv:
        tiers.append(("== 统计层 ==", STAT, 900))
    if "--full" in argv:
        tiers.append(("== 浏览器层 ==", BROWSER, 900))
    if "--slow" in argv:
        tiers.append(("== 重型层 ==", SLOW, 1800))
    results = []
    for title, cases, tmo in tiers:
        print(title, flush=True)
        for cmd, args, label in cases:
            results.append((label, run([cmd] + args, label, tmo)))
    bad = [name for name, ok in results if not ok]
    print()
    if bad:
        print("!! 失败：" + "、".join(bad)); sys.exit(1)
    print(f"=== 全部 {len(results)} 项通过 ===")


if __name__ == "__main__":
    main()

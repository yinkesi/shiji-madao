/* ============================================================
 * 实验史记 · 马刀风云 —— 存档（localStorage）
 * ============================================================ */
window.SJI_SAVE = (function () {
  "use strict";
  const KEY = "shiji_madao_v1";
  const DEF = {
    progress: {},          // stageId -> true
    unlocked: { dage: true },  // 已立传（可操作）角色
    charWins: {},          // charId -> 胜场数（角色挑战成就）
    ach: {},               // achId -> true
    bestSurvival: 0,
    totals: { moves: 0, heals: 0, kills: 0, wins: 0, losses: 0 },
    settings: { sfx: true, music: true, speed: 1, aiAggr: "active", rpsMode: "ask", fx: "full", ngPlus: false }
  };
  let data = load();
  let achLog = [];

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEF));
      const d = JSON.parse(raw);
      return Object.assign(JSON.parse(JSON.stringify(DEF)), d, {
        totals: Object.assign({}, DEF.totals, d.totals || {}),
        settings: Object.assign({}, DEF.settings, d.settings || {})
      });
    } catch (e) { return JSON.parse(JSON.stringify(DEF)); }
  }
  function persist() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }

  return {
    get data() { return data; },
    get settings() { return data.settings; },
    isCleared(id) { return !!data.progress[id]; },
    allCleared() { return window.SJI_DATA.STAGES.every(s => !!data.progress[s.id]); },
    clearedCount() { return Object.keys(data.progress).length; },
    clearStage(id) { data.progress[id] = true; persist(); },
    hasAch(id) { return !!data.ach[id]; },
    unlockAch(id) {
      if (data.ach[id]) return false;
      data.ach[id] = true; persist();
      achLog.push(id);
      const a = window.SJI_DATA.ACHIEVEMENTS.find(x => x.id === id);
      if (a && window.SJI_UI) window.SJI_UI.toast("成就达成 「" + a.name + "」：" + a.desc);
      return true;
    },
    bump(k, n) { data.totals[k] = (data.totals[k] || 0) + (n || 1); persist(); },
    bumpCharWin(cid) {
      if (!data.charWins) data.charWins = {};
      data.charWins[cid] = (data.charWins[cid] || 0) + 1;
      persist();
    },
    allCharsWon() {
      const w = data.charWins || {};
      return window.SJI_DATA.PLAYABLE.every(c => (w[c] || 0) > 0);
    },
    setBestSurvival(n) { if (n > data.bestSurvival) { data.bestSurvival = n; persist(); return true; } return false; },
    setSetting(k, v) { data.settings[k] = v; persist(); },
    markPrologue() { data.prologueSeen = true; persist(); },

    /* ---- 角色解锁：击败谁就为谁立传 ---- */
    isUnlocked(cid) {
      if (data.settings.ngPlus) return true;          // 二周目全解锁
      if (!data.unlocked) data.unlocked = { dage: true };
      return !!data.unlocked[cid];
    },
    unlockChars(list) {
      if (!data.unlocked) data.unlocked = { dage: true };
      let fresh = [];
      for (const cid of list || []) {
        if (!data.unlocked[cid]) { data.unlocked[cid] = true; fresh.push(cid); }
      }
      if (fresh.length) persist();
      return fresh;
    },
    /* 旧存档迁移：按已通关关卡补算解锁（不含初始角色之外的无主角色） */
    migrateUnlocks() {
      if (data.unlocked) return;
      data.unlocked = { dage: true };
      const D = window.SJI_DATA;
      for (const st of D.STAGES) {
        if (data.progress[st.id] && st.unlocks) for (const cid of st.unlocks) data.unlocked[cid] = true;
      }
      persist();
    },

    /* ---- 成就：本场解锁记录（供结算页展示） ---- */
    beginAchLog() { achLog = []; },
    takeAchLog() { const l = achLog.slice(); achLog = []; return l; },

    /* ---- 循环存档导出 / 导入 ---- */
    exportJSON() { return JSON.stringify(data); },
    importJSON(txt) {
      try {
        const obj = JSON.parse(txt);
        if (!obj || typeof obj !== "object" || !obj.settings) return { ok: false, err: "内容不是本游戏的存档" };
        data = Object.assign(JSON.parse(JSON.stringify(DEF)), obj, {
          totals: Object.assign({}, DEF.totals, obj.totals || {}),
          settings: Object.assign({}, DEF.settings, obj.settings || {})
        });
        persist();
        return { ok: true };
      } catch (e) { return { ok: false, err: "无法解析：" + e.message }; }
    },

    /* ---- 战斗中断点续战 ---- */
    saveBattle(snap) { try { localStorage.setItem(KEY + "_battle", JSON.stringify(snap)); } catch (e) {} },
    loadBattle() {
      try { const raw = localStorage.getItem(KEY + "_battle"); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    },
    clearBattle() { try { localStorage.removeItem(KEY + "_battle"); } catch (e) {} },
    reset() { data = JSON.parse(JSON.stringify(DEF)); persist(); }
  };
})();

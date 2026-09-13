/* ============================================================
 * 实验史记 · 马刀风云 —— 启动与调试钩子
 * ============================================================ */
window.SJI = {
  get settings() { return window.SJI_SAVE.settings; },
  battle: null
};

window.SJI_DEBUG = {
  fast: false,          // 快进动画
  skipScenes: false,    // 跳过全部剧情对话
  autoRps: false,       // 自动猜拳
  get battle() { return window.SJI.battle; },
  killEnemies() {       // 秒杀当前敌人（由引擎回合末自然结算）
    const b = window.SJI.battle;
    if (!b || b.over) return "no battle";
    b.living("enemy").slice().forEach(u => b.rawHurt(u, u.hp, "天降正义"));
    return "ok";
  },
  healPlayer(n) {
    const b = window.SJI.battle;
    if (b) { b.player.hp = Math.min(b.player.maxhp, b.player.hp + (n || 99)); b.pushLog("（神迹）「" + b.player.ch.hao + "」回复了血。"); return "ok"; }
    return "no battle";
  },
  giveAll() {           // 刀马全给
    const b = window.SJI.battle;
    if (!b) return "no battle";
    b.player.hasKnife = true; b.player.hasHorse = true;
    return "ok";
  }
};

document.addEventListener("DOMContentLoaded", () => {
  window.SJI_UI.boot();
});

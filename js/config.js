/* ============================================================
 * 实验史记 · 马刀风云 —— 配置中心（单一事实来源）
 * 所有可调参数集中于此：网格尺寸、规则常量、难度表、AI 档位、
 * 击破回血、以寡敌众补偿、敌方血量缩放、种树上限。
 * 改平衡只改这里；engine.js / ui.js 只读取。
 * ============================================================ */
window.SJI_CONFIG = (function () {
  "use strict";

  /* ---------- 网格 ---------- */
  const GRID = {
    SIZE: 7,        // 7×7
    TILE: 96,       // 单格像素
    PAD: 20         // 画布内边距
  };
  GRID.CS = GRID.SIZE * GRID.TILE + GRID.PAD * 2;   // 画布边长

  /* ---------- 规则常量（卷八《马刀书》＋运营性补充） ---------- */
  const RULES = {
    RPS_AP: { win: 4, draw: 3, lose: 2 },   // 猜拳胜/和/负 的行动点
    MAX_ROUND: 30,                          // 单场回合上限（超出按血量比例判定/判负）
    KILL_HEAL_BASE: 2,                      // 击破基础回血（极难为 0；「庆功之宴」+2）
    OUTNUMBER: { apPer: 1, apCap: 3, hpPer: 1, hpCap: 2 },  // 以寡敌众补偿
    SAC_MIN_HP: 2,
    AP_CAP: 8,                          // 血祭所需最低血量（无「以道代血」时）
    TREE_CAP: 3,                            // 崇国场上树木上限（树木皆死）
    BLOOD_FREE_BOON: "b_bloodfree"          // 使血祭免损血的增益 id
  };

  /* ---------- 难度表 ----------
   * apSolo / apBig : 敌方行动点（1–2 名敌人 / 3 名以上）
   * dmgMul         : 敌方伤害倍率（叠加在按人数的基础缩放之上）
   * hpExtra        : 敌方血量额外倍率（剧情/生存）
   * killHeal       : 玩家击破回血基础值
   * forceFrenzy    : 强制敌方 AI 使用「狂攻」档
   */
  const DIFFICULTY = {
    easy:    { apSolo: 2, apBig: 1, dmgMul: 0.70, hpExtra: 1.00, killHeal: 2, forceFrenzy: false },
    normal:  { apSolo: 3, apBig: 2, dmgMul: 1.00, hpExtra: 1.00, killHeal: 2, forceFrenzy: false },
    hard:    { apSolo: 4, apBig: 2, dmgMul: 1.15, hpExtra: 1.00, killHeal: 2, forceFrenzy: false },
    extreme: { apSolo: 5, apBig: 3, dmgMul: 1.35, hpExtra: 1.25, killHeal: 0, forceFrenzy: true }
  };

  /* 敌方按人数的基础伤害缩放（以少打多为常态，人多则单体递减） */
  const DMG_BY_COUNT = { 1: 0.90, 2: 0.88, 3: 0.75, 4: 0.65 };
  /* 剧情/生存敌方血量按人数缩放（乱斗模式另有难度倍率） */
  const HP_BY_COUNT = { 1: 1.00, 2: 0.85, 3: 0.70, 4: 0.62 };
  const SURVIVAL_HP_EXTRA = 0.90;           // 生存模式敌方血量额外系数
  const FREE_HP_MULT = { easy: 0.8, normal: 1, hard: 1.2, extreme: 1.35 };  // 乱斗血量倍率

  /* ---------- AI 进攻性档位 ----------
   * skill   : 技能使用意愿（会叠加角色 aggr 微调）
   * sac     : 血祭倾向
   * retreat : 残血（≤34%）撤退概率
   * keep    : 逡巡不前概率（远离目标）
   * focus   : 目标选择 nearest=最近 weakest=残血优先
   * horse   : 买马意愿
   */
  const AI_AGGR = {
    passive:  { skill: 0.35, sac: 0.04, retreat: 0.70, keep: 0.55, focus: "nearest", horse: 0.30 },
    measured: { skill: 0.65, sac: 0.20, retreat: 0.35, keep: 0.25, focus: "nearest", horse: 0.70 },
    active:   { skill: 0.90, sac: 0.40, retreat: 0.10, keep: 0, focus: "weakest", horse: 1.0 },
    frenzy:   { skill: 1.00, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1.0 }
  };
  const AI_LABEL = { passive: "消极", measured: "守成", active: "主动", frenzy: "狂攻" };
  const AI_ALLY = AI_AGGR.active;   // 友军固定「主动」，避免拖累玩家

  /* ---------- 画布 ---------- */
  const CANVAS = {
    TILE: GRID.TILE, PAD: GRID.PAD, CS: GRID.CS,
    TOKEN_R: 29,          // 单位半径
    HP_BAR_W: 56,         // 血条宽
    PARTICLE_CAP: 320     // 粒子池上限
  };

  return {
    GRID, RULES, DIFFICULTY, DMG_BY_COUNT, HP_BY_COUNT, SURVIVAL_HP_EXTRA,
    FREE_HP_MULT, AI_AGGR, AI_LABEL, AI_ALLY, CANVAS
  };
})();

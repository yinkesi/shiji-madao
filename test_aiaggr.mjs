import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
window.SJI_SAVE = { bump: () => {}, data: { totals: {} }, settings: {} };
window.SJI_UI = { onLog: () => {}, onState: () => {}, snap: () => {}, fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
  rpsRound: async () => ({ res: 'win', ap: 3 }), playerPhase: async () => {}, pickBoon: async () => null, onBattleEnd: () => {}, banner: async () => {} };
window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
window.SJI = { settings: { speed: 3 } };
require('./js/data.js');
const D = window.SJI_DATA;
require('./js/engine.js');
const E = window.SJI_ENGINE;

/* 让敌人在固定条件下行动 20 次，统计行为差异 */
async function profile(charId, aggr, rounds = 20) {
  let skillUse = 0, drewBlood = 0, moved = 0, retreated = 0, idle = 0, dmgDealt = 0, horse = 0;
  for (let i = 0; i < rounds; i++) {
    const b = new E.Battle({ mode: 'free', playerChar: 'wonder', enemies: [charId], diff: 'normal', aiAggr: aggr });
    const foe = b.units.find(u => u.side === 'enemy');
    const p = b.player;
    // 玩家站在角落不动，血量充足，给敌人连续 4 回合行动
    const origLog = b.pushLog.bind(b);
    let movedThis = false;
    b.pushLog = (t) => {
      if (t.includes('施「')) skillUse++;
      if (t.includes('血祭')) drewBlood++;
      if (t.includes('退避三舍')) retreated++;
      if (t.includes('逡巡不前')) idle++;
      origLog(t);
    };
    for (let rd = 0; rd < 4 && !b.over; rd++) {
      p.hp = p.maxhp;
      foe.apNow = b.enemyBaseAP();
      const before = [foe.r, foe.c];
      const php = p.hp;
      await b.aiAct(foe);
      if (foe.r !== before[0] || foe.c !== before[1]) movedThis = true;
      dmgDealt += Math.max(0, php - p.hp);
      if (foe.hasHorse) horse++;
    }
    if (movedThis) moved++;
  }
  return { aggr, skill: skillUse, sac: drewBlood, moved, retreat: retreated, idle, dmg: dmgDealt };
}

console.log('AI 进攻性四档行为对比（同一角色 wonder，各 20 次试验 × 4 回合）');
console.log('档位      用技  血祭  移动  退避  逡巡  总伤害');
const rows = [];
for (const a of ['passive', 'measured', 'active', 'frenzy']) {
  const r = await profile('wonder', a);
  rows.push(r);
  console.log(`${a.padEnd(9)} ${String(r.skill).padStart(3)} ${String(r.sac).padStart(5)} ${String(r.moved).padStart(5)} ${String(r.retreat).padStart(5)} ${String(r.idle).padStart(5)} ${String(r.dmg).padStart(6)}`);
}

const byId = Object.fromEntries(rows.map(r => [r.aggr, r]));
console.log('\n断言：');
function check(name, cond) { console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}`); if (!cond) process.exitCode = 1; }
check('狂攻用技 ≥ 消极用技', byId.frenzy.skill >= byId.passive.skill);
check('狂攻血祭 > 消极血祭', byId.frenzy.sac > byId.passive.sac);
check('狂攻总伤害 > 消极总伤害', byId.frenzy.dmg > byId.passive.dmg);
check('消极会逡巡/退避', byId.passive.idle + byId.passive.retreat > 0);
check('狂攻不逡巡（keep=0）', byId.frenzy.idle === 0);
check('四档伤害单调不降', byId.passive.dmg <= byId.measured.dmg && byId.measured.dmg <= byId.frenzy.dmg);
process.exit(process.exitCode || 0);

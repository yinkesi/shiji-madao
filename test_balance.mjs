import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
window.SJI_SAVE = { bump: () => {}, data: { totals: {} }, settings: {} };
window.SJI_UI = { onLog: () => {}, onState: () => {}, snap: () => {}, fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
  rpsRound: async () => ({ res: 'win', ap: 4 }), playerPhase: async () => {}, pickBoon: async () => null, onBattleEnd: () => {}, banner: async () => {} };
window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
window.SJI = { settings: { speed: 3 } };
require('./js/data.js');
const D = window.SJI_DATA;
require('./js/engine.js');
const E = window.SJI_ENGINE;

/* 统一的玩家机器人：能打就打、打不到就逼近，技能/血祭按通用逻辑 */
async function bot(b) {
  const p = b.player;
  let guard = 0;
  while (p.apNow > 0 && guard++ < 16 && !b.over && p.alive && p.offField <= 0) {
    const foes = b.opponentsOf(p);
    if (!foes.length) break;
    const t = foes.slice().sort((a, c) => (a.hp + E.manh(p, a) * 0.7) - (c.hp + E.manh(p, c) * 0.7))[0];
    if (b.skillCd(p, 0) <= 0 && p.st.silence <= 0) {
      const pick = b.aiPickSkill(p);
      if (pick && Math.random() < 0.8) { await b.doSkill(p, pick.idx, pick.target); continue; }
    }
    if (!p.hasKnife) { await b.doBuyKnife(p); continue; }
    if (!p.hasHorse && Math.random() < 0.6) { await b.doBuyHorse(p); continue; }
    const adjacent = foes.filter(f => E.adj(p, f));
    if (p.hp >= 6 && adjacent.length && t.hp <= 4 && p.st.bloodlust <= 0 && Math.random() < 0.45) { await b.doSacrifice(p); continue; }
    if (p.hasHorse && E.isWall(p.r, p.c) && E.isWall(t.r, t.c) && E.manh(p, t) <= 3) { await b.doHorse(p, t); continue; }
    if (p.hasKnife && p.st.seal <= 0 && adjacent.length) { await b.doKnife(p, adjacent[0]); continue; }
    const reach = b._reachable(p, b.moveRange(p));
    let bestKey = null, bestScore = -1e9;
    for (const key of reach.keys) {
      const [r, c] = key.split(',').map(Number);
      if (b.unitAt(r, c) || (r === p.r && c === p.c)) continue;
      const near = foes.filter(f => Math.max(Math.abs(f.r - r), Math.abs(f.c - c)) <= 1).length;
      const d = Math.abs(r - t.r) + Math.abs(c - t.c);
      const sc = -d * 2 - near * 3;
      if (sc > bestScore) { bestScore = sc; bestKey = key; }
    }
    if (bestKey) { const [r, c] = bestKey.split(',').map(Number); await b.doMove(p, r, c); continue; }
    break;
  }
}
window.SJI_UI.playerPhase = bot;

/* 三档中立对手：1/2/3 个路人（不引入其他角色强度差异） */
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const SCENARIOS = [
  { name: '1敌', enemies: ['mob'] },
  { name: '2敌', enemies: ['mob', 'mob'] },
  { name: '3敌', enemies: ['mob', 'mob', 'mob'] }
];
const TRIALS = 8;

async function score(cid) {
  let win = 0, total = 0, rounds = 0;
  const detail = [];
  for (const sc of SCENARIOS) {
    let w = 0;
    for (let i = 0; i < TRIALS; i++) {
      const b = new E.Battle({ mode: 'free', playerChar: cid, enemies: sc.enemies.slice(), diff: 'normal', aiAggr: 'active' });
      // 玩家方固定猜拳胜（4动）以降低方差
      window.SJI_UI.rpsRound = async () => ({ res: 'win', ap: 4 });
      try { await b.run(); } catch (e) { console.log('  ERR', cid, e.message); }
      if (b.result === 'win') { w++; win++; }
      total++; rounds += b.round;
    }
    detail.push(sc.name + ':' + w + '/' + TRIALS);
  }
  return { cid, win, total, rate: win / total, avgRounds: rounds / total, detail: detail.join(' ') };
}

console.log('角色对战模拟（中立对手 1/2/3 个路人，各3次，玩家猜拳固定胜）');
console.log('角色            总胜率    均回合  明细');
const rows = [];
for (const cid of (ONLY.length ? ONLY : D.PLAYABLE)) {
  const r = await score(cid);
  rows.push(r);
  const nm = D.CHARACTERS[cid].name + '(' + D.CHARACTERS[cid].hao + ')';
  console.log(`${nm.padEnd(16)} ${(r.rate * 100).toFixed(0).padStart(4)}%   ${r.avgRounds.toFixed(1).padStart(5)}   ${r.detail}`);
}
rows.sort((a, b) => a.rate - b.rate);
console.log('\n最弱五名：' + rows.slice(0, 5).map(r => D.CHARACTERS[r.cid].hao + ' ' + (r.rate * 100).toFixed(0) + '%').join('  '));
console.log('最强五名：' + rows.slice(-5).reverse().map(r => D.CHARACTERS[r.cid].hao + ' ' + (r.rate * 100).toFixed(0) + '%').join('  '));
process.exit(0);

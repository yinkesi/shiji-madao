import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
window.SJI_SAVE = { bump: () => {}, data: { totals: {} }, settings: {} };
window.SJI_UI = { onLog: () => {}, onState: () => {}, snap: () => {}, fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
  rpsRound: async () => ({ res: 'win', ap: 4 }), playerPhase: async () => {}, pickBoon: async () => null, onBattleEnd: () => {}, banner: async () => {} };
window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
window.SJI = { settings: { speed: 3 } };
require('./js/config.js');
require('./js/data.js');
const D = window.SJI_DATA;
require('./js/engine.js');
const E = window.SJI_ENGINE;

async function bot(b) {
  const p = b.player;
  let guard = 0;
  while (p.apNow > 0 && guard++ < 16 && !b.over && p.alive && p.offField <= 0) {
    const foes = b.opponentsOf(p);
    if (!foes.length) break;
    const t = foes.slice().sort((a, c) => (a.hp + E.manh(p, a) * 0.7) - (c.hp + E.manh(p, c) * 0.7))[0];
    if (b.skillCd(p, 0) <= 0 && p.st.silence <= 0) { const k = b.aiPickSkill(p); if (k && Math.random() < 0.8) { await b.doSkill(p, k.idx, k.target); continue; } }
    if (!p.hasKnife) { await b.doBuyKnife(p); continue; }
    if (!p.hasHorse && Math.random() < 0.6) { await b.doBuyHorse(p); continue; }
    const adj = foes.filter(f => E.adj(p, f));
    if (p.hp >= 6 && adj.length && t.hp <= 4 && p.st.bloodlust <= 0 && Math.random() < 0.45) { await b.doSacrifice(p); continue; }
    if (p.hasHorse && E.isWall(p.r, p.c) && E.isWall(t.r, t.c) && E.manh(p, t) <= 3) { await b.doHorse(p, t); continue; }
    if (p.hasKnife && p.st.seal <= 0 && adj.length) { await b.doKnife(p, adj[0]); continue; }
    const reach = b._reachable(p, b.moveRange(p));
    let bk = null, bs = -1e9;
    for (const key of reach.keys) {
      const [r, c] = key.split(',').map(Number);
      if (b.unitAt(r, c) || (r === p.r && c === p.c)) continue;
      const near = foes.filter(f => Math.max(Math.abs(f.r - r), Math.abs(f.c - c)) <= 1).length;
      const sc = -(Math.abs(r - t.r) + Math.abs(c - t.c)) * 2 - near * 3;
      if (sc > bs) { bs = sc; bk = key; }
    }
    if (bk) { const [r, c] = bk.split(',').map(Number); await b.doMove(p, r, c); continue; }
    break;
  }
}
window.SJI_UI.playerPhase = bot;

const OPPONENTS = [
  { name: '仙子(2伤远程)', ids: ['xiannv'] },
  { name: '头哥(毒AOE)', ids: ['touge'] },
  { name: '只因(免死)', ids: ['guyin'] },
  { name: '小川(缴械)', ids: ['xiaochuan'] },
  { name: '两人组', ids: ['touge', 'guyin'] }
];
const N = 6;
const CHARS = process.argv[2] ? process.argv[2].split(',') : ['luhao', 'xiannv', 'touge', 'guyin', 'lifan', 'xiaochuan'];

console.log('对真实角色的胜率（每组合6场）：');
console.log('角色'.padEnd(14) + OPPONENTS.map(o => o.name.padEnd(16)).join('') + '  合计');
for (const cid of CHARS) {
  const cells = [];
  let win = 0, tot = 0;
  for (const op of OPPONENTS) {
    let w = 0;
    for (let i = 0; i < N; i++) {
      const b = new E.Battle({ mode: 'free', playerChar: cid, enemies: op.ids.slice(), diff: 'normal', aiAggr: 'active' });
      window.SJI_UI.rpsRound = async () => ({ res: 'win', ap: 4 });
      try { await b.run(); } catch (e) {}
      if (b.result === 'win') { w++; win++; }
      tot++;
    }
    cells.push((w + '/' + N).padEnd(16));
  }
  const nm = D.CHARACTERS[cid].name + '(' + D.CHARACTERS[cid].hao + ')';
  console.log(nm.padEnd(14) + cells.join('') + '  ' + (win / tot * 100).toFixed(0) + '%');
}
process.exit(0);

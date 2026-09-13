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

const want = process.argv[2] || 's8';
const st = D.STAGES.find(s => s.id === want);
console.log('=== ' + st.id + ' ' + st.title + ' 诊断 ===');
console.log('敌方: ' + st.enemies.join(',') + ' | 友军: ' + ((st.allies||[]).join(',') || '无') + ' | 波次: ' + JSON.stringify(st.waves || '无'));
for (const ch of ['wonder', 'touge', 'dazhan', 'luhao']) {
  let reached = [], wins = 0;
  for (let i = 0; i < 6; i++) {
    const b = new E.Battle({ mode: 'story', stage: st, playerChar: ch, enemies: st.enemies, allies: st.allies || [], rule: st.rule, waves: st.waves, diff: 'normal' });
    const origNext = b._nextWave.bind(b);
    b._nextWave = async function () { reached.push('过第' + (this.waveIndex + 1) + '阵(血' + this.player.hp + ')'); return origNext(); };
    window.SJI_UI.rpsRound = async () => { const r = Math.random(); return r < 0.4 ? { res: 'win', ap: 4 } : (r < 0.75 ? { res: 'draw', ap: 3 } : { res: 'lose', ap: 2 }); };
    await b.run();
    if (b.result === 'win') wins++;
  }
  const pass1 = reached.filter(x => x.startsWith('过第1阵')).length;
    const pass2 = reached.filter(x => x.startsWith('过第2阵')).length;
    console.log(`${D.CHARACTERS[ch].name}(${D.CHARACTERS[ch].hao}) 胜 ${wins}/6 | 过第1阵 ${pass1}/6 过第2阵 ${pass2}/6`);
}
process.exit(0);

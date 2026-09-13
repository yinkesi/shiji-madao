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

/* 随机化机器人：乱走乱打乱用技，尽量制造极端状态 */
async function chaosBot(b) {
  const p = b.player;
  let guard = 0;
  while (p.apNow > 0 && guard++ < 16 && !b.over && p.alive && p.offField <= 0) {
    const foes = b.opponentsOf(p);
    if (!foes.length) break;
    const t = foes[Math.floor(Math.random() * foes.length)];
    const roll = Math.random();
    if (roll < 0.3 && b.skillCd(p, 0) <= 0) { const k = b.aiPickSkill(p); if (k) { await b.doSkill(p, k.idx, k.target); continue; } }
    if (roll < 0.4 && !p.hasKnife) { await b.doBuyKnife(p); continue; }
    if (roll < 0.5 && !p.hasHorse) { await b.doBuyHorse(p); continue; }
    if (roll < 0.55 && p.hp >= 3) { await b.doSacrifice(p); continue; }
    const adj = foes.filter(f => E.adj(p, f));
    if (roll < 0.75 && p.hasKnife && p.st.seal <= 0 && adj.length) { await b.doKnife(p, adj[0]); continue; }
    if (roll < 0.8 && p.hasHorse && E.isWall(p.r, p.c)) {
      const foe2 = foes.find(f => E.isWall(f.r, f.c) && E.manh(p, f) <= 3 + (p.boons.horseRange || 0));
      if (foe2) { await b.doHorse(p, foe2); continue; }
    }
    const reach = b._reachable(p, b.moveRange(p));
    const keys = reach.keys.filter(k => { const [r, c] = k.split(',').map(Number); return !b.unitAt(r, c) && !(r === p.r && c === p.c); });
    if (keys.length) { const [r, c] = keys[Math.floor(Math.random() * keys.length)].split(',').map(Number); await b.doMove(p, r, c); continue; }
    break;
  }
}
window.SJI_UI.playerPhase = chaosBot;

const chars = D.PLAYABLE;
const diffs = ['easy', 'normal', 'hard', 'extreme'];
const N = parseInt(process.argv[2] || '120', 10);
let problems = 0;

function invariants(b, tag) {
  const seen = new Set();
  for (const u of b.units) {
    if (!u.alive) {
      if (u.hp < 0) { console.log(`  !! ${tag} ${u.ch.name} 死亡但血量 ${u.hp}`); problems++; }
      continue;
    }
    if (u.hp > u.maxhp) { console.log(`  !! ${tag} ${u.ch.name} 血量 ${u.hp} > 上限 ${u.maxhp}`); problems++; }
    if (Number.isNaN(u.hp) || Number.isNaN(u.r) || Number.isNaN(u.c)) { console.log(`  !! ${tag} ${u.ch.name} 出现 NaN`); problems++; }
    if (u.r < 0 || u.r >= E.SIZE || u.c < 0 || u.c >= E.SIZE) { console.log(`  !! ${tag} ${u.ch.name} 越界 ${u.r},${u.c}`); problems++; }
    if (b.blocked.has(u.r + ',' + u.c)) { console.log(`  !! ${tag} ${u.ch.name} 站在障碍上 ${u.r},${u.c}`); problems++; }
    const key = u.r + ',' + u.c;
    if (seen.has(key)) { console.log(`  !! ${tag} 两单位同格 ${key}: ${[...seen].join('/')}`); problems++; }
    seen.add(key);
  }
}

console.log(`模糊测试 ${N} 场（随机角色/难度/编制，混沌机器人）…`);
for (let i = 0; i < N; i++) {
  const pc = chars[Math.floor(Math.random() * chars.length)];
  const diff = diffs[Math.floor(Math.random() * diffs.length)];
  const mode = Math.random() < 0.25 ? 'survival' : 'free';
  const nE = 1 + Math.floor(Math.random() * 3);
  const enemies = Array.from({ length: nE }, () => 'mob');
  const st = mode === 'story' || Math.random() < 0.4 ? D.STAGES[Math.floor(Math.random() * D.STAGES.length)] : null;
  const cfg = st
    ? { mode: 'story', stage: st, playerChar: pc, enemies: st.enemies, allies: st.allies || [], rule: st.rule, waves: st.waves, diff, aiAggr: diffs[Math.floor(Math.random() * 4)] }
    : { mode, playerChar: pc, enemies, diff, aiAggr: diffs[Math.floor(Math.random() * 4)] };
  let b;
  try { b = new E.Battle(cfg); } catch (e) { console.log(`!! [${i}] 构造失败 (${pc}/${diff}): ${e.message}`); problems++; continue; }
  // 混沌增益
  for (let k = 0; k < 3; k++) {
    try { b._applyBoon(b.player, D.BOONS[Math.floor(Math.random() * D.BOONS.length)]); } catch (e) { console.log(`!! [${i}] 增益: ${e.message}`); problems++; }
  }
  const rounds = [];
  let turn = 0;
  window.SJI_UI.playerPhase = async (bb) => {
    const alive = bb.living(bb.player.side);
    const u = alive[Math.floor(Math.random() * alive.length)];
    if (u) { bb.player = u; }   // 乱点任何己方单位
    await chaosBot(bb);
  };
  // 简化：只跑玩家+AI 全自动（上面的 playerPhase 已覆盖玩家）
  try {
    const r = await Promise.race([b.run(), new Promise(res => setTimeout(() => res('HANG'), 30000))]);
    if (r === 'HANG') { console.log(`!! [${i}] 30 秒未结束 (${pc}/${diff}/${mode})`); problems++; continue; }
    rounds.push(b.round);
    invariants(b, `[${i}]`);
  } catch (e) {
    console.log(`!! [${i}] 异常: ${e.stack.split('\n').slice(0, 2).join(' | ')}`);
    problems++;
  }
  if (i % 25 === 24) console.log(`  …已完成 ${i + 1}/${N}，当前问题 ${problems}`);
}
console.log(`\n模糊测试完成：${N} 场，问题 ${problems} 项`);
process.exit(problems ? 1 : 0);

import { loadEngine } from '../helpers/engine_env.mjs';
import { bots } from '../helpers/bot.mjs';
const { E, D, ui } = loadEngine();
const { chaosBot } = bots(E);
ui.playerPhase = chaosBot;


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
  ui.playerPhase = async (bb) => {
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

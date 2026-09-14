import { loadEngine } from '../helpers/engine_env.mjs';
import { bots } from '../helpers/bot.mjs';
const { E, D, ui } = loadEngine();
const { greedyBot } = bots(E);
ui.playerPhase = greedyBot;


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
      ui.rpsRound = async () => ({ res: 'win', ap: 4 });
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

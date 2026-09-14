import { loadEngine } from '../helpers/engine_env.mjs';
import { bots } from '../helpers/bot.mjs';
const { E, D, ui } = loadEngine();
const { greedyBot } = bots(E);
ui.playerPhase = greedyBot;


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
      ui.rpsRound = async () => ({ res: 'win', ap: 4 });
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

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
let fails = 0;
const check = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x !== undefined ? '  (' + x + ')' : ''}`); if (!c) fails++; };

console.log('=== 修复1：可怡应把治疗给自己人 ===');
{
  const b = new E.Battle({ mode: 'story', stage: D.STAGES.find(s => s.id === 's6'), playerChar: 'touge',
    enemies: ['dazhan', 'keai'], diff: 'normal' });
  const keai = b.units.find(u => u.charId === 'keai');
  const dz = b.units.find(u => u.charId === 'dazhan');
  const p = b.player;
  keai.r = p.r; keai.c = Math.max(0, p.c - 1);
  dz.r = p.r; dz.c = Math.min(6, p.c + 1);
  p.hp = 4; dz.hp = 3;
  keai.apNow = 5;
  const pick = b.aiPickSkill(keai);
  const tgt = pick && pick.target;
  console.log('  AI 选中目标 =', tgt ? tgt.ch.name + '(' + tgt.side + ')' : '无');
  check('目标为友军而非玩家', !!tgt && tgt.side === 'enemy');
  const beforeP = p.hp, beforeD = dz.hp;
  if (tgt) await b.doSkill(keai, pick.idx, tgt);
  console.log(`  施技后：玩家血 ${beforeP} -> ${p.hp}，大展血 ${beforeD} -> ${dz.hp}`);
  check('玩家未被治疗', p.hp === beforeP);
  check('大展被治疗', dz.hp > beforeD);
}

console.log('\n=== 修复2：全程最低血记录（成就可达性） ===');
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' });
  const p = b.player, foe = b.units.find(u => u.side === 'enemy');
  // 走真实伤害路径把血压到1（毒/撞墙等均走 rawHurt）
  b.rawHurt(p, p.maxhp - 1, '受创');
  console.log('  受伤后：当前血', p.hp, '全程最低血', b.stats.minHp);
  check('受伤路径记录最低血1', b.stats.minHp === 1, b.stats.minHp);
  p.hasKnife = true; p.apNow = 5;
  const spot = [[foe.r + 1, foe.c], [foe.r - 1, foe.c], [foe.r, foe.c + 1], [foe.r, foe.c - 1]].find(([r, c]) => E.inB(r, c) && !b.unitAt(r, c));
  p.r = spot[0]; p.c = spot[1];
  foe.hp = 1;
  await b.doKnife(p, foe);
  console.log(`  1血击杀后：当前血 ${p.hp}，全程最低血 ${b.stats.minHp}`);
  check('击杀回血后当前血为3', p.hp === 3, p.hp);
  check('全程最低血仍记为1 → 成就可达', b.stats.minHp === 1, b.stats.minHp);
  check('成就判定条件成立（minHp<=1）', b.stats.minHp !== undefined && b.stats.minHp <= 1);
}
console.log(fails === 0 ? '\n=== 体检修复 ALL PASS ===' : `\n!! ${fails} 项失败`);
process.exit(fails ? 1 : 0);

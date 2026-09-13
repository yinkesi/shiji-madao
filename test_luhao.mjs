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

const ch = D.CHARACTERS.luhao;
console.log('鲁豪属性：血', ch.hp, '| 被动', ch.passive.name, '| 技能', ch.skill.name, '(' + ch.skill.desc.slice(0, 18) + '…)');

function mk(charId, side) {
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: [charId === 'touge' ? 'mob' : 'touge'], diff: 'normal' });
  return b;
}
// 用 free 模式：敌我双方各放一个，便于对比"鲁豪"与"同攻击力基准"的伤害
function mkDuel(cid) {
  const b = new E.Battle({ mode: 'free', playerChar: cid, enemies: ['mob'], diff: 'normal' });
  return b;
}
const b = mkDuel('luhao');
const atk = b.player, def = b.units.find(u => u.side === 'enemy');
console.log('\n对比（1敌，敌方伤害缩放 x' + b.enemyDmgScale().toFixed(2) + '，此为攻方为玩家时不受缩放）：');
const d1 = b.calcDamage(atk, def, 1, { type: 'knife' });
const d3 = b.calcDamage(atk, def, 3, { type: 'horse' });
const d2 = b.calcDamage(atk, def, 2, { type: 'skill' });
console.log(`  鲁豪  刀击1 -> ${d1} | 马踢3 -> ${d3} | 技能2 -> ${d2}`);

const b2 = mkDuel('touge');
const a2 = b2.player, d2t = b2.units.find(u => u.side === 'enemy');
const n1 = b2.calcDamage(a2, d2t, 1, { type: 'knife' });
const n3 = b2.calcDamage(a2, d2t, 3, { type: 'horse' });
console.log(`  头哥  刀击1 -> ${n1} | 马踢3 -> ${n3}（基准，未翻倍）`);

let fail = 0;
function check(n, c) { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}`); if (!c) fail = 1; }
console.log('\n断言：');
check('血量 20', ch.hp === 20);
check('刀击翻倍 (1->2)', d1 === 2);
check('马踢翻倍 (3->6)', d3 === 6);
check('技能翻倍 (2->4)', d2 === 4);
check('技能唯一且为锦绣昼行', ch.skill && ch.skill.name === '锦绣昼行' && !ch.skills);
check('基准角色未翻倍', n1 === 1 && n3 === 3);
check('与血祭叠加（翻倍后再翻倍=4）', b.calcDamage(atk, def, 1, { type: 'knife' }) === 2);
process.exit(fail);

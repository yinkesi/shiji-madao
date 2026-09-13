import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
window.SJI_SAVE = { bump: () => {}, data: { totals: {} }, settings: {} };
window.SJI_UI = { onLog: () => {}, onState: () => {}, snap: () => {}, fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
  rpsRound: async () => ({ res: 'win', ap: 4 }), playerPhase: async (bb) => { bb.player.apNow = 0; },
  pickBoon: async () => null, onBattleEnd: () => {}, banner: async () => {} };
window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
window.SJI = { settings: { speed: 3 } };
require('./js/config.js');
require('./js/data.js');
const D = window.SJI_DATA;
require('./js/engine.js');
const E = window.SJI_ENGINE;

/* 真跑引擎若干个回合（玩家阶段立刻交出行动），观察状态是否按回合解除 */
async function runRounds(b, n) {
  let count = 0;
  const orig = b._checkBattleEnd.bind(b);
  b._checkBattleEnd = async () => { count++; if (count > n) { b.over = true; return; } await orig(); if (count > n) b.over = true; };
  await b.run();
}
function mk(stageId, enemies) {
  const st = D.STAGES.find(s => s.id === stageId);
  return new E.Battle({ mode: 'story', stage: st, playerChar: 'wonder',
    enemies: enemies || st.enemies, allies: st.allies || [], rule: st.rule, diff: 'normal' });
}

let fails=0;
const check=(n,c)=>{console.log(`  ${c?'PASS':'FAIL'}  ${n}`); if(!c) fails++;};
console.log('=== ① 崇国「评职称」沉默：应在玩家自己的下个回合结束时解除 ===');
{
  const b = mk('s14');
  const cg = b.units.find(u => u.charId === 'chongguo');
  const p = b.player;
  cg.apNow = 3; cg.cds = {};
  await b.doSkill(cg, 0, null);
  console.log('施技后 silence =', p.st.silence, '（玩家本回合已被封技）');
  await runRounds(b, 1);
  check('崇国沉默在玩家一个回合后解除', p.st.silence === 0);
}
console.log('\n=== ② 钦法「当场抓获」缴械：应在玩家自己的下个回合结束时解除 ===');
{
  const b = mk('s14');
  const qf = b.units.find(u => u.charId === 'qinfa');
  const p = b.player;
  qf.apNow = 3; qf.cds = {};
  await b.doSkill(qf, 0, p);
  console.log('施技后 seal =', p.st.seal);
  await runRounds(b, 1);
  check('钦法缴械在玩家一个回合后解除', p.st.seal === 0);
}
console.log('\n=== ③ 神人「原神明信片」跳过：应对玩家生效且只跳一回合 ===');
{
  const b = mk('s1', ['shenren']);
  const sr = b.units.find(u => u.charId === 'shenren');
  const p = b.player;
  sr.apNow = 3; sr.cds = {};
  await b.doSkill(sr, 0, p);
  console.log('施技后 skip =', p.st.skip);
  await runRounds(b, 1);
  check('跳过在玩家一个回合后被消耗', p.st.skip === 0);
}
console.log('\n=== ④ 缴械对 AI 是否真的拦住攻击 ===');
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' });
  const foe = b.units.find(u => u.side === 'enemy');
  foe.hasKnife = true; foe.apNow = 3; foe.st.seal = 1;
  foe.cds = { 0: 9 };   // 技能冷却中，逼其只能用刀，以便验证"缴械封刀"
  foe.r = b.player.r; foe.c = Math.max(0, b.player.c - 1);
  b.log.length = 0;
  await b.aiAct(foe);
  const knifeLog = b.log.filter(l => l.includes(foe.ch.hao) && l.includes('以刀击之')).length;
  const kickLog = b.log.filter(l => l.includes(foe.ch.hao) && l.includes('以马踢之')).length;
  console.log('被缴械的敌人行动：刀击次数 =', knifeLog, '，马踢次数 =', kickLog, '，seal 现为', foe.st.seal);
  check('缴械期间敌人不出刀（马踢不受影响，符合设定）', knifeLog === 0);
  check('敌人缴械到期后解除', foe.st.seal === 0);
}
console.log('\n=== ⑤ 沉默对 AI（友军）同样按回合解除 ===');
{
  const b = mk('s14');
  const wb = b.units.find(u => u.charId === 'weibing');
  wb.st.silence = 1;
  await b.aiAct(wb);
  check('友军沉默在其一个回合后解除', wb.st.silence === 0);
}
if (fails === 0) { console.log(''); console.log('=== 状态计时回归 ALL PASS ==='); }
else { console.log(''); console.log('!! ' + fails + ' 项失败'); }
process.exit(fails ? 1 : 0);

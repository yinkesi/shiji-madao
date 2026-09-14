import { loadEngine, checker } from '../helpers/engine_env.mjs';
const { E, D } = loadEngine();
const { check, done } = checker('极难模式专项');

const mk = (diff, enemies, mode = 'free', stage = null) => new E.Battle(
  { mode, stage, playerChar: 'touge', enemies: enemies || ['mob'], allies: stage ? (stage.allies || []) : [], rule: stage ? stage.rule : null, diff });

console.log('=== 极难：四档参数对比 ===');
{
  const rows = {};
  for (const d of ['easy', 'normal', 'hard', 'extreme']) {
    const b = mk(d, ['mob']);
    rows[d] = { ap1: b.enemyBaseAP(), dmg: b.enemyDmgScale().toFixed(2) };
  }
  const b3 = {}; for (const d of ['easy', 'normal', 'hard', 'extreme']) b3[d] = mk(d, ['mob', 'mob', 'mob']).enemyBaseAP();
  console.log('  难度     单敌AP  三敌AP  伤害倍率');
  for (const d of ['easy', 'normal', 'hard', 'extreme']) {
    console.log(`  ${d.padEnd(8)} ${String(rows[d].ap1).padStart(4)} ${String(b3[d]).padStart(7)} ${String(rows[d].dmg).padStart(9)}`);
  }
  check('极难单敌 5 动', rows.extreme.ap1 === 5, rows.extreme.ap1);
  check('极难三敌 3 动', b3.extreme === 3, b3.extreme);
  check('困难单敌 4 动（未受影响）', rows.hard.ap1 === 4, rows.hard.ap1);
  check('普通单敌 3 动（未受影响）', rows.normal.ap1 === 3, rows.normal.ap1);
  // 1.35 是叠加在"按敌人数的基础缩放"之上的难度倍率，故按同日敌数的比值验证
  const bE = mk('extreme', ['mob']), bN = mk('normal', ['mob']);
  const ratio = bE.enemyDmgScale() / bN.enemyDmgScale();
  check('极难伤害为难度的 1.35 倍', Math.abs(ratio - 1.35) < 0.001, ratio.toFixed(3));
  check('四档伤害递增', +rows.easy.dmg < +rows.normal.dmg && +rows.normal.dmg < +rows.hard.dmg && +rows.hard.dmg < +rows.extreme.dmg);
}
console.log('\n=== 极难：击破敌人不再回血（其余难度照旧）===');
{
  for (const [d, expect] of [['normal', 2], ['hard', 2], ['extreme', 0]]) {
    const b = mk(d, ['mob']);
    const p = b.player, foe = b.units.find(u => u.side === 'enemy');
    p.hp = 5; p.hasKnife = true; p.apNow = 5;
    const spot = [[foe.r + 1, foe.c], [foe.r - 1, foe.c], [foe.r, foe.c + 1], [foe.r, foe.c - 1]].find(([r, c]) => b.passable(r, c));
    p.r = spot[0]; p.c = spot[1]; p.rx = p.c; p.ry = p.r;
    foe.hp = 1;
    await b.doKnife(p, foe);
    check(`${d}：击破后回血 ${expect}`, p.hp === 5 + expect, '血量 5→' + p.hp);
  }
  // 极难下稀有增益仍能补回
  const b = mk('extreme', ['mob']);
  const p = b.player, foe = b.units.find(u => u.side === 'enemy');
  p.boons.killHeal = 2; p.hp = 5; p.hasKnife = true; p.apNow = 5;
  const spot = [[foe.r + 1, foe.c], [foe.r - 1, foe.c], [foe.r, foe.c + 1], [foe.r, foe.c - 1]].find(([r, c]) => b.passable(r, c));
  p.r = spot[0]; p.c = spot[1]; p.rx = p.c; p.ry = p.r;
  foe.hp = 1;
  await b.doKnife(p, foe);
  check('极难 + 稀有增益「庆功之宴」仍可回血 2', p.hp === 7, '血量 5→' + p.hp);
}
console.log('\n=== 极难：敌方强制死战不退（无视玩家的 AI 档位设置）===');
{
  const b = mk('extreme', ['mob']);
  b.aiAggr = 'passive';          // 玩家设置成最消极，极难应无视该设置
  check('aiProfile 本身仍反映玩家设置（覆盖发生在行动时）', b.aiProfile().retreat === 0.7, b.aiProfile().retreat);
  const foe = b.units.find(u => u.side === 'enemy');
  const p = b.player;
  p.hp = 3;
  foe.hp = 2; foe.hasKnife = true; foe.apNow = 5;
  foe.r = p.r; foe.c = Math.max(0, p.c - 1);
  b.log.length = 0;
  await b.aiAct(foe);
  const fled = b.log.some(l => l.includes('退避三舍'));
  const idled = b.log.some(l => l.includes('逡巡不前'));
  check('极难残血敌人不撤退', !fled);
  check('极难敌人不逡巡', !idled);
  check('极难残血敌人仍会出手', b.log.some(l => l.includes('以刀击之') || l.includes('以马踢之') || l.includes('施「')));
}
console.log('\n=== 极难：血量与行动点·不影响玩家侧 ===');
{
  const b = mk('extreme', ['mob']);
  check('玩家行动点不受难度影响', b.calcAP(b.player, 4) === 4, b.calcAP(b.player, 4));
  const st = D.STAGES.find(s => s.id === 's14');
  const be = mk('extreme', st.enemies, 'story', st);
  const bn = mk('normal', st.enemies, 'story', st);
  const hpE = be.units.filter(u => u.side === 'enemy').reduce((a, u) => a + u.maxhp, 0);
  const hpN = bn.units.filter(u => u.side === 'enemy').reduce((a, u) => a + u.maxhp, 0);
  console.log(`  s14 敌方总血：普通 ${hpN} → 极难 ${hpE}`);
  check('极难敌人更耐打', hpE > hpN);
  check('玩家血量不受影响', be.player.maxhp === bn.player.maxhp, be.player.maxhp);
}
console.log('\n=== 成就与界面接线 ===');
{
  const ids = D.ACHIEVEMENTS.map(a => a.id);
  check('新增极难成就 a_extreme', ids.includes('a_extreme'));
  check('新增极难成就 a_extreme_final', ids.includes('a_extreme_final'));
}
done();

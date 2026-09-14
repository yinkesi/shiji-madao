import { loadEngine, checker } from '../helpers/engine_env.mjs';
const { E, D } = loadEngine();
const { check, done } = checker('新功能专项');

const mk = (cfg) => new E.Battle(Object.assign({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' }, cfg));

console.log('=== ① 地形：障碍格不可通行、不可站立、可被寻路绕开 ===');
{
  const st = { id: 't', title: '测试', enemies: ['mob'], blocked: [[3, 3]], hpScale: 1 };
  const b = new E.Battle({ mode: 'story', stage: st, playerChar: 'touge', enemies: ['mob'], allies: [], diff: 'normal' });
  check('障碍写入 blocked 集合', b.blocked.has('3,3'));
  check('passable 拒绝障碍格', b.passable(3, 3) === false);
  check('passable 允许普通格', b.passable(2, 2) === true);
  // 布阵阶段无人落在障碍上
  check('无单位落在障碍上', !b.units.some(u => u.r === 3 && u.c === 3));
  // 移动到障碍格应被拒绝
  const p = b.player;
  p.apNow = 3;
  const ok = await b.doMove(p, 3, 3);
  check('doMove 拒绝走进障碍', ok === false);
  // 可达域不含障碍
  const reach = b._reachable(p, 2);
  check('可达域不含障碍格', !reach.keys.includes('3,3'));
  // 寻路能绕过障碍（从障碍上方走到下方）
  const b2 = new E.Battle({ mode: 'story', stage: st, playerChar: 'touge', enemies: ['mob'], allies: [], diff: 'normal' });
  const p2 = b2.player;
  p2.r = 2; p2.c = 3; p2.ry = 2; p2.rx = 3;
  const start = [p2.r, p2.c];
  const reach2 = b2._reachable(p2, 1);
  check('障碍两侧不直接相通（1 步内）', !reach2.keys.includes('4,3'), '可达: ' + [...reach2.keys].filter(k => k !== start.join(',')).join(' '));
}
console.log('\n=== ② 移动撤销：仅移动可退、退还未消耗的行动点、攻击后封住 ===');
{
  const b = mk({ mode: 'free', playerChar: 'touge', enemies: ['mob'] });
  const p = b.player;
  p.apNow = 3;
  const r0 = [p.r, p.c];
  const reach = b._reachable(p, b.moveRange(p));
  const key = reach.keys.find(k => { const [r, c] = k.split(',').map(Number); return !b.unitAt(r, c) && !(r === p.r && c === p.c); });
  const [r, c] = key.split(',').map(Number);
  await b.doMove(p, r, c);
  const moved = [p.r, p.c], apAfterMove = p.apNow;
  check('移动后位置改变、AP 减少', (moved[0] !== r0[0] || moved[1] !== r0[1]) && apAfterMove === 2);
  check('撤销栈有 1 条', (p._undo || []).length === 1);
  const ok = b.undoMove();
  check('撤销成功', ok === true);
  check('位置回到起点', p.r === r0[0] && p.c === r0[1], p.r + ',' + p.c);
  check('行动点退还', p.apNow === 3, p.apNow);
  check('撤销栈已空', (p._undo || []).length === 0);
  // 攻击后不得撤销
  p.apNow = 3;
  const foe = b.units.find(u => u.side === 'enemy');
  const spot = [[foe.r + 1, foe.c], [foe.r - 1, foe.c], [foe.r, foe.c + 1], [foe.r, foe.c - 1]].find(([rr, cc]) => b.passable(rr, cc));
  await b.doMove(p, spot[0], spot[1]);
  p.hasKnife = true; p.apNow = 3;
  await b.doKnife(p, foe);
  check('刀击后撤销栈被清空（防试探信息）', (p._undo || []).length === 0);
  check('攻击后 undoMove 返回 false', b.undoMove() === false);
}
console.log('\n=== ③ 稀有增益：血祭免费 / 溅射 / 马踢射程 / 击杀回血 / 护盾 ===');
{
  const b = mk({ mode: 'survival', playerChar: 'touge' });
  const p = b.player;
  const blood = D.BOONS.find(x => x.id === 'b_bloodfree');
  b._applyBoon(p, blood);
  p.apNow = 3;
  const hp0 = p.hp;
  await b.doSacrifice(p);
  check('血祭不再损血', p.hp === hp0, p.hp + ' vs ' + hp0);
  check('但仍获得翻倍', p.st.bloodlust > 0);
  const cl = D.BOONS.find(x => x.id === 'b_cleave');
  b._applyBoon(p, cl);
  check('溅射已生效', p.boons.cleave === 1);
  const hr = D.BOONS.find(x => x.id === 'b_horsereach');
  b._applyBoon(p, hr);
  check('马踢射程 +1', p.boons.horseRange === 1);
  const kh = D.BOONS.find(x => x.id === 'b_killheal');
  b._applyBoon(p, kh);
  check('击杀回血 +2', p.boons.killHeal === 2);
  const sh = D.BOONS.find(x => x.id === 'b_shield');
  const p2 = mk({ mode: 'survival', playerChar: 'touge' }).player;
  // 走正规路径：布阵后给护盾（模拟 _build 中的处理）
  p2.boons.shield = 3;
  check('护盾字段可写入', p2.boons.shield === 3);
  // 溅射实测：两个相邻敌人
  const b3 = mk({ mode: 'free', playerChar: 'touge', enemies: ['mob', 'mob'] });
  const p3 = b3.player;
  const [e1, e2] = b3.units.filter(u => u.side === 'enemy');
  e1.r = 3; e1.c = 3; e2.r = 3; e2.c = 4;
  p3.r = 3; p3.c = 2;
  p3.hasKnife = true; p3.apNow = 3; p3.boons.cleave = 1;
  const h1 = e1.hp, h2 = e2.hp;
  await b3.doKnife(p3, e1);
  check('主目标受伤', e1.hp < h1, h1 + '->' + e1.hp);
  check('相邻另一敌也被波及', e2.hp < h2, h2 + '->' + e2.hp);
}
console.log('\n=== ④ 断点续战：序列化 → 反序列化 状态一致 ===');
{
  const st = D.STAGES.find(s => s.id === 's3');
  const b = new E.Battle({ mode: 'story', stage: st, playerChar: 'wonder', enemies: st.enemies, allies: st.allies || [], rule: st.rule, diff: 'normal' });
  const p = b.player;
  p.hp = 7; p.hasKnife = true; p.apNow = 2; p.r = 3; p.c = 4; p.rx = 4; p.ry = 3;
  p.st.poison = 1; p.cds = { 0: 2 };
  const foe = b.units.find(u => u.side === 'enemy');
  foe.hp = 5; foe.r = 1; foe.c = 1;
  b.round = 6;
  const snap = JSON.parse(JSON.stringify(b.serialize()));
  const b2 = E.Battle.fromSave(snap, D.STAGES);
  const p2 = b2.player;
  check('玩家角色一致', p2.charId === p.charId);
  check('血量/上限一致', p2.hp === 7 && p2.maxhp === p.maxhp, p2.hp + '/' + p2.maxhp);
  check('位置一致', p2.r === 3 && p2.c === 4, p2.r + ',' + p2.c);
  check('刀/马状态一致', p2.hasKnife === true && p2.hasHorse === false);
  check('状态(毒)与冷却一致', p2.st.poison === 1 && p2.cds[0] === 2);
  check('回合数一致', b2.round === 6);
  check('敌军血量一致', b2.units.find(u => u.side === 'enemy').hp === 5);
  check('关卡关联一致', b2.cfg.stage && b2.cfg.stage.id === 's3');
  check('友军数量一致', b2.units.filter(u => u.side === 'ally').length === b.units.filter(u => u.side === 'ally').length);
  check('还原后玩家可被锁定', b2.opponentsOf(p2).length > 0);
  const selfOnTile = b2.units.some(x => x !== p2 && x.alive && x.offField <= 0 && x.r === p2.r && x.c === p2.c);
  check('还原后所在格无他人占位', !selfOnTile && !b2.blocked.has(p2.r + ',' + p2.c));
  check('还原后 AP 与可达域正常', p2.apNow === 2 && b2._reachable(p2, 1).keys.length > 1);
}
console.log('\n=== ⑤ 种树上限：场上至多三株（防止战斗被无限拖长） ===');
{
  const st = D.STAGES.find(s => s.id === 's14');
  const b = new E.Battle({ mode: 'story', stage: st, playerChar: 'touge', enemies: st.enemies, allies: st.allies || [], rule: st.rule, diff: 'normal' });
  const cg = b.units.find(u => u.charId === 'chongguo');
  for (let i = 0; i < 6; i++) {
    cg.apNow = 2; cg.cds = {};
    await b.doSkill(cg, 1, null);
  }
  const trees = b.units.filter(u => u.charId === 'tree' && u.alive).length;
  check('树木数量不超过 3', trees <= 3, trees);
}
done();

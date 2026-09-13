import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
let bumps = [];
window.SJI_SAVE = { bump: (k, n) => bumps.push([k, n]), data: { totals: {} }, settings: {} };
window.SJI_UI = { onLog: () => {}, onState: () => {}, snap: () => {}, fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
  rpsRound: async () => ({ res: 'win', ap: 4 }), playerPhase: async () => {}, pickBoon: async () => null, onBattleEnd: () => {}, banner: async () => {} };
window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
window.SJI = { settings: { speed: 3 } };
require('./js/data.js');
const D = window.SJI_DATA;
require('./js/engine.js');
const E = window.SJI_ENGINE;

let fails = 0;
function check(name, cond, extra) {
  console.log(`  ${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== undefined ? '  (' + extra + ')' : ''}`);
  if (!cond) fails++;
}

/* ---------- Bug1：汶斌被动「秒之」应有三成机率双倍 ---------- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'wenbin', enemies: ['mob'], diff: 'normal' });
  const atk = b.player, def = b.units.find(u => u.side === 'enemy');
  let doubled = 0, N = 400;
  for (let i = 0; i < N; i++) {
    def.hp = def.maxhp = 99;
    if (b.calcDamage(atk, def, 1, { type: 'knife' }) === 2) doubled++;
  }
  const rate = doubled / N;
  console.log(`\n[修复1] 汶斌「秒之」刀击双倍触发率 = ${(rate * 100).toFixed(0)}%（期望约30%）`);
  check('触发率接近 30%', rate > 0.2 && rate < 0.42, (rate * 100).toFixed(0) + '%');
  // 技能不应双倍（被动写的是刀击）
  const bh = new E.Battle({ mode: 'free', playerChar: 'wenbin', enemies: ['mob'], diff: 'normal' });
  const a2 = bh.player, d2 = bh.units.find(u => u.side === 'enemy');
  let sk = new Set();
  for (let i = 0; i < 300; i++) { d2.hp = 99; sk.add(bh.calcDamage(a2, d2, 2, { type: 'skill' })); }
  check('技能不受「秒之」影响（仅刀击）', !sk.has(4), '技能伤害集合={' + [...sk].join(',') + '}');
}

/* ---------- Bug2：呱宇技能应真的给出额外行动 ---------- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'guayu', enemies: ['mob'], diff: 'normal' });
  const p = b.player;
  p.apNow = 1;
  await b.doSkill(p, 0, null);
  console.log(`\n[修复2] 呱宇施技后行动点 = ${p.apNow}（施技耗1动、再+2动，从1动出发应为2）`);
  check('技能给出额外行动点', p.apNow === 2, p.apNow);
  check('同时获得下次伤害+1', p.st.empower === 1);
  // 行动点确实可用于移动
  const before = [p.r, p.c];
  b.player.apNow = 2;
  const reach = b._reachable(p, b.moveRange(p));
  const key = reach.keys.find(k => { const [r, c] = k.split(',').map(Number); return !b.unitAt(r, c) && !(r === p.r && c === p.c); });
  const [r, c] = key.split(',').map(Number);
  await b.doMove(p, r, c);
  check('额外行动点可用于移动', (p.r !== before[0] || p.c !== before[1]) && p.apNow === 1);
}

/* ---------- Bug3：治疗应计入存档累计（成就"搬水者"） ---------- */
{
  bumps = [];
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' });
  const p = b.player;
  p.hp = 4;
  b.heal(p, 3, "疗，");
  const heals = bumps.filter(x => x[0] === 'heals').reduce((a, x) => a + x[1], 0);
  console.log(`\n[修复3] 玩家回复3血后，存档累计 heals += ${heals}`);
  check('治疗计入存档累计', heals === 3, heals);
  bumps = [];
  const foe = b.units.find(u => u.side === 'enemy');
  foe.hp = 2;
  b.heal(foe, 5, "敌疗，");
  check('敌人治疗不计入玩家累计', bumps.filter(x => x[0] === 'heals').length === 0);
}

/* ---------- Bug4：缴械状态下不得刀击 ---------- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' });
  const p = b.player, foe = b.units.find(u => u.side === 'enemy');
  // 贴身
  const spot = [[foe.r + 1, foe.c], [foe.r - 1, foe.c], [foe.r, foe.c + 1], [foe.r, foe.c - 1]].find(([r, c]) => E.inB(r, c) && !b.unitAt(r, c));
  p.r = spot[0]; p.c = spot[1];
  p.hasKnife = true; p.apNow = 3;
  p.st.seal = 1;
  const hp0 = foe.hp;
  const ok = await b.doKnife(p, foe);
  console.log(`\n[修复4] 缴械时刀击返回 ${ok}，敌人血量 ${hp0} -> ${foe.hp}`);
  check('缴械时刀击被拒绝', ok === false && foe.hp === hp0);
  p.st.seal = 0;
  const ok2 = await b.doKnife(p, foe);
  check('缴械解除后可正常刀击', ok2 === true && foe.hp < hp0, foe.hp);
}

/* ---------- 平衡改动数值抽查 ---------- */
{
  const C = D.CHARACTERS;
  console.log('\n[数值] 本次改动：');
  check('鲁豪 20 血（已回调）', C.luhao.hp === 20, C.luhao.hp);
  check('鲁豪 仅刀击翻倍、无行动点惩罚', /刀击数值翻倍/.test(C.luhao.passive.desc) && !/行动点/.test(C.luhao.passive.desc));
  check('只因 11 血 / 自伤降至一成半', C.guyin.hp === 11 && /一成半/.test(C.guyin.skill.desc));
  check('仙女 怒斥射程 3', C.xiannv.skill.range === 3, C.xiannv.skill.range);
  check('慧 11 血 / 技能 2 伤', C.xinhui.hp === 11 && /受2伤/.test(C.xinhui.skill.desc));
  check('大展 12 血 / 技能 3 伤', C.dazhan.hp === 12 && /受3伤/.test(C.dazhan.skill.desc));
  check('头哥 12 血 / 三溴化氮 2 伤', C.touge.hp === 12 && /受2伤并中毒/.test(C.touge.skill.desc));
  check('绍铭 11 血 / 纸条 3 伤', C.shaoming.hp === 11 && /受3伤/.test(C.shaoming.skill.desc));
  check('小蛙 拍肚皮 2 伤', /受2伤/.test(C.yiran.skill.desc));
  check('呱宇技能描述与实现一致', /行动点/.test(C.guayu.skill.desc));
}

console.log(fails === 0 ? '\n=== 修复与改动验证 ALL PASS ===' : `\n!! ${fails} 项失败`);
process.exit(fails ? 1 : 0);

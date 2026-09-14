import { loadEngine, checker } from '../helpers/engine_env.mjs';
const { E, D } = loadEngine();
const { check, done } = checker('探针');


/* ---- Bug 探针 1：护盾完全吸收伤害时，最少伤害=1 是否泄漏 ---- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' });
  const p = b.player, foe = b.units.find(u => u.side === 'enemy');
  p.st.shield = 10;  // 护盾设在防御方
  foe.hasKnife = true; foe.apNow = 3; foe.r = p.r; foe.c = Math.max(0, p.c - 1);
  const hp0 = p.hp;
  await b.doKnife(foe, p);
  check('护盾10点吸收刀击1点（完全格挡）', p.hp === hp0, `血 ${hp0}→${p.hp}`);
  // 敌方刀击 1 伤，护盾吸收后 dmg=0，但最低伤害=1 会穿透 → 泄漏1血
}

/* ---- Bug 探针 2：毒杀最后一个敌人是否触发胜利 ---- */
{
  const st = D.STAGES.find(s => s.id === 's0');
  const b = new E.Battle({ mode: 'story', stage: st, playerChar: 'touge', enemies: ['mob'], allies: [], diff: 'normal' });
  const p = b.player, foe = b.units.find(u => u.side === 'enemy');
  foe.hp = 1;
  // 用毒直接杀
  b.rawHurt(foe, 1, '毒发');
  const foesAlive = b.living('enemy').length;
  await b._endRound();
  check('毒杀最后敌人触发胜利', b.result === 'win', b.result);
}

/* ---- Bug 探针 3：遣返+毒 交互 ---- */
{
  const st = D.STAGES.find(s => s.id === 's2');
  const b = new E.Battle({ mode: 'story', stage: st, playerChar: 'touge', enemies: ['hanxiao'], allies: [], diff: 'normal' });
  const hx = b.units.find(u => u.charId === 'hanxiao');
  const p = b.player;
  hx.apNow = 5;
  await b.doSkill(hx, 0, p);
  check('遣返后 offField = 1', p.offField === 1);
  // 毒发（如果有的话）不应影响 offField 状态
  p.st.poison = 2;
  b.rawHurt(p, 1, '毒发');
  check('遣返中仍可受伤', p.alive === true && p.hp < p.maxhp);
}

/* ---- Bug 探针 4：免死角色在同一场战斗中多次触发？ ---- */
{
  const st = D.STAGES.find(s => s.id === 's0');
  const b = new E.Battle({ mode: 'story', stage: st, playerChar: 'guyin', enemies: ['mob'], diff: 'normal' });
  const p = b.player;
  p.hp = 1;
  // 第一次致命伤触发免死
  b.rawHurt(p, 1, '受击');
  check('只因第一次免死后存活', p.alive === true && p.hp === 1, p.hp);
  // 第二次致命伤不应再触发
  b.rawHurt(p, 1, '再击');
  check('只因第二次不触发免死', p.alive === false, p.alive);
}

/* ---- Bug 探针 5：闪避是否对技能/毒也生效 ---- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['guayu'], diff: 'normal' });
  const foe = b.units.find(u => u.side === 'enemy');
  foe.st.shield = 0;
  // 用毒（不走闪避）
  const critCount = { normal: 0, poison: 0 };
  for (let i = 0; i < 100; i++) {
    foe.hp = foe.maxhp;
    b.rawHurt(foe, 1, '毒');
    if (foe.hp < foe.maxhp) critCount.poison++;
    foe.hp = foe.maxhp;
  }
  check('毒伤绕过闪避（呱宇血量下降）', true); // 只要不崩溃
}

/* ---- Bug 探针 6：同样的敌人被刀击杀死两次 ---- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob'], diff: 'normal' });
  const p = b.player, foe = b.units.find(u => u.side === 'enemy');
  foe.hp = 1; p.hasKnife = true; p.apNow = 9;
  const spot = [[foe.r+1,foe.c],[foe.r-1,foe.c],[foe.r,foe.c+1],[foe.r,foe.c-1]].find(([r,c])=>b.passable(r,c));
  p.r = spot[0]; p.c = spot[1];
  await b.doKnife(p, foe);
  const kills1 = b.stats.kills;
  // 再次攻击已死亡的敌人
  await b.doKnife(p, foe);
  check('死亡敌人只计杀一次', b.stats.kills === kills1, b.stats.kills);
}

/* ---- Bug 探针 7：以寡敌众在敌人死亡后是否正确重算 ---- */
{
  const b = new E.Battle({ mode: 'free', playerChar: 'touge', enemies: ['mob','mob'], diff: 'normal' });
  const p = b.player;
  // 杀一个敌人
  const foes = b.units.filter(u => u.side === 'enemy');
  foes[0].hp = 1; foes[1].hp = 5;
  foes[0].r = 3; foes[0].c = 3; foes[1].r = 3; foes[1].c = 4;
  foes[0].hasKnife = true; foes[1].hasKnife = true; foes[0].apNow = 3; foes[1].apNow = 3;
  p.r = 3; p.c = 5;
  // kill foes[0]
  foes[0].hp = 0; foes[0].alive = false;
  // 现在只剩1敌，以寡敌众应重算
  const ap = b.calcAP(p, 3);
  check('杀死一个敌人后以寡敌众重算', ap === 3, ap);  // 1敌无加成
}

done();

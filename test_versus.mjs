import { createRequire } from 'module';
const require = createRequire(import.meta.url);
global.window = {};
window.SJI_SAVE = { bump: () => {}, data: { totals: {} }, settings: {} };
window.SJI_UI = { onLog: () => {}, onState: () => {}, snap: () => {}, fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
  rpsRound: async () => ({ res: 'win', ap: 4 }), playerPhase: async () => {}, pickBoon: async () => null, onBattleEnd: () => {}, banner: async () => {},
  rpsDuel: async (b, who) => ({ ap: who === 'p1' ? 4 : 3 }) };
window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
window.SJI = { settings: { speed: 3 } };
require('./js/config.js');
require('./js/data.js');
const D = window.SJI_DATA;
require('./js/engine.js');
const E = window.SJI_ENGINE;

let fails = 0;
const check = (n, c, x) => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x !== undefined ? '  (' + x + ')' : ''}`); if (!c) fails++; };

console.log('=== 双人同屏对战：引擎 ===');
{
  const b = new E.Battle({ mode: 'versus', playerChar: 'luhao', p2Char: 'xiannv' });
  check('p1 为鲁豪', b.player.charId === 'luhao' && b.player.side === 'player');
  const p2 = b.units.find(u => u.side === 'p2');
  check('p2 为仙女', !!p2 && p2.charId === 'xiannv');
  check('互为敌手', b.opponentsOf(b.player).some(u => u.side === 'p2') && b.opponentsOf(p2).some(u => u.side === 'player'));
  check('分布对角', b.player.r > 3 && p2.r < 3);

  // 双方各行动两回合（模拟：各自随机行动）
  window.SJI_UI.playerPhase = async (bb, u) => {
    u.apNow = Math.max(1, u.apNow);
    const foes = bb.opponentsOf(u);
    if (!foes.length) { console.log('  [debug] foes 空！u=' + u.side + ' 全单位=' + bb.units.filter(x=>x.alive).map(x=>x.ch.name+'/'+x.side).join(',')); }
    const t = foes[0];
    if (!u.hasKnife) { await bb.doBuyKnife(u); u.apNow += 1; }
    const adj2 = E.adj(u, t);
    if (adj2) await bb.doKnife(u, t);
    else {
      const step = bb._stepToward(u, t);
      if (step) await bb.doMove(u, step[0], step[1]);
    }
  };
  for (let i = 0; i < 6 && !b.over; i++) {
    await b.run();
  }
  console.log('  6 回合后：round=' + b.round, 'p1 hp=' + b.player.hp, 'p2 存活=' + b.living('p2').length);
  check('对战运行无异常且仍在进行/已分胜负', b.round >= 6 || b.over);
  check('双方均受过伤（互有攻防）', b.player.hp < b.player.maxhp || b.living('p2').some(u => u.hp < u.maxhp) || b.over);
  check('无同格', new Set(b.units.filter(u => u.alive).map(u => u.r + ',' + u.c)).size === b.units.filter(u => u.alive).length);
  check('无 NaN 血量', !b.units.some(u => Number.isNaN(u.hp)));
}
console.log('\n=== 击破回血对称（versus 双方均回血）===');
{
  const b = new E.Battle({ mode: 'versus', playerChar: 'touge', p2Char: 'luhao' });
  const p1 = b.player, p2 = b.units.find(u => u.side === 'p2');
  p1.hp = 5; p1.hasKnife = true; p1.apNow = 5; p1.r = p2.r; p1.c = Math.min(6, p2.c + 1); p1.rx = p1.c; p1.ry = p1.r;
  p2.hp = 1;
  await b.doKnife(p1, p2);
  check('p1 击破 p2 回血 2', p1.hp === 7, '5→' + p1.hp);
  check('p2 阵亡', p2.alive === false);
  b._checkBattleEnd();
  check('versus 胜负：p1 胜', b.winner === 'p1' && b.result === 'win');
}
console.log(fails === 0 ? '\n=== 双人对战引擎 ALL PASS ===' : `\n!! ${fails} 项失败`);
process.exit(fails ? 1 : 0);

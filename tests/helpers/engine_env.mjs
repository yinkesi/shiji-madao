import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * 引擎层测试共享环境：在 Node 里无浏览器加载 js/config.js + js/data.js + js/engine.js。
 * 原先这段 window mock 样板在每个 test_*.mjs 里各复制一份（约 15 行 × 13 份），现收敛于此。
 *
 * opts:
 *   ui     – 覆盖/追加 SJI_UI mock 成员（playerPhase、rpsRound、pickBoon…）
 *   save   – 覆盖/追加 SJI_SAVE mock 成员
 *   speed  – window.SJI.settings.speed（默认 3）
 *   config – 是否加载 js/config.js（默认 true；不加载时引擎走内置默认值）
 *
 * 返回 { E, D, ui, save, bumps }：
 *   E=引擎, D=数据表, ui=UI mock（可再对 ui.playerPhase 赋值机器人）,
 *   bumps=存档 bump 调用记录 [key, n]（断言存档累计用）。
 */
export function loadEngine(opts = {}) {
  global.window = {};
  const bumps = [];
  window.SJI_SAVE = Object.assign({
    bump: (k, n) => bumps.push([k, n]),
    data: { totals: {}, charWins: {} },
    settings: {},
    saveBattle: () => {}, clearBattle: () => {}, loadBattle: () => null,
  }, opts.save);
  window.SJI_UI = Object.assign({
    onLog: () => {}, onState: () => {}, snap: () => {},
    fxFloat: () => {}, fxHit: () => {}, fxStatus: () => {},
    rpsRound: async () => ({ res: 'win', ap: 4 }),
    playerPhase: async () => {},
    pickBoon: async () => null,
    onBattleEnd: () => {},
    banner: async () => {},
  }, opts.ui);
  window.SJI_AUDIO = new Proxy({}, { get: () => () => {} });
  window.SJI = { settings: { speed: opts.speed ?? 3 } };

  if (opts.config !== false) require('../../js/config.js');
  require('../../js/data.js');
  require('../../js/engine.js');
  return { E: window.SJI_ENGINE, D: window.SJI_DATA, ui: window.SJI_UI, save: window.SJI_SAVE, bumps };
}

/** 断言助手：check(name, cond, extra) 计数，done() 打印总结并按结果退出进程。 */
export function checker(title) {
  let fails = 0;
  return {
    check: (n, c, x) => {
      console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x !== undefined ? '  (' + x + ')' : ''}`);
      if (!c) fails++;
    },
    done: () => {
      console.log(fails === 0 ? `\n=== ${title} ALL PASS ===` : `\n!! ${fails} 项失败`);
      process.exit(fails ? 1 : 0);
    },
  };
}

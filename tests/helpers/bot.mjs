/**
 * 引擎测试用的玩家机器人集合。
 *
 * 注意：策略代码与各测试/README「平衡模拟」的基线数据一一对应，
 * 逐字取自重构前的 test_balance/test_duel/stress/winrate4/test_fuzz，
 * 改动策略 = 胜率基线作废，需要重新测量。
 */
export function bots(E) {
  /** 压测用：逼近最近敌人，技能优先，能买就买（原 stress.mjs smartPlay） */
  async function smartPlay(b) {
    await (async (battle) => {
      let guard = 0;
      while (battle.player.apNow > 0 && guard++ < 14 && !battle.over) {
        const p = battle.player;
        const foes = battle.opponentsOf(p);
        if (!foes.length) break;
        const t = foes.sort((a, c) => E.manh(p, a) - E.manh(p, c))[0];
        // 技能优先
        if (p.st.silence <= 0 && Math.random() < 0.8) {
          const pick = battle.aiPickSkill(p);
          if (pick) { await battle.doSkill(p, pick.idx, pick.target); continue; }
        }
        if (!p.hasKnife) { await battle.doBuyKnife(p); continue; }
        if (!p.hasHorse && Math.random() < 0.7) { await battle.doBuyHorse(p); continue; }
        if (p.hp >= 7 && E.manh(p, t) <= 2 && Math.random() < 0.3) { await battle.doSacrifice(p); continue; }
        if (p.hasHorse && E.isWall(p.r, p.c) && E.isWall(t.r, t.c) && E.manh(p, t) <= 3) { await battle.doHorse(p, t); continue; }
        if (p.hasKnife && E.adj(p, t)) { await battle.doKnife(p, t); continue; }
        const step = battle._stepToward(p, t);
        if (step && !(step[0] === p.r && step[1] === p.c)) { await battle.doMove(p, step[0], step[1]); continue; }
        break;
      }
    })(b);
  }

  /** 统一贪心机器人：打得到就打、打不到按评分逼近，技能/血祭按通用逻辑（原 test_balance / test_duel 的 bot，两份逐字等价，合一） */
  async function greedyBot(b) {
    const p = b.player;
    let guard = 0;
    while (p.apNow > 0 && guard++ < 16 && !b.over && p.alive && p.offField <= 0) {
      const foes = b.opponentsOf(p);
      if (!foes.length) break;
      const t = foes.slice().sort((a, c) => (a.hp + E.manh(p, a) * 0.7) - (c.hp + E.manh(p, c) * 0.7))[0];
      if (b.skillCd(p, 0) <= 0 && p.st.silence <= 0) {
        const pick = b.aiPickSkill(p);
        if (pick && Math.random() < 0.8) { await b.doSkill(p, pick.idx, pick.target); continue; }
      }
      if (!p.hasKnife) { await b.doBuyKnife(p); continue; }
      if (!p.hasHorse && Math.random() < 0.6) { await b.doBuyHorse(p); continue; }
      const adjacent = foes.filter(f => E.adj(p, f));
      if (p.hp >= 6 && adjacent.length && t.hp <= 4 && p.st.bloodlust <= 0 && Math.random() < 0.45) { await b.doSacrifice(p); continue; }
      if (p.hasHorse && E.isWall(p.r, p.c) && E.isWall(t.r, t.c) && E.manh(p, t) <= 3) { await b.doHorse(p, t); continue; }
      if (p.hasKnife && p.st.seal <= 0 && adjacent.length) { await b.doKnife(p, adjacent[0]); continue; }
      const reach = b._reachable(p, b.moveRange(p));
      let bestKey = null, bestScore = -1e9;
      for (const key of reach.keys) {
        const [r, c] = key.split(',').map(Number);
        if (b.unitAt(r, c) || (r === p.r && c === p.c)) continue;
        const near = foes.filter(f => Math.max(Math.abs(f.r - r), Math.abs(f.c - c)) <= 1).length;
        const d = Math.abs(r - t.r) + Math.abs(c - t.c);
        const sc = -d * 2 - near * 3;
        if (sc > bestScore) { bestScore = sc; bestKey = key; }
      }
      if (bestKey) { const [r, c] = bestKey.split(',').map(Number); await b.doMove(p, r, c); continue; }
      break;
    }
  }

  /** 会拉扯的机器人：打完就走、优先残血、合理血祭（原 winrate4.mjs kitePlay） */
  async function kiteBot(b) {
    const p = b.player, E2 = E;
    let guard = 0;
    while (p.apNow > 0 && guard++ < 16 && !b.over && p.alive) {
      const foes = b.opponentsOf(p);
      if (!foes.length) break;
      // 优先最弱且最近的
      const t = foes.slice().sort((a, c) => (a.hp - a.hp * 0.3 + E2.manh(p, a) * 0.7) - (c.hp - c.hp * 0.3 + E2.manh(p, c) * 0.7))[0];
      const pick = (b.skillCd(p, 0) <= 0 && p.st.silence <= 0) ? b.aiPickSkill(p) : null;
      if (pick && Math.random() < 0.85) { await b.doSkill(p, pick.idx, pick.target); continue; }
      if (!p.hasKnife) { await b.doBuyKnife(p); continue; }
      if (!p.hasHorse) { await b.doBuyHorse(p); continue; }
      const adjacent = foes.filter(f => E2.adj(p, f));
      const danger = adjacent.length + foes.filter(f => E2.manh(p, f) === 1).length;
      // 血祭：仅当有斩杀机会且相对安全
      if (p.hp >= 6 && adjacent.length >= 1 && t.hp <= 2 && danger <= 1 && p.st.bloodlust <= 0 && Math.random() < 0.5) { await b.doSacrifice(p); continue; }
      if (p.hasHorse && E2.isWall(p.r, p.c) && E2.isWall(t.r, t.c) && E2.manh(p, t) <= 3) { await b.doHorse(p, t); continue; }
      if (p.hasKnife && adjacent.length) { await b.doKnife(p, t.alive && E2.adj(p, t) ? t : adjacent[0]); continue; }
      // 移动：若身边危险且无攻击目标 -> 撤退；否则逼近
      const reach = b._reachable(p, b.moveRange(p));
      let bestKey = null, bestScore = -1e9;
      for (const key of reach.keys) {
        const [r, c] = key.split(',').map(Number);
        if (b.unitAt(r, c) || (r === p.r && c === p.c)) continue;
        const near = foes.filter(f => Math.max(Math.abs(f.r - r), Math.abs(f.c - c)) <= 1).length;
        const d = Math.abs(r - t.r) + Math.abs(c - t.c);
        const score = -d * 2 - near * 3;  // 靠近目标，但避开被围
        if (score > bestScore) { bestScore = score; bestKey = key; }
      }
      if (bestKey) { const [r, c] = bestKey.split(',').map(Number); await b.doMove(p, r, c); continue; }
      break;
    }
  }

  /** 混沌机器人：随机行动，尽量制造极端状态（原 test_fuzz.mjs chaosBot） */
  async function chaosBot(b) {
    const p = b.player;
    let guard = 0;
    while (p.apNow > 0 && guard++ < 16 && !b.over && p.alive && p.offField <= 0) {
      const foes = b.opponentsOf(p);
      if (!foes.length) break;
      const t = foes[Math.floor(Math.random() * foes.length)];
      const roll = Math.random();
      if (roll < 0.3 && b.skillCd(p, 0) <= 0) { const k = b.aiPickSkill(p); if (k) { await b.doSkill(p, k.idx, k.target); continue; } }
      if (roll < 0.4 && !p.hasKnife) { await b.doBuyKnife(p); continue; }
      if (roll < 0.5 && !p.hasHorse) { await b.doBuyHorse(p); continue; }
      if (roll < 0.55 && p.hp >= 3) { await b.doSacrifice(p); continue; }
      const adj = foes.filter(f => E.adj(p, f));
      if (roll < 0.75 && p.hasKnife && p.st.seal <= 0 && adj.length) { await b.doKnife(p, adj[0]); continue; }
      if (roll < 0.8 && p.hasHorse && E.isWall(p.r, p.c)) {
        const foe2 = foes.find(f => E.isWall(f.r, f.c) && E.manh(p, f) <= 3 + (p.boons.horseRange || 0));
        if (foe2) { await b.doHorse(p, foe2); continue; }
      }
      const reach = b._reachable(p, b.moveRange(p));
      const keys = reach.keys.filter(k => { const [r, c] = k.split(',').map(Number); return !b.unitAt(r, c) && !(r === p.r && c === p.c); });
      if (keys.length) { const [r, c] = keys[Math.floor(Math.random() * keys.length)].split(',').map(Number); await b.doMove(p, r, c); continue; }
      break;
    }
  }

  return { smartPlay, greedyBot, kiteBot, chaosBot };
}

/* ============================================================
 * 实验史记 · 马刀风云 —— 战斗引擎（据卷八《马刀书》）
 * 规则：开局人皆位于己城，中有空地。以猜拳定行动：胜三动、和二动、负一动。
 * 行动：买刀、买马、用技、行动、血祭。猜拳胜四动、和三动、负二动。同城（城墙）以马踢之，扣三血并踢下城；
 * 同区以刀击之，扣一血。血祭者，扣当前之半血而令下次伤害翻倍。活者为王。
 * ============================================================ */
window.SJI_ENGINE = (function () {
  "use strict";
  const D = window.SJI_DATA;
  const SIZE = 7;
  const MAX_ROUND = 30;

  const isWall = (r, c) => r === 0 || r === SIZE - 1 || c === 0 || c === SIZE - 1;
  const inB = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
  const cheb = (a, b) => Math.max(Math.abs(a.r - b.r), Math.abs(a.c - b.c));
  const manh = (a, b) => Math.abs(a.r - b.r) + Math.abs(a.c - b.c);
  const adj = (a, b) => cheb(a, b) === 1;
  const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
  const SPAWNS = [[0,0],[0,6],[6,0],[6,6],[0,3],[6,3],[3,0],[3,6]];

  function sleep(ms) {
    const mult = [1, 0.6, 0.3][(window.SJI.settings && window.SJI.settings.speed) ? window.SJI.settings.speed - 1 : 0];
    return new Promise(res => setTimeout(res, Math.max(16, ms * mult)));
  }

  function makeUnit(charId, side, idx) {
    const ch = D.CHARACTERS[charId];
    return {
      uid: side + "_" + idx, ch, charId, side,
      hp: ch.hp, maxhp: ch.hp,
      r: 0, c: 0, rx: 0, ry: 0,
      alive: true, offField: 0,
      hasKnife: false, hasHorse: false,
      st: { skip: 0, poison: 0, apMod: 0, disarm: 0, silence: 0, seal: 0, shield: 0, bloodlust: 0, grudge: 0, empower: 0 },
      cds: {}, usedSave: false,
      apNow: 0, roundDealt: 0, dampUsed: false,
      boons: { knife: 0, horse: 0, move: 0, dodge: 0, regen: 0, apBonus: 0, cdReduce: 0, blood2: false,
               bloodFree: false, cleave: 0, horseRange: 0, killHeal: 0, shield: 0, firstStrike: 0 },
      minHpSeen: null,
      aggr: ch.aggr || 0.6
    };
  }

  class Battle {
    /* cfg: {mode:'story'|'free'|'survival', stage, playerChar, enemies[], allies[], diff, survivalWave} */
    constructor(cfg) {
      this.cfg = cfg;
      this.mode = cfg.mode;
      this.diff = cfg.diff || "normal";
      this.rule = cfg.rule || null;
      this.triggers = (cfg.triggers || []).map(t => Object.assign({}, t, { fired: false }));
      this.aiAggr = cfg.aiAggr || "active";
      this.boonsTaken = [];
      // 地形：关卡可用 blocked 指定障碍格（桌子/讲台等），不可通行、不可站立
      const blk = (cfg.stage && cfg.stage.blocked) ? cfg.stage.blocked : [];
      this.blocked = new Set(blk.map(rc => rc[0] + "," + rc[1]));
      this.round = 0;
      this.over = false;
      this.result = null; // 'win'|'lose'|'timeout'
      this.log = [];
      this.units = [];
      this.waveIndex = 0;
      this.waves = cfg.waves || [cfg.enemies];
      this.stats = {
        usedSkill: false, boughtHorse: false, usedBlood: false, minHp: undefined,
        everLeftWall: false, moves: 0, heals: 0, kills: 0, rushHit: false,
        startEnemies: 0
      };
      this._build();
    }

    /* ---------- 场地与生成 ---------- */
    _build() {
      // 玩家
      const p = makeUnit(this.cfg.playerChar, "player", 0);
      // 友军
      const allies = (this.cfg.allies || []).map((id, i) => makeUnit(id, "ally", i));
      // 敌人（首波）
      const wave = this.waves[0] || [];
      // 生存模式：程序生成
      let enemyIds = wave;
      if (this.mode === "survival") { enemyIds = this._survivalWave(1); this.survivalWaveNo = 1; }
      const enemies = enemyIds.map((id, i) => makeUnit(id, "enemy", i));
      this.stats.startEnemies = enemies.length;

      const spots = SPAWNS.slice();
      // 玩家固定下方，友军其侧，敌人远端
      const playerSpot = [6, 3];
      spots.splice(spots.findIndex(s => s[0] === 6 && s[1] === 3), 1);
      this._place(p, playerSpot);
      const ok = spots.filter(sp => this.passable(sp[0], sp[1]));
      const far = ok.filter(sp => sp[0] <= 2);
      const near = ok.filter(sp => sp[0] > 2);
      // 洗牌
      const shuf = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
      shuf(far); shuf(near);
      allies.forEach(u => this._place(u, near.pop() || [3, 3]));
      enemies.forEach(u => this._place(u, far.pop() || this._randomFree()));

      // 乱斗难度血量修正
      if (this.mode === "free") {
        const mult = this.diff === "easy" ? 0.8 : (this.diff === "extreme" ? 1.35 : (this.diff === "hard" ? 1.2 : 1));
        enemies.forEach(u => { if (!u.ch.boss) { u.maxhp = Math.max(4, Math.round(u.maxhp * mult)); u.hp = u.maxhp; } });
      } else {
        // 剧情/生存：敌方血池随人数递减，避免一对多时输出不敷
        const stg = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
        let k = (stg && stg.hpScale !== undefined) ? stg.hpScale
          : (enemies.length >= 4 ? 0.62 : (enemies.length === 3 ? 0.7 : (enemies.length === 2 ? 0.85 : 1)));
        if (this.diff === "extreme") k *= 1.25;   // 极难：敌方更耐打
        if (k !== 1) enemies.forEach(u => { u.maxhp = Math.max(4, Math.round(u.maxhp * k)); u.hp = u.maxhp; });
        this._hpScale = k;
      }

      this.units = [p, ...allies, ...enemies];
      this.player = p;
      if (p.boons.shield > 0) p.st.shield += p.boons.shield;
      this._trackMinHp(p);
      this.roundDealt = 0;
      this.pushLog("—— 马刀场开。规则至简，而引人入胜。——");
    }

    _place(u, rc) { u.r = rc[0]; u.c = rc[1]; u.rx = u.c; u.ry = u.r; }

    _randomFree() {
      for (let t = 0; t < 120; t++) {
        const r = Math.floor(Math.random() * SIZE), c = Math.floor(Math.random() * SIZE);
        if (this.passable(r, c)) return [r, c];
      }
      for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (this.passable(r, c)) return [r, c];
      return [3, 3];
    }

    _survivalWave(n) {
      const list = [];
      const count = Math.min(1 + Math.ceil(n / 2), 4);
      for (let i = 0; i < count; i++) list.push("mob");
      if (n === 5) list.push("hanxiao");
      if (n === 10) list.push("wonder");
      if (n === 15) list.push("chongguo");
      if (n === 20) list.push("weibing");
      if (n > 20 && n % 5 === 0) list.push(["hanxiao", "wonder", "chongguo", "weibing", "touge"][n / 5 % 5 | 0]);
      return list;
    }

    /* 可通行：在界内、非障碍、无单位（不含城墙——城墙是"同城"语义，可走） */
    passable(r, c) {
      return inB(r, c) && !this.blocked.has(r + "," + c) && !this.unitAt(r, c);
    }

    unitAt(r, c) {
      if (!this.units) return null;   // 布阵阶段 units 尚未装配
      return this.units.find(u => u.alive && u.offField <= 0 && u.r === r && u.c === c) || null;
    }
    living(side) { return this.units.filter(u => u.alive && u.offField <= 0 && (!side || u.side === side)); }
    opponentsOf(u) {
      const hostile = u.side === "enemy" ? ["player", "ally"] : ["enemy"];
      return this.units.filter(x => x.alive && x.offField <= 0 && hostile.includes(x.side));
    }

    pushLog(s) { this.log.push(s); if (this.log.length > 120) this.log.shift(); if (window.SJI_UI) window.SJI_UI.onLog(s); }

    /* ---------- 伤害核心 ---------- */
    _passiveImmuneStun(u) { return u.charId === "xiannv" || u.charId === "wanzhen"; }

    calcDamage(att, def, base, opts = {}) {
      let dmg = base;
      const t = opts.type || "knife";
      if (t === "knife") {
        if (att.charId === "dage" && isWall(att.r, att.c)) dmg += 1;
        if (att.charId === "weirong") dmg += 1;
        dmg += att.boons.knife || 0;
      }
      if (t === "horse") dmg += att.boons.horse || 0;
      if (att.charId === "luhao" && t === "knife") dmg *= 2;   // 大腹如斗：刀击数值翻倍
      if (att.boons && att.boons.firstStrike && t === "knife" && !att._usedFirstStrike) {
        att._usedFirstStrike = true; dmg += att.boons.firstStrike;
      }
      if (att.charId === "wenbin" && t === "knife" && Math.random() < 0.3) {   // 秒之：三成机率双倍
        dmg *= 2;
        this.pushLog("「斌」秒之！一笔算出，伤害翻倍。");
        window.SJI_UI.fxFloat(def, "秒之！", "#ffd98a");
      }
      if (att.st.bloodlust > 0 && !opts.noBlood) { dmg *= 2; att.st.bloodlust--; }
      if (att.st.empower > 0) { dmg += att.st.empower; att.st.empower = 0; }
      if (att.st.grudge > 0) { dmg += att.st.grudge; att.st.grudge = 0; }
      if (att.charId === "yurun" && att.hp < 5) dmg += 1;
      if (att.charId === "shaoming" && def.hp <= def.maxhp / 2) dmg += 1;
      if (att.charId === "qinfa" && def.hp <= def.maxhp / 2) dmg += 1;
      if (att.charId === "dazhan" && this._keaiAdjacent(att)) dmg += 1;
      // 剧情规则：敌人相邻同门
      if (opts.dyad && (opts.type === "knife" || opts.type === "horse") && att.side === "enemy" && this.living("enemy").length === 2 && this._friendlyAdjacent(att)) dmg += 1;
      if (att.side === "enemy" && !opts.noScale) {
        const sc = this.enemyDmgScale();
        if (sc !== 1) dmg = Math.max(1, Math.round(dmg * sc));
      }
      // 守方减伤
      if (!opts.pierce) {
        if (def.charId === "hanxiao") dmg -= 1;
        if (def.charId === "zichen" && adj(att, def)) dmg -= 1;
        if (def.charId === "yiran" && !def.dampUsed) { dmg -= 1; def.dampUsed = true; }
        if (def.st.shield > 0) { const ab = Math.min(def.st.shield, dmg); def.st.shield -= ab; dmg -= ab; }
      }
      return Math.max(opts.min0 ? 0 : 1, dmg);
    }

    _friendlyAdjacent(u) {
      const same = u.side === "enemy" ? "enemy" : u.side;
      return this.living(same).some(x => x !== u && adj(x, u));
    }
    _keaiAdjacent(dazhan) {
      return this.units.some(x => x.alive && x.offField <= 0 && x.charId === "keai" && x.side === dazhan.side && adj(x, dazhan));
    }

    async dealDamage(att, def, base, opts = {}) {
      if (!def.alive || def.offField > 0 || this.over) return 0;
      if (window.SJI_UI && window.SJI_UI.fxAttack) window.SJI_UI.fxAttack(att, def, { type: opts.type || "knife" });
      const pierce = opts.pierce || (att && att.charId === "weibing");
      // 闪避
      if (!pierce && !opts.noDodge) {
        let dodge = 0;
        if (def.charId === "guayu") dodge += 0.2;
        if (def.charId === "xiangdong") dodge += 0.25;
        dodge += def.boons.dodge || 0;
        if (dodge > 0 && Math.random() < dodge) {
          this.pushLog("「" + def.ch.hao + "」疾如电，避之！");
          window.SJI_UI.fxFloat(def, "闪避！", "#7fb2ff");
          window.SJI_AUDIO.dodge();
          return 0;
        }
      }
      let dmg = this.calcDamage(att, def, base, { ...opts, pierce });
      def.hp -= dmg;
      this._trackMinHp(def);
      if (att.side === "player") { this.roundDealt += dmg; att.roundDealt = (att.roundDealt || 0) + dmg; }
      // 小川被动
      if (def.charId === "xiaochuan" && dmg > 0) def.st.grudge = Math.min(2, def.st.grudge + 1);
      if (def.alive && def.hp > 0 && def.hp <= def.maxhp / 2) {
        if (def.side === "player") this._checkTriggers("playerLow");
        else if (def.side === "enemy") this._checkTriggers("enemyLow", def.charId);
      }
      window.SJI_UI.fxHit(def, dmg, opts);
      window.SJI_AUDIO[(opts.type === "horse") ? "kick" : (dmg >= 3 ? "crit" : "hit")]();
      const verb = opts.type === "horse" ? "以马踢之" : (opts.type === "skill" ? "以技击之" : (opts.type === "poison" ? "受毒" : "以刀击之"));
      const src = att ? "「" + att.ch.hao + "」" + verb + "「" + def.ch.hao + "」，损" + dmg + "血。" : "「" + def.ch.hao + "」损" + dmg + "血。";
      this.pushLog(src);
      if (att && att.side === "player" && att.roundDealt >= 5) { att.roundDealt = -999; this.stats.rushHit = true; }
      if (def.hp <= 0) {
        if (!opts.pierce && this._tryLethalSave(def)) return dmg;
        def.hp = 0; def.alive = false;
        this.pushLog("「" + def.ch.hao + "」倒下了！");
        window.SJI_AUDIO.die();
        if (def.side === "enemy") {
          this.stats.kills++;
          if (att && att.side === "player") {
            const baseHeal = (this.diff === "extreme") ? 0 : 2;   // 极难：击破不再回血
            const heal = baseHeal + (att.boons.killHeal || 0);
            if (heal > 0) this.heal(this.player, heal, "大胜而归，");
          }
          this._checkTriggers("enemyDown", def.charId);
        }
        if (window.SJI_UI && window.SJI_UI.fxDeath) window.SJI_UI.fxDeath(def);
      }
      return dmg;
    }

    /* 记录玩家全程最低血量（成就「破败城墙」用） */
    _trackMinHp(u) {
      if (u !== this.player) return;
      const cur = Math.max(0, u.hp);
      this.stats.minHp = (this.stats.minHp === undefined) ? cur : Math.min(this.stats.minHp, cur);
    }

    _tryLethalSave(def) {
      if (def.charId === "guyin" && !def.usedSave) { def.usedSave = true; def.hp = 1; this.pushLog("皇太子庇佑！「因」保留一血。"); window.SJI_UI.fxFloat(def, "皇太子！", "#ffd700"); return true; }
      if (def.charId === "xiangdong" && !def.usedSave) { def.usedSave = true; def.hp = 1; this.pushLog("「东」乘乱潜逃，保留一血！"); window.SJI_UI.fxFloat(def, "潜逃！", "#9db8ff"); return true; }
      if (def.charId === "chongguo" && !def.usedSave) { def.usedSave = true; def.hp = 3; this.pushLog("「国」弃车保帅，回复三血！"); window.SJI_UI.fxFloat(def, "弃车保帅！", "#9dff9d"); return true; }
      return false;
    }

    rawHurt(def, n, why) {
      if (!def.alive) return;
      def.hp -= n;
      this._trackMinHp(def);
      window.SJI_UI.fxHit(def, n, { poison: why === "毒" });
      this.pushLog("「" + def.ch.hao + "」" + why + "，损" + n + "血。");
      if (def.hp <= 0) {
        if (this._tryLethalSave(def)) return;
        def.hp = 0; def.alive = false;
        this.pushLog("「" + def.ch.hao + "」倒下了！");
        window.SJI_AUDIO.die();
        if (def.side === "enemy") { this.stats.kills++; this._checkTriggers("enemyDown", def.charId); }
        if (window.SJI_UI && window.SJI_UI.fxDeath) window.SJI_UI.fxDeath(def);
      }
    }

    heal(u, n, why) {
      if (!u.alive) return;
      const real = Math.min(n, u.maxhp - u.hp);
      if (real <= 0) return;
      u.hp += real;
      if (u.side === "player") {
        this.stats.heals += real;
        if (window.SJI_SAVE && window.SJI_SAVE.bump) window.SJI_SAVE.bump("heals", real);
      }
      window.SJI_UI.fxFloat(u, "+" + real, "#7fe08a");
      window.SJI_AUDIO.heal();
      this.pushLog("「" + u.ch.hao + "」" + (why || "回复") + real + "血。");
    }

    stun(u, rounds, why) {
      if (this._passiveImmuneStun(u)) { this.pushLog("「" + u.ch.hao + "」朗声诵书，不为所动！"); return; }
      u.st.skip = Math.max(u.st.skip, rounds);
      this.pushLog("「" + u.ch.hao + "」" + (why || "被惑") + "，下回合跳过。");
    }

    async pushUnit(u, fromR, fromC, steps) {
      if (u.charId === "touge") { this.pushLog("「头」与球棍意念合一，岿然不动。"); return; }
      const dr = Math.sign(u.r - fromR), dc = Math.sign(u.c - fromC);
      let moved = 0;
      for (let i = 0; i < steps; i++) {
        const nr = u.r + (dr || 0), nc = u.c + (dc || 0);
        if (!this.passable(nr, nc)) break;
        u.r = nr; u.c = nc; moved++;
        window.SJI_UI.snap(u);
        await sleep(90);
      }
      if (moved > 0) this.pushLog("「" + u.ch.hao + "」被击退" + moved + "格。");
    }

    /* ---------- 行动原语 ---------- */
    /* 记录可撤销的移动快照（仅玩家、仅本回合、且此后未造成伤害） */
    _pushUndo(u) {
      if (!u._undo) u._undo = [];
      if (u._undo.length > 12) u._undo.shift();
      u._undo.push({ r: u.r, c: u.c, apNow: u.apNow });
    }

    undoMove() {
      const p = this.player;
      if (!p._undo || !p._undo.length) return false;
      const st = p._undo.pop();
      p.r = st.r; p.c = st.c; p.apNow = st.apNow;
      this.stats.moves = Math.max(0, this.stats.moves - 1);
      if (window.SJI_SAVE && window.SJI_SAVE.bump) window.SJI_SAVE.bump("moves", -1);
      if (window.SJI_UI && window.SJI_UI.snap) window.SJI_UI.snap(p);
      this.pushLog("「" + p.ch.hao + "」退回原位（行动点已退还）。");
      return true;
    }

    /* 任何"会造成影响"的行动都会封住撤销（避免用撤销试探信息） */
    lockUndo() {
      for (const u of this.units) if (u._undo) u._undo.length = 0;
    }

    async doMove(u, r, c) {
      if (u.apNow <= 0) return false;
      if (!this.passable(r, c)) return false;
      if (u.side === "player") this._pushUndo(u);
      u.apNow--; u.r = r; u.c = c;
      if (u.side === "player") {
        this.stats.moves++;
        window.SJI_SAVE.bump("moves");
        if (!isWall(r, c)) this.stats.everLeftWall = true;
      }
      window.SJI_AUDIO.click();
      this.pushLog("「" + u.ch.hao + "」" + (isWall(r, c) ? "行于城墙" : "行于空地") + "。");
      return true;
    }

    async doBuyKnife(u) {
      const free = u.charId === "lifan";
      if (u.hasKnife || (!free && u.apNow <= 0)) return false;
      if (!free) u.apNow--;
      u.hasKnife = true;
      window.SJI_AUDIO.select();
      this.pushLog("「" + u.ch.hao + "」市刀。" + (free ? "（课代表夺权，分文不取）" : ""));
      return true;
    }

    async doBuyHorse(u) {
      if (u.hasHorse || u.apNow <= 0) return false;
      u.apNow--;
      this.lockUndo();
      u.hasHorse = true;
      if (u.side === "player") this.stats.boughtHorse = true;
      window.SJI_AUDIO.select();
      this.pushLog("「" + u.ch.hao + "」市马。");
      return true;
    }

    async doKnife(u, t) {
      if (!u.hasKnife || u.apNow <= 0 || !t || !t.alive) return false;
      if (u.st.seal > 0) {
        if (u.side === "player") this.pushLog("「" + u.ch.hao + "」之刀被缴，此回合不能击。");
        return false;
      }
      if (!adj(u, t)) return false;
      u.apNow--;
      this.lockUndo();
      const dyad = !!this.rule && this.rule.id === "dyad";
      const extra = u.boons.cleave || 0;
      // 刀势横扫：波及"主目标"的相邻者（不含主目标自身与攻击者）
      const splash = extra ? this.opponentsOf(u).filter(f => f !== t && adj(t, f)).slice(0, extra) : [];
      await this.dealDamage(u, t, 1, { type: "knife", dyad });
      for (const f of splash) {
        if (!f.alive) continue;
        this.pushLog("刀势未歇，波及「" + f.ch.hao + "」！");
        await this.dealDamage(u, f, 1, { type: "knife" });
      }
      return true;
    }

    async doHorse(u, t) {
      if (!u.hasHorse || u.apNow <= 0 || !t || !t.alive) return false;
      if (!isWall(u.r, u.c) || !isWall(t.r, t.c) || manh(u, t) > 3 + (u.boons.horseRange || 0)) return false;
      u.apNow--;
      this.lockUndo();
      const dealt = await this.dealDamage(u, t, 3, { type: "horse" });
      if (t.alive) {
        // 踢下城：寻相邻空地
        let best = null;
        for (const [dr, dc] of DIRS) {
          const nr = t.r + dr, nc = t.c + dc;
          if (this.passable(nr, nc) && !isWall(nr, nc)) { best = [nr, nc]; break; }
        }
        if (best) {
          t.r = best[0]; t.c = best[1];
          window.SJI_UI.snap(t);
          this.pushLog("「" + t.ch.hao + "」被踢下城墙！");
          if (t.side === "player") this.stats.everLeftWall = true;
        } else {
          this.rawHurt(t, 1, "撞墙");
        }
      }
      return dealt >= 0;
    }

    async doSacrifice(u) {
      if (u.apNow <= 0 || (!u.boons.bloodFree && u.hp < 2)) return false;
      u.apNow--;
      this.lockUndo();
      const loss = u.boons.bloodFree ? 0 : Math.floor(u.hp / 2);
      u.hp -= loss;
      this._trackMinHp(u);
      u.st.bloodlust += (u.charId === "wonder" || u.boons.blood2) ? 2 : 1;
      if (u.side === "player") this.stats.usedBlood = true;
      window.SJI_UI.fxFloat(u, "-" + loss + " 血祭", "#ff5a5a");
      window.SJI_UI.fxStatus(u, "血祭！");
      if (window.SJI_UI && window.SJI_UI.fxVignette) window.SJI_UI.fxVignette("166,58,43");
      window.SJI_AUDIO.sacrifice();
      this.pushLog("「" + u.ch.hao + "」血祭！" + (loss ? "损" + loss + "血，" : "以道代血，毫发无伤，")
        + "下次伤害翻倍" + (u.st.bloodlust > 1 ? "（两度）" : "") + "。");
      if (u.hp <= 0) { u.hp = 0; u.alive = false; this.pushLog("「" + u.ch.hao + "」血祭过甚，倒下了！"); }
      return true;
    }

    /* ---------- 技能 ---------- */
    skillOf(u, idx) {
      const ch = u.ch;
      if (ch.skills) return ch.skills[idx || 0];
      return ch.skill;
    }
    skillReady(u, idx) {
      const sk = this.skillOf(u, idx);
      if (!sk) return false;
      return (u.cds[idx || 0] || 0) <= 0;
    }
    skillCd(u, idx) { return u.cds[idx || 0] || 0; }
    _startCd(u, idx) {
      const sk = this.skillOf(u, idx);
      u.cds[idx || 0] = Math.max(1, (sk.cd || 1) - (u.boons.cdReduce || 0));
    }

    async doSkill(u, idx, target) {
      const sk = this.skillOf(u, idx);
      if (!sk || !this.skillReady(u, idx) || u.apNow < (sk.ap || 1)) return false;
      if (u.st.silence > 0) { this.pushLog("「" + u.ch.hao + "」被沉默，技不能出。"); return false; }
      const k = sk.kind;
      const dyad = !!this.rule && this.rule.id === "dyad";
      u.apNow -= (sk.ap || 1);
      this.lockUndo();
      this._startCd(u, idx);
      if (u.side === "player") this.stats.usedSkill = true;
      window.SJI_AUDIO.skill();
      this.pushLog("「" + u.ch.hao + "」施「" + sk.name + "」！");

      const foes = this.opponentsOf(u);
      if (k === "unit") {
        if (!target || !target.alive) return false;
        switch (u.charId) {
          case "dage":
            await this.dealDamage(u, target, 1, { type: "skill", dyad }); this.stun(target, 1, "得护手霜而惑");
            break;
          case "shenren": this.stun(target, 1, "得原神明信片，欣然把玩"); break;
          case "xiannv":
            await this.dealDamage(u, target, 2, { type: "skill", dyad });
            if (target.alive) await this.pushUnit(target, u.r, u.c, 1);
            break;
          case "wonder": {
            const bonus = (target.hp % 2 === 0) ? 1 : 0;
            if (bonus) this.pushLog("其血为偶，数学之感，伤害+1！");
            await this.dealDamage(u, target, 2 + bonus, { type: "skill", dyad });
            break;
          }
          case "wenbin": await this.dealDamage(u, target, 2, { type: "skill", dyad }); break;
          case "luhao":
            await this.dealDamage(u, target, 2, { type: "skill", dyad });
            if (target.alive) { target.st.apMod -= 1; this.pushLog("锦绣昼行！「" + target.ch.hao + "」下回合行动-1。"); }
            break;
          case "xiaochuan":
            await this.dealDamage(u, target, 1, { type: "skill", dyad });
            if (target.alive) { target.st.seal = Math.max(target.st.seal, 1); this.pushLog("王霸之气！「" + target.ch.hao + "」下回合不能攻击。"); }
            break;
          case "guyin": {
            await this.dealDamage(u, target, 2, { type: "skill", dyad });
            if (u.alive && Math.random() < 0.15) { this.pushLog("误伤己手！"); this.rawHurt(u, 1, "坤拳误伤"); }
            break;
          }
          case "shaoming": await this.dealDamage(u, target, 3, { type: "skill", dyad }); break;
          case "xinhui":
            await this.dealDamage(u, target, 2, { type: "skill", dyad });
            if (target.alive) await this.pushUnit(target, u.r, u.c, 2);
            break;
          case "yiran":
            await this.dealDamage(u, target, 2, { type: "skill", dyad });
            this.heal(u, 1, "拍肚皮自得，");
            break;
          case "dazhan": await this.dealDamage(u, target, 3, { type: "skill", dyad }); break;
          case "limo":
            await this.dealDamage(u, target, 1, { type: "skill", dyad });
            this.heal(u, 1, "争食而肥，");
            break;
          case "xiangdong": await this.dealDamage(u, target, 2, { type: "skill", dyad }); break;
          case "wanzhen": await this.dealDamage(u, target, 2, { type: "skill", dyad }); break;
          case "weirong":
            target.st.apMod -= 2;
            this.pushLog("「" + target.ch.hao + "」奇彪无比！下回合行动-2。");
            break;
          case "qinfa":
            target.st.seal = Math.max(target.st.seal, 1);
            this.pushLog("当场抓获！「" + target.ch.hao + "」下回合不能攻击。");
            break;
          case "weibing": {
            // 破门而入：瞬移至目标相邻
            const spot = DIRS.map(([dr, dc]) => [target.r + dr, target.c + dc])
              .find(([r, c]) => this.passable(r, c));
            if (spot) { u.r = spot[0]; u.c = spot[1]; window.SJI_UI.snap(u); }
            target.st.disarm = Math.max(target.st.disarm, 1);
            this.pushLog("破门而入！「" + target.ch.hao + "」之刀被没收一回合。");
            await this.dealDamage(u, target, 1, { type: "skill", pierce: true });
            break;
          }
          case "hanxiao":
            if (this._passiveImmuneStun(target)) { this.pushLog("不为所动！"); break; }
            if (target.offField > 0) { this.pushLog("「" + target.ch.hao + "」已在家中。"); break; }
            target.homeR = target.r; target.homeC = target.c;
            target.offField = 1;
            this.pushLog("「" + target.ch.hao + "」被遣返回家，跳过下个回合后归位！");
            window.SJI_UI.fxFloat(target, "遣返回家！", "#ffb14e");
            break;
          case "keai": this.heal(target, 2, "得一糖，"); break;
          case "shengxiang": await this.dealDamage(u, target, 2, { type: "skill", dyad }); break;
          case "qiyue": await this.dealDamage(u, target, 2, { type: "skill", dyad }); break;
          case "lianqi": await this.dealDamage(u, target, 2, { type: "skill", dyad }); break;
          case "ziye":
            await this.dealDamage(u, target, 1, { type: "skill", dyad });
            if (target.alive) { target.st.apMod -= 1; this.pushLog("谗言入耳！「" + target.ch.hao + "」下回合行动-1。"); }
            break;
          case "tree": await this.dealDamage(u, target, 1, { type: "skill", dyad }); break;
          default: await this.dealDamage(u, target, 1, { type: "skill", dyad });
        }
        return true;
      }
      if (k === "self") {
        if (u.charId === "yurun") this.heal(u, 3, "得面包，");
        if (u.charId === "guayu") {
          u.st.empower += 1;
          u.apNow += 2;   // 立即多出2行动点（可即刻再行两步）
          this.pushLog("提壶狂奔！「呱」行动点+2，下次伤害+1。");
          window.SJI_UI.fxFloat(u, "+2 动", "#ffd98a");
        }
        return true;
      }
      if (k === "adj") {
        for (const f of foes.filter(f => cheb(u, f) <= 1).slice()) {
          await this.dealDamage(u, f, 2, { type: "skill", dyad });
          if (f.alive && u.charId === "touge") { f.st.poison = Math.max(f.st.poison, 2); this.pushLog("「" + f.ch.hao + "」中溴毒！"); }
        }
        return true;
      }
      if (k === "raoe") {
        const rng = sk.range || 2;
        for (const f of foes.filter(f => cheb(u, f) <= rng).slice()) {
          if (u.charId === "lifan") {
            if (Math.random() < 0.5) this.stun(f, 1, "闻Say You而笑场");
          } else if (u.charId === "zichen") {
            await this.dealDamage(u, f, 1, { type: "skill", dyad });
            if (f.alive) { f.st.apMod -= 1; }
          } else if (u.charId === "shibo") {
            await this.dealDamage(u, f, 2, { type: "skill", dyad });
          } else if (u.charId === "chongguo") {
            if (!this._passiveImmuneStun(f)) {
              f.st.silence = Math.max(f.st.silence, 1);
              this.pushLog("「" + f.ch.hao + "」被评职称所困，本回合不能施技！");
            } else {
              this.pushLog("「" + f.ch.hao + "」不为所动！");
            }
          }
        }
        if (u.charId === "zichen") this.pushLog("夺话筒：马上解散，毋恐担责，凡有责任，在吾一人！");
        return true;
      }
      if (k === "summon") {
        // 树木皆死：场上至多三株，否则战斗会被无限拖长
        const live = this.units.filter(x => x.alive && x.charId === "tree" && x.side === u.side).length;
        if (live >= 3) {
          this.pushLog("崇国欲再种树，然树木皆死，地上已无隙可种。");
          return true;
        }
        const spot = DIRS.map(([dr, dc]) => [u.r + dr, u.c + dc]).find(([r, c]) => this.passable(r, c));
        if (spot) {
          const tr = makeUnit("tree", u.side, this.units.length);
          this._place(tr, spot);
          this.units.push(tr);
          this.pushLog("崇国种树一株！它看起来……快要死了。");
          window.SJI_UI.snap(tr);
        }
        return true;
      }
      return false;
    }

    /* ---------- AI ---------- */
    _reachable(u, budget) {
      const seen = new Set([u.r + "," + u.c]);
      let frontier = [[u.r, u.c]];
      const dist = { [u.r + "," + u.c]: 0 };
      for (let d = 0; d < budget; d++) {
        const next = [];
        for (const [r, c] of frontier) {
          for (const [dr, dc] of DIRS) {
            const nr = r + dr, nc = c + dc;
            const key = nr + "," + nc;
            if (!this.passable(nr, nc) || seen.has(key)) continue;
            seen.add(key); dist[key] = d + 1; next.push([nr, nc]);
          }
        }
        frontier = next;
      }
      return { keys: [...seen], dist };
    }

    moveRange(u) {
      let mv = 1;
      if (u.charId === "dazhan" || u.charId === "limo") mv = 2;
      mv += u.boons.move || 0;
      return mv;
    }

    _stepToward(u, target) {
      const budget = this.moveRange(u);
      const reach = this._reachable(u, budget);
      let best = null, bestD = manh(u, target);
      for (const key of reach.keys) {
        const [r, c] = key.split(",").map(Number);
        if (this.unitAt(r, c)) continue;
        const d = Math.abs(r - target.r) + Math.abs(c - target.c);
        if (d < bestD || (d === bestD && best && reach.dist[key] < reach.dist[best])) { best = key; bestD = d; }
      }
      if (!best) return null;
      return best.split(",").map(Number);
    }

    aiPickSkill(u) {
      const ch = u.ch;
      // 治疗/辅助类技能（如可怡「一糖之恩」）目标应是己方，而非对手
      if (u.charId === "keai") {
        const allies = this.units.filter(x => x.alive && x.offField <= 0 && x.side === u.side);
        const hurt = allies.filter(a => a.hp < a.maxhp).sort((a, b) => a.hp - b.hp)[0];
        if (hurt && this.skillReady(u, 0) && u.apNow >= (this.skillOf(u, 0).ap || 1)) return { idx: 0, target: hurt };
        return null;
      }
      const idxs = ch.skills ? [0, 1] : [0];
      const foes = this.opponentsOf(u);
      for (const i of idxs) {
        const sk = this.skillOf(u, i);
        if (!sk || !this.skillReady(u, i) || u.apNow < (sk.ap || 1) || u.st.silence > 0) continue;
        if (sk.kind === "self") { if (u.hp <= u.maxhp - 2) return { idx: i, target: null }; continue; }
        if (sk.kind === "summon") return { idx: i, target: null };
        const rng = sk.kind === "adj" ? 1 : (sk.range || 2);
        const inRange = foes.filter(f => cheb(u, f) <= (sk.kind === "raoe" ? rng : (sk.kind === "adj" ? 1 : rng)));
        if (sk.kind === "adj") { if (foes.some(f => adj(u, f))) return { idx: i, target: null }; continue; }
        if (sk.kind === "raoe") { if (inRange.length >= (u.charId === "lifan" ? 1 : 1)) return { idx: i, target: null }; continue; }
        if (inRange.length) {
          inRange.sort((a, b) => a.hp - b.hp);
          return { idx: i, target: inRange[0] };
        }
      }
      return null;
    }

    async aiAct(u) {
      // 回合开始状态结算
      if (u.offField > 0) {
        u.offField--; u.apNow = 0;
        if (u.offField <= 0) this._returnHome(u);
        else this.pushLog("「" + u.ch.hao + "」犹在返家途中……");
        return;
      }
      if (this._tickStatusStart(u)) {
        this.pushLog("「" + u.ch.hao + "」晕眩/被惑，跳过此回合。");
        window.SJI_UI.fxFloat(u, "跳过", "#cccc88");
        this._tickStatusEnd(u);
        return;
      }
      window.SJI_UI.onState();
      await sleep(240);
      let guard = 0;
      const prof = (u.side === "ally")
        ? { skill: 0.9, sac: 0.4, retreat: 0.1, keep: 0, focus: "weakest", horse: 1 }
        : (this.diff === "extreme"
            ? { skill: 1.0, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }   // 极难：敌方死战不退
            : this.aiProfile());
      while (u.apNow > 0 && u.alive && !this.over && guard++ < 10) {
        const foes = this.opponentsOf(u);
        if (!foes.length) break;
        let target = this._pickTarget(u, foes, prof.focus);
        // 党争：二成机率打最近之任何人
        if (this.rule && this.rule.id === "chaos" && u.side === "enemy" && Math.random() < 0.2) {
          const all = this.units.filter(x => x.alive && x.offField <= 0 && x !== u && x.side !== "enemy");
          const allies = this.units.filter(x => x.alive && x.offField <= 0 && x !== u && x.side === "enemy");
          const pool = [...all, ...allies];
          if (pool.length) {
            target = pool.slice().sort((a, b) => manh(u, a) - manh(u, b))[0];
            this.pushLog("党争起！「" + u.ch.hao + "」认错了人……");
          }
        }
        // 买刀
        if (!u.hasKnife) { await this.doBuyKnife(u); await sleep(180); continue; }
        // 残血撤退（消极/守成）
        if (prof.retreat > 0 && u.hp <= u.maxhp * 0.34 && Math.random() < prof.retreat) {
          const back = this._stepAway(u, target);
          if (back && !(back[0] === u.r && back[1] === u.c)) {
            await this.doMove(u, back[0], back[1]);
            this.pushLog("「" + u.ch.hao + "」见势不妙，退避三舍。");
            await sleep(260);
            continue;
          }
        }
        // 技能（按进攻性决定使用意愿）
        const skillP = Math.max(0.05, Math.min(1, prof.skill + (u.aggr - 0.6) * 0.25));
        if (Math.random() < skillP) {
          const pick = this.aiPickSkill(u);
          if (pick) { await this.doSkill(u, pick.idx, pick.target); await sleep(320); continue; }
        }
        // 血祭抢攻（按进攻性）
        if (u.st.bloodlust <= 0 && adj(u, target) && u.hp >= 5 && Math.random() < prof.sac) {
          await this.doSacrifice(u); await sleep(300); continue;
        }
        // 刀击
        if (u.hasKnife && u.st.seal <= 0 && adj(u, target)) {
          await this.doKnife(u, target); await sleep(300); continue;
        }
        // 马踢（同城）
        if (u.hasHorse && isWall(u.r, u.c) && isWall(target.r, target.c) && manh(u, target) <= 3) {
          await this.doHorse(u, target); await sleep(300); continue;
        }
        // 买马：城墙之上、或目标在城墙上、或尚有余动（消极者不热衷）
        if (!u.hasHorse && u.apNow >= 2 && Math.random() < prof.horse && (isWall(u.r, u.c) || isWall(target.r, target.c))) {
          await this.doBuyHorse(u); await sleep(200); continue;
        }
        // 移动：消极者可能逡巡不前，其余逼近
        if (prof.keep > 0 && Math.random() < prof.keep && manh(u, target) > 2) {
          const idle = this._stepAway(u, target);
          if (idle && !(idle[0] === u.r && idle[1] === u.c)) {
            await this.doMove(u, idle[0], idle[1]);
            this.pushLog("「" + u.ch.hao + "」逡巡不前。");
            await sleep(260);
            continue;
          }
        }
        const step = this._stepToward(u, target);
        if (step && !(step[0] === u.r && step[1] === u.c)) { await this.doMove(u, step[0], step[1]); await sleep(260); continue; }
        // 无路可进时，若有余动则买马备战
        if (!u.hasHorse && u.apNow >= 1) { await this.doBuyHorse(u); await sleep(200); continue; }
        break;
      }
      this._tickStatusEnd(u);   // 该单位本回合结束：缴械/沉默到期
    }

    /* ---------- 断点续战：序列化 ---------- */
    serialize() {
      return {
        v: 1,
        cfg: {
          mode: this.mode, diff: this.diff, aiAggr: this.aiAggr,
          playerChar: this.cfg.playerChar,
          stageId: (this.cfg.stage && this.cfg.stage.id) || null,
          enemies: this.cfg.enemies || null,
          allies: this.cfg.allies || [],
          free: this.cfg.mode === "free",
          enemyIds: this.cfg.mode === "free" ? (this.cfg.enemies || []) : null
        },
        round: this.round, waveIndex: this.waveIndex, survivalWaveNo: this.survivalWaveNo || 1,
        boonsTaken: this.boonsTaken,
        result: this.result, over: false,
        stats: this.stats,
        units: this.units.map(u => ({
          charId: u.charId, side: u.side, uid: u.uid, hp: u.hp, maxhp: u.maxhp,
          r: u.r, c: u.c, alive: u.alive, offField: u.offField,
          hasKnife: u.hasKnife, hasHorse: u.hasHorse,
          st: u.st, cds: u.cds, usedSave: u.usedSave, boons: u.boons,
          homeR: u.homeR, homeC: u.homeC, apNow: u.apNow,
          _undo: u._undo, minHpSeen: u.minHpSeen
        })),
        log: this.log.slice(-40)
      };
    }

    static fromSave(snap, stages) {
      const stg = snap.cfg.stageId ? stages.find(x => x.id === snap.cfg.stageId) : null;
      const cfg = {
        mode: snap.cfg.mode, diff: snap.cfg.diff, aiAggr: snap.cfg.aiAggr,
        playerChar: snap.cfg.playerChar, stage: stg || undefined,
        enemies: snap.cfg.enemies || [], allies: snap.cfg.allies || [],
        rule: stg ? stg.rule : null, waves: stg ? stg.waves : undefined,
        triggeredReset: true
      };
      const b = new Battle(cfg);
      // 还原单位（按 uid 对齐，缺者忽略，多者丢弃）
      const saved = new Map(snap.units.map(u => [u.uid, u]));
      const keep = [];
      for (const u of b.units) {
        const su = saved.get(u.uid);
        if (!su) continue;
        Object.assign(u, {
          hp: su.hp, maxhp: su.maxhp, r: su.r, c: su.c, rx: su.c, ry: su.r,
          alive: su.alive, offField: su.offField, hasKnife: su.hasKnife, hasHorse: su.hasHorse,
          st: Object.assign({}, u.st, su.st), cds: su.cds || {}, usedSave: !!su.usedSave,
          boons: Object.assign({}, u.boons, su.boons), homeR: su.homeR, homeC: su.homeC,
          apNow: su.apNow || 0, _undo: su._undo || []
        });
        keep.push(u);
      }
      b.units = keep;
      b.player = keep.find(u => u.side === "player") || b.units[0];
      b.round = snap.round; b.waveIndex = snap.waveIndex;
      b.survivalWaveNo = snap.survivalWaveNo;
      b.boonsTaken = snap.boonsTaken || [];
      b.stats = Object.assign(b.stats, snap.stats || {});
      b.log = (snap.log || []).slice();
      return b;
    }

    /* ---------- 行动点 ---------- */
    calcAP(u, base) {
      let ap = base + (u.boons.apBonus || 0);
      ap += u.st.apMod || 0; u.st.apMod = 0;
      // 以寡敌众：每多一名敌人，玩家多得一点行动（至多+3），使一对多仍有输出
      if (u.side === "player") {
        const n = this.living("enemy").length;
        if (n > 1) {
          const bonus = Math.min(3, n - 1);
          ap += bonus;
          const hpBonus = Math.min(2, n - 1);
          if (!u._outnumberedHp) {
            u._outnumberedHp = hpBonus;
            u.maxhp += hpBonus; u.hp += hpBonus;
            this.pushLog("以寡敌众：行动点+" + bonus + "，血上限+" + hpBonus + "。");
          }
        }
      }
      if (u.charId === "xinhui" && this.round % 2 === 0) { ap += 1; this.pushLog("「慧」灵光乍现，行动点+1！"); }
      return Math.max(0, Math.min(8, ap));
    }

    enemyBaseAP() {
      const big = this.living("enemy").length >= 3;
      if (this.mode === "survival") return big ? 2 : 3;
      if (this.diff === "easy") return big ? 1 : 2;
      if (this.diff === "extreme") return big ? 3 : 5;
      if (this.diff === "hard") return big ? 2 : 4;
      return big ? 2 : 3;
    }

    /* AI 进攻性档位：影响技能使用、血祭、目标选择与是否撤退 */
    aiProfile() {
      const T = {
        passive:  { skill: 0.35, sac: 0.04, retreat: 0.7, keep: 0.55, focus: "nearest", horse: 0.3 },
        measured: { skill: 0.65, sac: 0.20, retreat: 0.35, keep: 0.25, focus: "nearest", horse: 0.7 },
        active:   { skill: 0.90, sac: 0.40, retreat: 0.10, keep: 0, focus: "weakest", horse: 1 },
        frenzy:   { skill: 1.00, sac: 0.75, retreat: 0, keep: 0, focus: "weakest", horse: 1 }
      };
      return T[this.aiAggr] || T.active;
    }

    _pickTarget(u, foes, focus) {
      if (!foes.length) return null;
      if (focus === "weakest") {
        return foes.slice().sort((a, b) => (a.hp - b.hp) || (manh(u, a) - manh(u, b)))[0];
      }
      return foes.slice().sort((a, b) => manh(u, a) - manh(u, b))[0];
    }

    /* 远离某目标的可达格（消极/守成在残血时用） */
    _stepAway(u, threat) {
      const reach = this._reachable(u, this.moveRange(u));
      let best = null, bestScore = -1e9;
      for (const key of reach.keys) {
        const [r, c] = key.split(",").map(Number);
        if (this.unitAt(r, c)) continue;
        const d = Math.abs(r - threat.r) + Math.abs(c - threat.c);
        const near = this.opponentsOf(u).filter(f => Math.max(Math.abs(f.r - r), Math.abs(f.c - c)) <= 1).length;
        const sc = d * 2 - near * 4;
        if (sc > bestScore) { bestScore = sc; best = [r, c]; }
      }
      return best;
    }

    /* 敌方伤害缩放：以少打多为常态，人多则单体伤害递减，避免围殴瞬杀 */
    enemyDmgScale() {
      const n = this.living("enemy").length;
      let base = n >= 4 ? 0.65 : (n === 3 ? 0.75 : (n === 2 ? 0.88 : 0.9));
      if (this.mode === "survival") base *= 0.9;
      if (this.diff === "extreme") base *= 1.35;
      else if (this.diff === "hard") base *= 1.15;
      else if (this.diff === "easy") base *= 0.7;
      return base;
    }

    /* ---------- 回合循环 ---------- */
    async run() {
      const ui = window.SJI_UI;
      while (!this.over) {
        this.round++;
        this.units.forEach(u => u.dampUsed = false);
        if (this.player._undo) this.player._undo.length = 0;
        for (const u of this.units) u._usedFirstStrike = false;
        await this._fireTriggers("roundStart");
        ui.onState();
        if (this.round > MAX_ROUND) { this.finish("timeout"); break; }
        // 起义援军
        if (this.rule && this.rule.id === "uprising" && this.round === 3) await this._spawnReinforcements();
        // 猜拳
        const rps = await ui.rpsRound(this);
        if (this.over) break;
        this.player.apNow = this.calcAP(this.player, rps.ap);
        this.living("ally").forEach(u => u.apNow = this.calcAP(u, 2));
        this.living("enemy").forEach(u => u.apNow = this.calcAP(u, this.enemyBaseAP()));
        ui.onState();
        // 玩家阶段（返家者本回合不得入场）
        if (this.player.offField > 0) {
          this.player.offField--;
          this.pushLog("「" + this.player.ch.hao + "」返家途中，此回合不得入场。");
          if (this.player.offField <= 0) this._returnHome(this.player);
          ui.onState();
          if (ui.banner) await ui.banner("返家途中", 900);
        } else if (this._tickStatusStart(this.player)) {
          // 被惑/晕眩：本回合跳过（此前玩家不经 aiAct，该项从未生效）
          this.pushLog("「" + this.player.ch.hao + "」晕眩/被惑，此回合跳过。");
          ui.onState();
          if (ui.banner) await ui.banner("此回合跳过", 900);
        } else {
          await ui.playerPhase(this);
        }
        // 缴械与沉默只封"本回合"，到此解除（否则会永久封锁）
        this._tickStatusEnd(this.player);
        ui.onState();
        if (this.over) break;
        // 友军
        for (const u of this.living("ally")) { await this.aiAct(u); if (this.over) break; }
        // 敌人
        for (const u of this.living("enemy")) { await this.aiAct(u); if (this.over) break; }
        if (this.over) break;
        await this._endRound();
      }
      return this.result;
    }

    async _spawnReinforcements() {
      this.pushLog("—— 起义！子琛之心腹二人入场：马上解散，毋恐担责！——");
      for (let i = 0; i < 2; i++) {
        const m = makeUnit("mob", "enemy", 100 + i);
        m.hp = m.maxhp = 9;
        const spot = this._freeNear(this.player.r, this.player.c, 3);
        this._place(m, spot);
        this.units.push(m);
        window.SJI_UI.snap(m);
      }
      ui_onState();
      function ui_onState() { window.SJI_UI.onState(); }
    }

    _freeNear(r, c, maxD) {
      for (let d = 1; d <= maxD + 3; d++) {
        for (let dr = -d; dr <= d; dr++) for (let dc = -d; dc <= d; dc++) {
          const nr = r + dr, nc = c + dc;
          if (this.passable(nr, nc)) return [nr, nc];
        }
      }
      return this._randomFree();
    }

    _returnHome(u) {
      if (!u.alive) return;
      const hr = (u.homeR !== undefined) ? u.homeR : u.r;
      const hc = (u.homeC !== undefined) ? u.homeC : u.c;
      // 占位判定须排除自身（归位时其 offField 已归零，会被 unitAt 误判为占位者）
      const taken = (r, c) => this.units.some(x => x !== u && x.alive && x.offField <= 0 && x.r === r && x.c === c);
      if (!taken(hr, hc)) { u.r = hr; u.c = hc; }
      else {
        let best = null, bd = 999;
        for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
          if (taken(r, c)) continue;
          const d = Math.abs(r - hr) + Math.abs(c - hc);
          if (d < bd) { bd = d; best = [r, c]; }
        }
        if (best) { u.r = best[0]; u.c = best[1]; this.pushLog("「" + u.ch.hao + "」原位被占，就近归队。"); }
      }
      if (window.SJI_UI.fxFloat) window.SJI_UI.fxFloat(u, "归来", "#7fe08a");
      this.pushLog("「" + u.ch.hao + "」返家归来，归于原位。");
    }

    /* ---------- 状态计时（玩家与 AI 共用） ---------- */
    /* 回合开始：若处于"跳过"，消耗一层并返回 true（本回合不得行动） */
    _tickStatusStart(u) {
      if (u.st.skip > 0) { u.st.skip--; u.apNow = 0; return true; }
      return false;
    }

    /* 回合结束：缴械与沉默恰好覆盖"受害者自己的这一个回合"，到此解除 */
    _tickStatusEnd(u) {
      if (u.st.seal > 0) u.st.seal--;
      if (u.st.silence > 0) u.st.silence--;
    }

    async _fireTriggers(when) {
      for (const t of this.triggers) {
        if (t.fired || t.when !== when) continue;
        if (when === "roundStart" && t.round !== this.round) continue;
        if (when === "waveStart" && t.wave !== this.waveIndex + 1) continue;
        t.fired = true;
        if (window.SJI_UI && window.SJI_UI.showDialogue) await window.SJI_UI.showDialogue(t.lines);
      }
    }

    _checkTriggers(when, arg) {
      for (const t of this.triggers) {
        if (t.fired || t.when !== when) continue;
        if (when === "enemyLow" && t.char !== arg) continue;
        if (when === "enemyDown" && t.char && t.char !== "any" && t.char !== arg) continue;
        t.fired = true;
        if (window.SJI_UI && window.SJI_UI.showDialogue) window.SJI_UI.showDialogue(t.lines);
      }
    }

    async _endRound() {
      this._trackMinHp(this.player);
      // 回合结束被动
      for (const u of this.living()) {
        if (u.charId === "shibo") this.heal(u, 1, "吸东来之紫气，");
        if (u.boons.regen) this.heal(u, u.boons.regen, "吐纳，");
        if (u.charId === "keai") {
          const dz = this.units.find(x => x.alive && x.charId === "dazhan" && x.side === u.side);
          if (dz && adj(u, dz)) this.heal(dz, 1, "可怡心善展，");
        }
      }
      for (const u of this.living()) {
        if (u.charId === "shenren") {
          const foes = this.opponentsOf(u).filter(f => adj(u, f));
          for (const f of foes) { this.rawHurt(f, 1, "近鲍鱼之肆而受毒"); await sleep(120); }
        }
        if (u.st.poison > 0) {
          u.st.poison--;
          this.rawHurt(u, 1, "毒发");
          await sleep(120);
        }
      }
      // 冷却
      for (const u of this.units) {
        for (const k of Object.keys(u.cds)) if (u.cds[k] > 0) u.cds[k]--;
        u.roundDealt = 0;
      }
      this.roundDealt = 0;
      ui_onState2();
      function ui_onState2() { window.SJI_UI.onState(); }
      // 断点续战：每回合末写一次快照（玩家可在标题页"继续上局"）
      if (window.SJI_SAVE && window.SJI_SAVE.saveBattle) {
        try { window.SJI_SAVE.saveBattle(this.serialize()); } catch (e) {}
      }
      await sleep(260);
      await this._checkBattleEnd();   // 必须等待：增益选择等弹层需在下一回合猜拳前结束
    }

    async _checkBattleEnd() {
      if (this.over) return;
      const foes = this.living("enemy");
      if (!this.player.alive) { this.finish("lose"); return; }
      if (foes.length === 0) {
        if (this.mode === "survival" || (this.waves.length > 1 && this.waveIndex < this.waves.length - 1)) {
          await this._nextWave();   // 等待波次流程（含增益选择）完毕
        } else {
          this.finish("win");
        }
      }
    }

    async _nextWave() {
      this.waveIndex++;
      if (this.mode === "survival") {
        this.survivalWaveNo = this.waveIndex + 1;
        this.pushLog("—— 第" + this.survivalWaveNo + "波将至，苔藓不尽…… ——");
        // 选增益
        const boon = await window.SJI_UI.pickBoon(this);
        if (boon) this._applyBoon(this.player, boon);
        this.heal(this.player, 3, "战间休整，");
        const ids = this._survivalWave(this.survivalWaveNo);
        const scale = 1 + 0.05 * (this.survivalWaveNo - 1);
        ids.forEach((id, i) => {
          const m = makeUnit(id, "enemy", 200 + this.waveIndex * 10 + i);
          m.maxhp = Math.round(m.maxhp * scale); m.hp = m.maxhp;
          const spot = this._freeSpawnFar();
          this._place(m, spot);
          this.units.push(m);
          window.SJI_UI.snap(m);
        });
        this.pushLog("第" + this.survivalWaveNo + "波：" + ids.length + "人入场。");
        window.SJI_UI.onState();
      } else {
        const stgR = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
        if (stgR && stgR.restFull) {
          this.pushLog("—— 下一阵！赛事之间，得以充分休整。——");
          this.heal(this.player, this.player.maxhp, "充分休整，");
        } else {
          const rest = Math.max(4, Math.ceil(this.player.maxhp * 0.6));
          this.pushLog("—— 下一阵！阵间休整回复" + rest + "血。——");
          this.heal(this.player, rest, "阵间休整，");
        }
        const ids = this.waves[this.waveIndex] || [];
        const stg2 = (this.cfg && this.cfg.stage) ? this.cfg.stage : null;
        const k = (stg2 && stg2.hpScale !== undefined) ? stg2.hpScale
          : (ids.length >= 4 ? 0.62 : (ids.length === 3 ? 0.7 : (ids.length === 2 ? 0.85 : 1)));
        ids.forEach((id, i) => {
          const m = makeUnit(id, "enemy", 300 + this.waveIndex * 10 + i);
          if (k !== 1) { m.maxhp = Math.max(4, Math.round(m.maxhp * k)); m.hp = m.maxhp; }
          const spot = this._freeSpawnFar();
          this._place(m, spot);
          this.units.push(m);
          window.SJI_UI.snap(m);
        });
        window.SJI_UI.onState();
        await this._fireTriggers("waveStart");
      }
      // 清负面
      const p = this.player;
      Object.assign(p.st, { skip: 0, poison: 0, apMod: 0, disarm: 0, silence: 0, seal: 0 });
    }

    _freeSpawnFar() {
      const spots = SPAWNS.filter(s => this.passable(s[0], s[1]) && manh({ r: s[0], c: s[1] }, this.player) >= 3);
      if (spots.length) return spots[Math.floor(Math.random() * spots.length)];
      return this._freeNear(0, 3, 3);
    }

    _applyBoon(u, boon) {
      this.boonsTaken.push(boon.id);
      switch (boon.id) {
        case "b_hp": u.maxhp += 2; this.heal(u, 2, "奋进，"); break;
        case "b_bloodfree": u.boons.bloodFree = true; break;
        case "b_cleave": u.boons.cleave = Math.max(1, u.boons.cleave); break;
        case "b_horsereach": u.boons.horseRange += 1; break;
        case "b_killheal": u.boons.killHeal = 2; break;
        case "b_shield": u.boons.shield += 3; u.st.shield += 3; break;
        case "b_firststrike": u.boons.firstStrike += 1; break;
        case "b_knife": u.boons.knife += 1; break;
        case "b_horse": u.boons.horse += 1; break;
        case "b_regen": u.boons.regen += 1; break;
        case "b_dodge": u.boons.dodge += 0.15; break;
        case "b_blood": u.boons.blood2 = true; break;
        case "b_cd": u.boons.cdReduce += 1; break;
        case "b_move": u.boons.move += 1; break;
        case "b_ap": u.boons.apBonus += 1; break;
      }
      this.pushLog("得增益「" + boon.name + "」：" + boon.desc);
    }

    finish(result) {
      if (this.over) return;
      this.over = true;
      this.result = result;
      if (window.SJI_SAVE && window.SJI_SAVE.clearBattle) window.SJI_SAVE.clearBattle();
      this.pushLog(result === "win" ? "—— 活者为王！——" : (result === "timeout" ? "—— 高考终了，胜负未分，视为败绩。——" : "—— 汝倒下了。重开重开！——"));
      if (window.SJI_UI) window.SJI_UI.onBattleEnd(this);
    }
  }

  return { Battle, isWall, inB, cheb, manh, adj, SIZE, makeUnit };
})();

# -*- coding: utf-8 -*-
"""versus UI：双方暗拳猜拳 / 双人点将 / 战场标识 / 结算"""
import io

p = 'js/ui.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, tag):
    global s
    assert old in s, "MISS: " + tag
    s = s.replace(old, new, 1)
    print("ok:", tag)

# ① rpsDuel：双方各暗拳一次，随后同时亮出
rep('''  /* ---------------- 增益三选一 ---------------- */''',
'''  /* ---------------- 双人猜拳（各自暗拳，同时亮出） ---------------- */
  async function rpsDuel(b, who) {
    battle = b;
    const label = who === "p1" ? "一号位" : "二号位";
    if (SAVE.settings.rpsMode === "auto") {
      const k = Math.random();
      const resK = k < 0.4 ? "胜" : (k < 0.75 ? "和" : "负");
      const ap = resK === "胜" ? 4 : (resK === "和" ? 3 : 2);
      b.pushLog("—— " + label + "自动猜拳：" + resK + "，得" + ap + "动。——");
      return { ap };
    }
    return new Promise(resolve => {
      modal(
        '<div class="rps-title">' + label + ' 出拳</div>' +
        '<div class="rps-sub">另一侧请勿偷看</div>' +
        '<div class="rps-btns">' + RPS.map((r, i) => '<button class="rps-btn" data-i="' + i + '"><span class="g">' + r.g + "</span>" + r.n + "</button>").join("") + "</div>" +
        '<div class="rps-vs" id="rps-vs">　</div>'
      );
      $$("#modal-box .rps-btn").forEach(btn => {
        btn.onclick = async () => {
          const mine = RPS[+btn.dataset.i];
          const foe = RPS[Math.floor(Math.random() * 3)];
          $$("#modal-box .rps-btn").forEach(x => x.disabled = true);
          for (let i = 0; i < 5; i++) {
            vs_text = mine.g + "　对　" + RPS[i % 3].g;
            $("#rps-vs").textContent = vs_text;
            AU.click();
            await new Promise(r => setTimeout(r, window.SJI_DEBUG && window.SJI_DEBUG.fast ? 40 : 90));
          }
          $("#rps-vs").textContent = mine.g + "　对　" + foe.g;
          let resK, ap;
          if (mine.k === foe.k) { resK = "和"; ap = 3; AU.rpsDraw(); }
          else if ((mine.k === "rock" && foe.k === "scissors") || (mine.k === "scissors" && foe.k === "paper") || (mine.k === "paper" && foe.k === "rock")) { resK = "胜"; ap = 4; AU.rpsWin(); }
          else { resK = "负"; ap = 2; AU.rpsLose(); }
          $("#rps-vs").textContent = label + "：" + resK + "，得" + ap + "动";
          setTimeout(() => { closeModal(); resolve({ ap }); }, window.SJI_DEBUG && window.SJI_DEBUG.fast ? 30 : 850);
        };
      });
    });
  }

  /* ---------------- 增益三选一 ---------------- */''', "rpsDuel")

# ② 双人点将入口：标题页按钮 + 两步选人
rep('''    const ng = $("#btn-ngplus");
    if (ng) {''',
'''    const vb = $("#btn-versus");
    if (vb) {
      vb.style.display = "block";
      vb.onclick = () => { AU.unlock(); AU.click(); openVersusSelect(); };
    }
    const ng = $("#btn-ngplus");
    if (ng) {''', "标题页对战入口")

rep('''  /* ---------------- 花瓣 ---------------- */''',
'''  /* ---------------- 双人同屏对战：两步点将 ---------------- */
  function openVersusSelect() {
    const picks = { p1: null, p2: null };
    const roster = D.PLAYABLE.filter(id => SAVE.isUnlocked(id));
    const labels = { p1: "一号位点将", p2: "二号位点将" };

    function step(who, next) {
      showScreen("screen-versus");
      $("#versus-title").textContent = labels[who];
      const grid = $("#versus-grid");
      grid.innerHTML = "";
      roster.forEach(id => {
        const ch = D.CHARACTERS[id];
        const card = document.createElement("div");
        card.className = "char-card";
        card.innerHTML = face(ch) + '<div><div class="nm">' + ch.name + '</div><div class="hao">' + ch.hao + "</div></div>";
        card.onclick = () => {
          AU.select();
          picks[who] = id;
          $$("#versus-grid .char-card").forEach(c => c.classList.remove("sel"));
          card.classList.add("sel");
        };
        grid.appendChild(card);
      });
      $("#versus-go").onclick = () => {
        if (!picks[who]) { toast("先点选角色"); return; }
        AU.click();
        if (who === "p1") step("p2", next);
        else next();
      };
    }

    step("p1", () => {
      startBattle({ mode: "versus", playerChar: picks.p1, p2Char: picks.p2 });
      showScreen("battle");
    });
  }

  /* ---------------- 花瓣 ---------------- */''', "双人点将")

# ③ playerPhase 支持指定单位（versus 下引擎会传 u）
rep('''  async function playerPhase(b) {
    battle = b;
    b._playerPhaseActive = true;
    await showBanner("汝之回合", 700);''',
'''  async function playerPhase(b, unit) {
    battle = b;
    const u = unit || b.player;
    if (u && u !== b.player && (b.mode === "versus")) b.player = u;
    b._playerPhaseActive = true;
    await showBanner(b.mode === "versus" ? (u.side === "p2" ? "二号位回合" : "一号位回合") : "汝之回合", 700);''', "playerPhase 支持指定单位")

# ④ 单位环色：p2 紫环；对联标签
rep('''      ctx.strokeStyle = u.side === "player" ? "#d8a11f" : (u.side === "ally" ? "#3a7d46" : "#6e2318");
      ctx.stroke();''',
'''      ctx.strokeStyle = u.side === "player" ? "#d8a11f" : (u.side === "p2" ? "#8a5cd6" : (u.side === "ally" ? "#3a7d46" : "#6e2318"));
      ctx.stroke();
      if (b.mode === "versus") {
        ctx.font = "bold 12px KaiTi, serif";
        ctx.fillStyle = u.side === "player" ? "#ffd98a" : "#d8c8ff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(u.side === "player" ? "壹" : "贰", px, py - 40);
      }''', "p2 环色")

io.open(p, 'w', encoding='utf-8').write(s)
chk = io.open(p, encoding='utf-8').read()
for k in ['async function rpsDuel', 'openVersusSelect', 'playerPhase(b, unit)', '壹']:
    assert k in chk, "自检失败: " + k
print('自检通过：versus UI')

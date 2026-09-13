/* ============================================================
 * 实验史记 · 马刀风云 —— 音律（WebAudio 程序合成，无外部资源）
 * ============================================================ */
window.SJI_AUDIO = (function () {
  "use strict";
  let ctx = null, master = null, sfxOn = true, musicOn = true;
  let musicTimer = null, musicStep = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.28;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type, vol, delay, slide) {
    if (!ctx || !sfxOn) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.5, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  function noise(dur, vol, delay) {
    if (!ctx || !sfxOn) return;
    const t0 = ctx.currentTime + (delay || 0);
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const g = ctx.createGain(); g.gain.value = vol || 0.3;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 900;
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0);
  }

  /* 五声音阶（宫商角徵羽）拨弦 */
  const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.26];

  function pluck(freq, dur, vol, delay) {
    if (!ctx || !musicOn) return;
    const t0 = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o2.type = "sine";
    o.frequency.value = freq; o2.frequency.value = freq * 2;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.16, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + (dur || 1.4));
    o.connect(g); o2.connect(g); g.connect(master);
    o.start(t0); o2.start(t0); o.stop(t0 + 1.6); o2.stop(t0 + 1.6);
  }

  const api = {
    setSfx(v) { sfxOn = !!v; },
    setMusic(v) {
      musicOn = !!v;
      if (!musicOn) api.stopMusic();
    },
    unlock() { const c = ensure(); if (c && c.state === "suspended") c.resume(); },

    click() { ensure(); tone(660, 0.07, "square", 0.12); },
    select() { ensure(); tone(520, 0.09, "triangle", 0.2); tone(780, 0.09, "triangle", 0.12, 0.05); },

    hit() { ensure(); noise(0.14, 0.5); tone(160, 0.12, "square", 0.3, 0, 80); },
    crit() { ensure(); noise(0.2, 0.65); tone(120, 0.2, "sawtooth", 0.35, 0, 60); tone(880, 0.1, "square", 0.15, 0.02); },
    heal() { ensure(); tone(523, 0.12, "sine", 0.2); tone(659, 0.14, "sine", 0.18, 0.08); tone(784, 0.2, "sine", 0.15, 0.16); },
    dodge() { ensure(); tone(980, 0.06, "sine", 0.2, 0, 1400); },
    sacrifice() { ensure(); tone(110, 0.5, "sawtooth", 0.35, 0, 45); noise(0.35, 0.4); },
    rpsWin() { ensure(); tone(523, 0.1, "square", 0.22); tone(659, 0.1, "square", 0.22, 0.09); tone(784, 0.16, "square", 0.22, 0.18); },
    rpsLose() { ensure(); tone(392, 0.14, "square", 0.2); tone(311, 0.22, "square", 0.2, 0.12); },
    rpsDraw() { ensure(); tone(440, 0.12, "triangle", 0.2); },
    skill() { ensure(); tone(700, 0.1, "triangle", 0.2, 0, 1000); tone(500, 0.15, "sine", 0.18, 0.06); },
    kick() { ensure(); noise(0.18, 0.6); tone(90, 0.25, "square", 0.4, 0, 50); },
    die() { ensure(); tone(300, 0.4, "sawtooth", 0.3, 0, 60); noise(0.3, 0.4, 0.05); },

    victory() {
      ensure();
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.25, i * 0.13));
      [523, 659, 784].forEach((f, i) => pluck(f, 1.2, 0.12, 0.55 + i * 0.05));
    },
    defeat() {
      ensure();
      [392, 330, 262, 196].forEach((f, i) => tone(f, 0.3, "triangle", 0.22, i * 0.18));
    },

    startMusic() {
      ensure();
      if (musicTimer || !ctx) return;
      musicStep = 0;
      musicTimer = setInterval(() => {
        if (!musicOn || !ctx) return;
        musicStep++;
        const beat = musicStep % 16;
        if (beat % 4 === 0) pluck(PENTA[0] / 2, 1.6, 0.09);
        if (Math.random() < 0.62) {
          const f = PENTA[Math.floor(Math.random() * PENTA.length)];
          pluck(f, 1.8, 0.055 + Math.random() * 0.04);
        }
      }, 700);
    },
    stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } }
  };
  return api;
})();

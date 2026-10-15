// 効果音（コードで作る電子音）と BGM（assets/bgm/ に置いたファイルを鳴らす）
(() => {
  const C = window.CONFIG;

  const Sfx = {
    ctx: null,
    master: null,
    noiseBuf: null,
    enabled: true,
    last: {},

    unlock() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = C.audio.sfxVolume;
        this.master.connect(this.ctx.destination);
        const len = this.ctx.sampleRate;
        this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this.noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },

    // 同じ音が短時間に重なりすぎないようにする
    throttle(name, gap) {
      const now = performance.now();
      if (this.last[name] && now - this.last[name] < gap * 1000) return false;
      this.last[name] = now;
      return true;
    },

    tone(freq, dur, o = {}) {
      const ctx = this.ctx;
      const t0 = ctx.currentTime + (o.delay || 0);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = o.type || 'square';
      osc.frequency.setValueAtTime(freq, t0);
      if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
      const vol = o.vol ?? 0.2;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    },

    noise(dur, o = {}) {
      const ctx = this.ctx;
      const t0 = ctx.currentTime + (o.delay || 0);
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = ctx.createBiquadFilter();
      f.type = o.filter || 'bandpass';
      f.frequency.setValueAtTime(o.freq || 2000, t0);
      if (o.freqTo) f.frequency.exponentialRampToValueAtTime(o.freqTo, t0 + dur);
      f.Q.value = o.q || 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(o.vol ?? 0.2, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(f).connect(g).connect(this.master);
      src.start(t0, Math.random() * 0.5);
      src.stop(t0 + dur + 0.02);
    },

    play(name) {
      if (!this.enabled || !this.ctx || !this[name + 'Sound']) return;
      try { this[name + 'Sound'](); } catch (e) { /* 音が鳴らなくてもゲームは止めない */ }
    },

    // 弾: ポンポンという軽いおもちゃの音
    shotSound() {
      if (!this.throttle('shot', 0.11)) return;
      this.tone(880, 0.06, { type: 'triangle', slideTo: 520, vol: 0.12 });
    },
    // 敵を倒す: ブリキがカランと鳴る音
    killSound() {
      if (!this.throttle('kill', 0.04)) return;
      const base = 560 + Math.random() * 120;
      [1, 2.76, 5.4, 8.93].forEach((m, i) => this.tone(base * m, 0.32 - i * 0.05, { type: 'sine', vol: 0.12 / (i + 1) }));
      [1.12, 3.1].forEach((m) => this.tone(base * m, 0.22, { type: 'sine', vol: 0.06, delay: 0.07 }));
      this.noise(0.04, { freq: 5000, vol: 0.15, q: 0.8 });
    },
    hitSound() {
      if (!this.throttle('hit', 0.07)) return;
      this.tone(1500, 0.03, { type: 'square', vol: 0.04 });
    },
    // バリア: キラーン
    barrierSound() {
      this.tone(700, 0.5, { type: 'sine', slideTo: 2400, vol: 0.18 });
      [1568, 2093, 2637, 3136].forEach((f, i) => this.tone(f, 0.35, { type: 'triangle', vol: 0.08, delay: 0.12 + i * 0.06 }));
    },
    // 必殺技: 紙吹雪がはじけるにぎやかな音
    specialSound() {
      for (let i = 0; i < 6; i++) this.noise(0.12, { freq: 2500 + Math.random() * 3000, vol: 0.18, delay: i * 0.05, q: 2 });
      [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone(f, 0.22, { type: 'square', vol: 0.07, delay: 0.05 + i * 0.05 }));
      this.tone(330, 0.5, { type: 'sawtooth', slideTo: 660, vol: 0.08, delay: 0.02 });
    },
    // 仲間を救出: 檻が開く音 + ピロリン
    rescueSound() {
      this.tone(160, 0.25, { type: 'square', slideTo: 90, vol: 0.12 });
      this.noise(0.3, { freq: 900, freqTo: 3000, vol: 0.12, q: 4 });
      [1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.3, { type: 'triangle', vol: 0.14, delay: 0.35 + i * 0.09 }));
    },
    damageSound() {
      this.tone(300, 0.35, { type: 'sawtooth', slideTo: 70, vol: 0.2 });
      this.noise(0.25, { freq: 600, vol: 0.2, filter: 'lowpass' });
    },
    bossHitSound() {
      if (!this.throttle('bossHit', 0.09)) return;
      this.tone(220 + Math.random() * 60, 0.05, { type: 'square', vol: 0.05 });
    },
    explodeSound() {
      this.noise(0.6, { freq: 1200, freqTo: 120, vol: 0.35, filter: 'lowpass' });
      this.tone(120, 0.5, { type: 'sine', slideTo: 40, vol: 0.3 });
    },
    warningSound() {
      for (let i = 0; i < 3; i++) {
        this.tone(440, 0.28, { type: 'square', slideTo: 660, vol: 0.09, delay: i * 0.6 });
        this.tone(660, 0.28, { type: 'square', slideTo: 440, vol: 0.09, delay: i * 0.6 + 0.3 });
      }
    },
    tapSound() { this.tone(1200, 0.05, { type: 'triangle', vol: 0.1 }); },
    powerSound() {
      [523, 784, 1047, 1568].forEach((f, i) => this.tone(f, 0.18, { type: 'square', vol: 0.08, delay: i * 0.07 }));
    },
    peaceSound() {
      [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, 0.6, { type: 'sine', vol: 0.08, delay: i * 0.15 }));
    },
  };

  // BGM: assets/bgm/<slot>.mp3 などを置くと鳴る。なければ無音。
  const Bgm = {
    enabled: true,
    slot: null,
    audio: null,
    cache: {},

    create(slot) {
      const a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.volume = C.audio.bgmVolume;
      const exts = C.audio.bgmExtensions;
      let i = 0;
      const tryNext = () => {
        if (i >= exts.length) { a.dataset.missing = '1'; return; }
        a.src = `assets/bgm/${slot}.${exts[i++]}`;
      };
      a.addEventListener('error', tryNext);
      // mp3 が無くて m4a などに切りかわったときは、読み込めた時点で鳴らしはじめる
      a.addEventListener('canplay', () => {
        if (a.wantPlay && this.audio === a && a.paused && this.enabled) {
          const p = a.play();
          if (p && p.catch) p.catch(() => {});
        }
      });
      tryNext();
      this.cache[slot] = a;
      return a;
    },

    // keepIfMissing: その曲が無いときは、今の曲を止めずに鳴らし続ける
    play(slot, o = {}) {
      if (this.slot === slot && this.audio && !this.audio.paused) return;
      const known = this.cache[slot];
      if (o.keepIfMissing && this.audio && (!known || known.dataset.missing)) {
        const a = known || this.create(slot);
        if (a.dataset.missing) return;
        const cur = this.audio;
        const start = () => { if (this.audio === cur) this.play(slot); }; // 読み込み中に画面が変わっていたら鳴らさない
        a.addEventListener('canplay', start, { once: true });
        return;
      }
      this.stop();
      this.slot = slot;
      if (!this.enabled || !slot) return;
      const a = this.cache[slot] || this.create(slot);
      this.audio = a;
      if (a.dataset.missing) return;
      a.wantPlay = true;
      try { a.currentTime = 0; } catch (e) { /* 読み込み前 */ }
      const p = a.play();
      if (p && p.catch) p.catch(() => {});
    },

    stop() {
      if (this.audio) { this.audio.wantPlay = false; this.audio.pause(); }
      this.audio = null;
    },

    pause() { if (this.audio) { this.audio.wantPlay = false; this.audio.pause(); } },
    resume() {
      if (this.audio && this.enabled && !this.audio.dataset.missing) {
        this.audio.wantPlay = true;
        const p = this.audio.play();
        if (p && p.catch) p.catch(() => {});
      }
    },

    setEnabled(on) {
      this.enabled = on;
      if (!on) this.pause();
      else if (this.slot) { const s = this.slot; this.slot = null; this.play(s); }
    },
  };

  window.Sfx = Sfx;
  window.Bgm = Bgm;
})();

// 画面・入力・描画まわりの共通部品
(() => {
  const C = window.CONFIG;

  const U = {
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    choose: (arr) => arr[Math.floor(Math.random() * arr.length)],
    dist2: (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2,
    angleTo: (ax, ay, bx, by) => Math.atan2(by - ay, bx - ax),
    easeOut: (t) => 1 - (1 - t) * (1 - t),
    easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
    easeOutBack: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  };

  // 共有の状態
  const G = {
    W: C.view.width,
    H: 640,
    canvas: null,
    ctx: null,
    dpr: 1,
    cssW: 360,
    cssH: 640,
  };

  function resize() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cssW = Math.min(vw, vh * 9 / 16);
    let H = (C.view.width * vh) / cssW;
    H = U.clamp(H, C.view.minHeight, C.view.maxHeight);
    let cssH = (cssW * H) / C.view.width;
    if (cssH > vh) { // 縦が足りないときは全体を縮める
      cssH = vh;
      cssW = (cssH * C.view.width) / H;
    }
    G.H = Math.round(H);
    G.cssW = cssW;
    G.cssH = cssH;
    G.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const root = document.getElementById('game-root');
    root.style.width = cssW + 'px';
    root.style.height = cssH + 'px';
    root.style.setProperty('--u', cssW / 360);
    G.canvas.width = Math.round(cssW * G.dpr);
    G.canvas.height = Math.round(cssH * G.dpr);
    G.canvas.style.width = cssW + 'px';
    G.canvas.style.height = cssH + 'px';
    Input.scale = C.view.width / cssW;
    document.body.classList.toggle('landscape', vw > vh * 1.15 && ('ontouchstart' in window));
  }

  // 入力: 画面をドラッグした分だけ自機を動かす（指で自機が隠れないように相対移動）
  const Input = {
    scale: 1,
    pointerId: null,
    lastX: 0,
    lastY: 0,
    dx: 0,
    dy: 0,
    keys: {},
    touching: false,
    fireButton: false,  // 画面のショットボタンを押しているか

    init(el) {
      el.addEventListener('pointerdown', (e) => {
        if (this.pointerId !== null) return;
        this.pointerId = e.pointerId;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.touching = true;
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        e.preventDefault();
      });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerId !== this.pointerId) return;
        this.dx += (e.clientX - this.lastX) * this.scale * C.player.dragGain;
        this.dy += (e.clientY - this.lastY) * this.scale * C.player.dragGain;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        e.preventDefault();
      });
      const end = (e) => {
        if (e.pointerId !== this.pointerId) return;
        this.pointerId = null;
        this.touching = false;
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
      window.addEventListener('keydown', (e) => {
        this.keys[e.code] = true;
        if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.keys = {}; this.fireButton = false; });
    },

    consume() {
      const d = { x: this.dx, y: this.dy };
      this.dx = 0;
      this.dy = 0;
      return d;
    },

    // ショット: ボタン、または Z / スペース / J キーを押しているあいだ
    firing() {
      const k = this.keys;
      return this.fireButton || !!(k.KeyZ || k.Space || k.KeyJ);
    },

    keyAxis() {
      const k = this.keys;
      return {
        x: (k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0),
        y: (k.ArrowDown || k.KeyS ? 1 : 0) - (k.ArrowUp || k.KeyW ? 1 : 0),
      };
    },
  };

  // ---- 描画の部品 ----
  function spriteSize(img, size) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const s = size / Math.max(w, h);
    return { w: w * s, h: h * s };
  }

  // 画像を中心(x,y)・長辺sizeで描く
  function drawSprite(key, x, y, size, o = {}) {
    const img = Assets.images[key];
    if (!img) return;
    const { w, h } = spriteSize(img, size);
    const ctx = G.ctx;
    const ol = o.outline && Assets.outlined[o.outline];
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    const sx = (o.scaleX ?? 1) * (o.scale ?? 1);
    const sy = (o.scaleY ?? 1) * (o.scale ?? 1);
    if (sx !== 1 || sy !== 1) ctx.scale(sx, sy);
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (ol) {
      const k = w / ol.srcW;
      const p = ol.pad * k;
      ctx.drawImage(ol, -w / 2 - p, -h / 2 - p, w + p * 2, h + p * 2);
    } else ctx.drawImage(o.canvas || img, -w / 2, -h / 2, w, h);
    if (o.flash && Assets.flash[key]) {
      ctx.globalAlpha = (o.alpha ?? 1) * Math.min(1, o.flash);
      ctx.drawImage(Assets.flash[key], -w / 2, -h / 2, w, h);
    }
    ctx.restore();
  }

  // アメコミ風の文字（黒い縁取り）
  function comicText(text, x, y, o = {}) {
    const ctx = G.ctx;
    ctx.save();
    ctx.font = `${o.weight || ''} ${o.size || 24}px ${o.font || "'Bangers', 'M PLUS Rounded 1c', sans-serif"}`;
    ctx.textAlign = o.align || 'center';
    ctx.textBaseline = 'middle';
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.rot) { ctx.translate(x, y); ctx.rotate(o.rot); x = 0; y = 0; }
    if (o.spacing) ctx.letterSpacing = o.spacing + 'px';
    ctx.lineJoin = 'round';
    if (o.shadow !== false) {
      ctx.fillStyle = '#000';
      ctx.fillText(text, x + (o.size || 24) * 0.08, y + (o.size || 24) * 0.1);
    }
    ctx.strokeStyle = o.stroke || '#000';
    ctx.lineWidth = o.lineWidth ?? Math.max(3, (o.size || 24) * 0.16);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = o.color || '#fff';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // ハーフトーン（網点）のパターン
  let halftone = null;
  function halftonePattern() {
    if (halftone) return halftone;
    const c = document.createElement('canvas');
    c.width = c.height = 6;
    const x = c.getContext('2d');
    x.fillStyle = 'rgba(0,0,0,0.55)';
    x.beginPath();
    x.arc(3, 3, 1.3, 0, Math.PI * 2);
    x.fill();
    halftone = G.ctx.createPattern(c, 'repeat');
    return halftone;
  }

  // ---- パーティクル ----
  const CONFETTI_COLORS = ['#ff4d6d', '#ffd23f', '#3ec1ff', '#7ae582', '#c77dff', '#ff8c42', '#ffffff'];
  const Particles = {
    list: [],
    clear() { this.list.length = 0; },
    add(p) {
      p.t = 0;
      p.life = p.life || 0.6;
      this.list.push(p);
      return p;
    },
    burst(x, y, o = {}) {
      const n = o.count || 10;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = U.rand(o.speedMin || 60, o.speedMax || 220);
        this.add({
          kind: o.kind || 'spark', x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
          life: U.rand(0.35, o.life || 0.7), size: U.rand(o.sizeMin || 2, o.sizeMax || 5),
          color: o.color || U.choose(o.colors || ['#fff3b0', '#ffd23f', '#ff8c42']),
          rot: Math.random() * 6, vr: U.rand(-10, 10), g: o.gravity || 0,
        });
      }
    },
    // 敵を倒したとき: ブリキのかけら + 星形の光
    tinPop(x, y, scale = 1) {
      this.add({ kind: 'pow', x, y, life: 0.35, size: 26 * scale });
      this.burst(x, y, { kind: 'scrap', count: Math.round(7 * scale), speedMin: 80, speedMax: 240, gravity: 420, colors: ['#8a6a4f', '#a2836a', '#6e5546', '#b9a089'], sizeMin: 3, sizeMax: 6, life: 0.9 });
      this.burst(x, y, { count: Math.round(6 * scale), speedMin: 40, speedMax: 160 });
    },
    confetti(count = 80) {
      for (let i = 0; i < count; i++) {
        this.add({
          kind: 'confetti', x: U.rand(0, G.W), y: U.rand(-40, G.H * 0.4), vx: U.rand(-60, 60), vy: U.rand(40, 160),
          life: U.rand(1.6, 2.6), size: U.rand(4, 8), color: U.choose(CONFETTI_COLORS), rot: Math.random() * 6, vr: U.rand(-8, 8), g: 30,
        });
      }
    },
    balloons(count = 7) {
      for (let i = 0; i < count; i++) {
        this.add({
          kind: 'balloon', x: U.rand(20, G.W - 20), y: G.H + U.rand(20, 120), vx: U.rand(-15, 15), vy: U.rand(-200, -130),
          life: 3.2, size: U.rand(14, 20), color: U.choose(CONFETTI_COLORS.slice(0, 6)), rot: 0, vr: 0, g: 0,
        });
      }
    },
    text(x, y, str, color = '#fff', size = 14) {
      this.add({ kind: 'text', x, y, vx: 0, vy: -40, life: 0.8, str, color, size });
    },
    update(dt) {
      const l = this.list;
      for (let i = l.length - 1; i >= 0; i--) {
        const p = l[i];
        p.t += dt;
        if (p.t >= p.life) { l.splice(i, 1); continue; }
        if (p.vx !== undefined) {
          p.vy += (p.g || 0) * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          if (p.vr) p.rot += p.vr * dt;
        }
      }
    },
    draw() {
      const ctx = G.ctx;
      for (const p of this.list) {
        const k = p.t / p.life;
        ctx.save();
        ctx.globalAlpha = p.kind === 'confetti' || p.kind === 'balloon' ? Math.min(1, (1 - k) * 3) : 1 - k;
        ctx.translate(p.x, p.y);
        switch (p.kind) {
          case 'spark':
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * (1 - k * 0.5), 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'scrap':
            ctx.rotate(p.rot);
            ctx.fillStyle = p.color;
            ctx.strokeStyle = '#1a1210';
            ctx.lineWidth = 1;
            ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
            ctx.strokeRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
            break;
          case 'confetti':
            ctx.rotate(p.rot);
            ctx.scale(1, Math.cos(p.t * 9 + p.size));
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
            break;
          case 'balloon':
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, p.size);
            ctx.quadraticCurveTo(4, p.size * 1.8, -2, p.size * 2.6);
            ctx.stroke();
            ctx.fillStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size * 0.8, p.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.beginPath();
            ctx.ellipse(-p.size * 0.3, -p.size * 0.4, p.size * 0.18, p.size * 0.28, -0.4, 0, Math.PI * 2);
            ctx.fill();
            break;
          case 'pow': {
            const s = p.size * (0.6 + k * 0.8);
            ctx.rotate(0.3);
            starPath(ctx, 0, 0, 8, s, s * 0.5);
            ctx.fillStyle = '#ffe14d';
            ctx.fill();
            ctx.lineWidth = 2.5;
            ctx.strokeStyle = '#000';
            ctx.stroke();
            starPath(ctx, 0, 0, 8, s * 0.55, s * 0.28);
            ctx.fillStyle = '#fff';
            ctx.fill();
            break;
          }
          case 'ring':
            ctx.strokeStyle = p.color || '#fff';
            ctx.lineWidth = 3 * (1 - k) + 1;
            ctx.beginPath();
            ctx.arc(0, 0, p.size * (0.3 + k), 0, Math.PI * 2);
            ctx.stroke();
            break;
          case 'text':
            ctx.restore();
            comicText(p.str, p.x, p.y, { size: p.size, color: p.color, alpha: 1 - k, shadow: false, lineWidth: 3 });
            continue;
          default:
            break;
        }
        ctx.restore();
      }
    },
  };

  function starPath(ctx, x, y, points, outer, inner) {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 ? inner : outer;
      const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    ctx.closePath();
  }

  window.U = U;
  window.G = G;
  window.Input = Input;
  window.Particles = Particles;
  window.Draw = { spriteSize, drawSprite, comicText, halftonePattern, starPath, resize };
})();

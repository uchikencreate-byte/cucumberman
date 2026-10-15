// ザコ敵の動き。World は game.js が用意する（弾を撃つ・自機の位置など）
(() => {
  const C = window.CONFIG;

  function enterTop(e, p) {
    e.x = p.x * G.W;
    e.y = -e.size * 0.6;
  }

  const T = {
    // サボテン兵: 地面に立っていて動かない（背景と一緒に流れる）。弾を撃つ
    cactus: {
      init(e, p) {
        enterTop(e, p);
        e.fireT = U.rand(0.8, 1.4);
      },
      update(e, dt, w) {
        e.y += C.scrollSpeed * dt;
        e.fireT -= dt;
        if (e.fireT <= 0 && w.canFire(e)) {
          e.fireT = w.interval(1.9);
          w.fireAimed(e.x - e.size * 0.25, e.y - e.size * 0.05, w.n(w.late() ? 3 : 1), 0.35, w.spd(150), { color: '#ff4fd8' });
        }
      },
    },

    // 回転草: 横から転がってくる
    tumbleweed: {
      init(e, p) {
        e.dir = p.side === 'R' ? -1 : 1;
        e.x = e.dir > 0 ? -e.size : G.W + e.size;
        e.baseY = p.y * G.H;
        e.y = e.baseY;
        e.vx = e.dir * U.rand(115, 145);
      },
      update(e, dt) {
        e.x += e.vx * dt;
        e.baseY += 18 * dt;
        e.y = e.baseY - Math.abs(Math.sin(e.t * 5)) * 12;
        e.rot = (e.rot || 0) + (e.vx * dt) / (e.size * 0.5);
        if ((e.dir > 0 && e.x > G.W + e.size) || (e.dir < 0 && e.x < -e.size)) e.gone = true;
      },
    },

    // ハゲタカ人形: 上で止まってから、斜めに急降下
    vulture: {
      init(e, p) {
        enterTop(e, p);
        e.hoverY = U.rand(70, 140);
        e.state = 'enter';
      },
      update(e, dt, w) {
        if (e.state === 'enter') {
          e.y += (e.hoverY - e.y) * 3.2 * dt;
          if (e.t > 1.0) { e.state = 'aim'; e.st = 0; }
        } else if (e.state === 'aim') {
          e.st += dt;
          e.scaleX = 1 + Math.sin(e.st * 30) * 0.12;
          if (e.st > 0.45) {
            e.state = 'dive';
            e.scaleX = 1;
            const a = U.angleTo(e.x, e.y, w.player.x, w.player.y);
            e.vx = Math.cos(a) * 310;
            e.vy = Math.max(120, Math.sin(a) * 310);
            e.rot = (e.vx / 310) * -0.6;
            if (w.late() && w.extra()) w.fireAimed(e.x, e.y, 1, 0, w.spd(170), { color: '#ff4fd8' });
          }
        } else {
          e.x += e.vx * dt;
          e.y += e.vy * dt;
        }
      },
    },

    // 豆ロボ: 一列で、左右にゆらゆら降りてくる
    mamebot: {
      init(e, p) {
        enterTop(e, p);
        e.x0 = e.x;
        e.phase = p.phase || 0;
        e.fireT = U.rand(1.2, 2.4);
      },
      update(e, dt, w) {
        e.y += 105 * dt;
        e.x = e.x0 + Math.sin(e.t * 2.8 + e.phase) * 44;
        e.fireT -= dt;
        if (e.fireT <= 0 && w.canFire(e)) {
          e.fireT = w.interval(2.6);
          w.fireFan(e.x, e.y + 10, Math.PI / 2, 1, 0, w.spd(170), { color: '#ff7ad9', r: 4 });
        }
      },
    },

    // ミニ円盤: ジグザグに降りながら小さな弾を撃つ
    miniufo: {
      init(e, p) {
        enterTop(e, p);
        e.minX = Math.max(30, e.x - 80);
        e.maxX = Math.min(G.W - 30, e.x + 80);
        e.vx = (Math.random() < 0.5 ? -1 : 1) * 170;
        e.fireT = U.rand(0.6, 1.2);
      },
      update(e, dt, w) {
        e.y += 90 * dt;
        e.x += e.vx * dt;
        if (e.x < e.minX) { e.x = e.minX; e.vx = Math.abs(e.vx); }
        if (e.x > e.maxX) { e.x = e.maxX; e.vx = -Math.abs(e.vx); }
        e.rot = e.vx > 0 ? 0.15 : -0.15;
        e.fireT -= dt;
        if (e.fireT <= 0 && w.canFire(e)) {
          e.fireT = w.interval(1.3);
          w.fireAimed(e.x, e.y + 8, w.n(w.late() ? 2 : 1), 0.25, w.spd(180), { color: '#5ff3ff', r: 4 });
        }
      },
    },

    // 流れ星ガラクタ: 斜めに流れていく
    starjunk: {
      init(e, p) {
        e.x = p.x * G.W;
        e.y = -e.size;
        const dir = p.dir || (e.x < G.W / 2 ? 1 : -1);
        e.vx = dir * U.rand(80, 140);
        e.vy = U.rand(230, 300);
      },
      update(e, dt) {
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.rot = (e.rot || 0) + dt * 5;
        if (Math.random() < 0.5) Particles.add({ kind: 'spark', x: e.x, y: e.y, vx: -e.vx * 0.2, vy: -e.vy * 0.2, life: 0.35, size: 3, color: '#ffcf6b' });
      },
    },

    // ミニ怪獣: 沼から飛び出してくる（先に波紋で予告）
    minikaiju: {
      init(e, p, w) {
        e.x = p.x * G.W;
        e.surfaceY = (p.y || U.rand(0.25, 0.45)) * G.H;
        if (Math.abs(e.x - w.player.x) < 70 && Math.abs(e.surfaceY - w.player.y) < 160) e.x = U.clamp(e.x + (e.x < w.player.x ? -110 : 110), 30, G.W - 30);
        e.y = e.surfaceY;
        e.state = 'ripple';
        e.hidden = true;
      },
      update(e, dt, w) {
        if (e.state === 'ripple') {
          if (e.t > 0.8) {
            e.state = 'jump';
            e.hidden = false;
            e.vy = -U.rand(250, 290);
            e.vx = U.rand(-30, 30);
            Particles.burst(e.x, e.y, { count: 10, colors: ['#9effa0', '#c8ffd0', '#ffffff'], speedMin: 60, speedMax: 160 });
          }
          return;
        }
        const prevVy = e.vy;
        e.vy += 430 * dt;
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        e.scale = Math.min(1, 0.55 + (e.t - 0.8) * 2);
        if (prevVy < 0 && e.vy >= 0 && w.extra() && w.canFire(e)) {
          w.fireRing(e.x, e.y, w.n(6), w.spd(110), Math.random(), { color: '#b6ff3c' });
        }
      },
      draw(e, ctx) {
        if (e.state !== 'ripple') return false;
        const k = e.t / 0.8;
        ctx.save();
        ctx.strokeStyle = 'rgba(200,255,200,0.9)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 2; i++) {
          ctx.beginPath();
          ctx.ellipse(e.x, e.y, 10 + k * 22 + i * 8, (10 + k * 22 + i * 8) * 0.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
        return true;
      },
    },

    // 泡ガエル人形: 止まって泡の弾をまき散らす
    bubblefrog: {
      init(e, p) {
        enterTop(e, p);
        e.stopY = U.rand(0.16, 0.3) * G.H;
        e.state = 'enter';
        e.bursts = 0;
      },
      update(e, dt, w) {
        if (e.state === 'enter') {
          e.y += 120 * dt;
          if (e.y >= e.stopY) { e.state = 'spray'; e.st = 0.5; }
        } else if (e.state === 'spray') {
          e.st -= dt;
          e.scaleY = 1 + Math.max(0, Math.sin(e.t * 12)) * 0.05;
          if (e.st <= 0) {
            e.st = w.interval(0.95);
            w.fireRing(e.x, e.y - e.size * 0.1, w.n(w.late() ? 9 : 7), w.spd(85), Math.random() * 6, { kind: 'bubble' });
            e.bursts++;
            if (e.bursts >= 3) e.state = 'leave';
          }
        } else {
          e.y += 75 * dt;
        }
      },
    },

    // 沼ヘビ: 画面の端から伸びてきて、動ける場所をせばめる
    swampsnake: {
      init(e, p) {
        e.side = p.side || (Math.random() < 0.5 ? 'L' : 'R');
        e.y = p.y * G.H;
        e.baseY = e.y;
        e.len = 0;
        e.maxLen = G.W * (p.len || 0.52);
        e.state = 'warn';
        e.st = 0;
        e.hidden = true;
        e.fired = false;
        e.x = e.side === 'L' ? -20 : G.W + 20;
      },
      update(e, dt, w) {
        e.st += dt;
        if (e.state === 'warn') {
          if (e.st > 0.8) { e.state = 'extend'; e.st = 0; e.hidden = false; }
        } else if (e.state === 'extend') {
          e.len = e.maxLen * U.easeOut(Math.min(1, e.st / 0.8));
          if (e.st > 0.8) { e.state = 'hold'; e.st = 0; }
        } else if (e.state === 'hold') {
          e.y = e.baseY + Math.sin(e.st * 3) * 8;
          if (!e.fired && e.st > 1.0 && w.canFire(e)) {
            e.fired = true;
            w.fireAimed(e.x, e.y, w.n(3), 0.4, w.spd(150), { color: '#b6ff3c' });
          }
          if (e.st > 2.6) { e.state = 'retract'; e.st = 0; }
        } else if (e.state === 'retract') {
          e.len = e.maxLen * (1 - Math.min(1, e.st / 0.7));
          if (e.st > 0.7) e.gone = true;
        }
        e.x = e.side === 'L' ? e.len - 8 : G.W - e.len + 8;
        // 体（胴体）に触れてもダメージ
        if (!e.peaceful && (e.state === 'extend' || e.state === 'hold')) {
          const pl = w.player;
          const inX = e.side === 'L' ? pl.x < e.x : pl.x > e.x;
          if (inX && Math.abs(pl.y - e.y) < 9 + C.player.hitRadius) w.damagePlayer();
        }
      },
      draw(e, ctx) {
        if (e.state === 'warn') {
          const a = 0.35 + Math.sin(e.st * 25) * 0.25;
          ctx.save();
          ctx.fillStyle = `rgba(255,60,60,${a})`;
          const x0 = e.side === 'L' ? 0 : G.W - e.maxLen;
          ctx.fillRect(x0, e.y - 9, e.maxLen, 18);
          ctx.restore();
          return true;
        }
        if (e.len <= 0) return true;
        ctx.save();
        const x0 = e.side === 'L' ? -10 : G.W + 10;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 20;
        ctx.beginPath();
        ctx.moveTo(x0, e.y);
        ctx.lineTo(e.x, e.y);
        ctx.stroke();
        ctx.strokeStyle = '#6e5546';
        ctx.lineWidth = 14;
        ctx.stroke();
        ctx.strokeStyle = '#8f735c';
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 9]);
        ctx.beginPath();
        ctx.moveTo(x0, e.y - 2);
        ctx.lineTo(e.x, e.y - 2);
        ctx.stroke();
        ctx.restore();
        return false; // 頭は通常どおり描く
      },
      rot(e) { return e.side === 'L' ? Math.PI / 2 : -Math.PI / 2; },
      onKill(e) { e.len = 0; },
    },

    // びっくり箱兵: 読みにくい場所に箱から飛び出して撃ち、また消える
    boxsoldier: {
      init(e, p, w) {
        e.cycles = 0;
        e.maxCycles = p.cycles || 3;
        this.relocate(e, w);
      },
      relocate(e, w) {
        for (let i = 0; i < 12; i++) {
          e.x = U.rand(40, G.W - 40);
          e.y = U.rand(70, G.H * 0.45);
          if (U.dist2(e.x, e.y, w.player.x, w.player.y) > 150 * 150) break;
        }
        e.state = 'poof';
        e.st = 0;
        e.hidden = true;
        e.scale = 0;
      },
      update(e, dt, w) {
        e.st += dt;
        if (e.state === 'wait') {
          if (e.st > 0.3) this.relocate(e, w);
        } else if (e.state === 'poof') {
          if (e.st > 0.55) { e.state = 'pop'; e.st = 0; e.hidden = false; }
        } else if (e.state === 'pop') {
          e.scale = U.easeOutBack(Math.min(1, e.st / 0.25));
          if (e.st > 0.25) { e.state = 'stay'; e.st = 0; e.fired = false; e.scale = 1; }
        } else if (e.state === 'stay') {
          if (!e.fired && e.st > 0.35) {
            e.fired = true;
            if (w.canFire(e)) w.fireAimed(e.x, e.y - 8, w.n(w.late() ? 4 : 3), 0.55, w.spd(170), { color: '#4dffea' });
          }
          if (e.st > 1.4) { e.state = 'sink'; e.st = 0; }
        } else if (e.state === 'sink') {
          e.scale = 1 - Math.min(1, e.st / 0.25);
          if (e.st > 0.25) {
            e.cycles++;
            e.hidden = true;
            if (e.cycles >= e.maxCycles) e.gone = true;
            else { e.state = 'wait'; e.st = 0; }
          }
        }
      },
      draw(e, ctx) {
        if (e.state !== 'poof') return e.state === 'wait';
        const k = e.st / 0.55;
        ctx.save();
        ctx.globalAlpha = 0.4 + k * 0.5;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.beginPath();
        ctx.ellipse(e.x, e.y + 18, 22, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffde59';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, 26 - k * 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
        return true;
      },
    },

    // 風船ガラクタ: ゆっくり降りてきて、撃つと割れて小弾が散る
    balloon: {
      init(e, p) {
        enterTop(e, p);
        e.x0 = e.x;
      },
      update(e, dt) {
        e.y += 50 * dt;
        e.x = e.x0 + Math.sin(e.t * 1.6) * 22;
      },
      onKill(e, w) {
        if (e.y < G.H * 0.8) w.fireRing(e.x, e.y, w.n(w.late() ? 10 : 8), w.spd(110), Math.random(), { color: '#ffe14d', r: 4 });
      },
    },

    // 玉乗りミニ: 画面を横に転がって体当たり
    ballmini: {
      init(e, p) {
        e.dir = p.side === 'R' ? -1 : 1;
        e.x = e.dir > 0 ? -e.size : G.W + e.size;
        e.baseY = p.y * G.H;
        e.y = e.baseY;
        e.state = 'warn';
        e.hidden = true;
      },
      update(e, dt) {
        if (e.state === 'warn') {
          if (e.t > 0.7) { e.state = 'roll'; e.hidden = false; e.vx = e.dir * U.rand(165, 195); }
          return;
        }
        e.x += e.vx * dt;
        e.y = e.baseY - Math.abs(Math.sin(e.t * 6)) * 14;
        e.rot = Math.sin(e.t * 6) * 0.15;
        if ((e.dir > 0 && e.x > G.W + e.size) || (e.dir < 0 && e.x < -e.size)) e.gone = true;
      },
      draw(e, ctx) {
        if (e.state !== 'warn') return false;
        const a = 0.5 + Math.sin(e.t * 25) * 0.4;
        const x = e.dir > 0 ? 14 : G.W - 14;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.fillStyle = '#ff3b3b';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + e.dir * 10, e.baseY);
        ctx.lineTo(x - e.dir * 6, e.baseY - 11);
        ctx.lineTo(x - e.dir * 6, e.baseY + 11);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        return true;
      },
    },
  };

  // ステージ5: 戦いたくない手下。目が青くなり、攻撃をやめて道を空ける
  function makePeaceful(e) {
    if (e.peaceful) return;
    e.peaceful = true;
    e.hidden = false;
    e.scale = 1;
    e.scaleX = 1;
    e.scaleY = 1;
    e.rot = 0;
    e.state = 'peace';
    e.peaceT = 0;
    if (e.type === 'swampsnake') { e.len = 0; e.y = e.baseY; e.x = e.side === 'L' ? 30 : G.W - 30; }
    if (e.type === 'minikaiju' && e.y > G.H) e.gone = true;
    e.targetX = e.x < G.W / 2 ? U.rand(22, 40) : U.rand(G.W - 40, G.W - 22);
    Particles.add({ kind: 'ring', x: e.x, y: e.y, life: 0.6, size: 40, color: '#7fd8ff' });
    Particles.burst(e.x, e.y, { count: 6, colors: ['#bfefff', '#7fd8ff', '#ffffff'], speedMin: 30, speedMax: 90 });
  }

  function peacefulUpdate(e, dt) {
    e.peaceT += dt;
    e.x += (e.targetX - e.x) * 2.2 * dt;
    if (e.y < 60) e.y += 90 * dt;
    else e.y += C.scrollSpeed * 1.4 * dt;
    e.rot = Math.sin(e.peaceT * 2) * 0.06;
    if (e.y > G.H + e.size) e.gone = true;
  }

  window.ENEMY_TYPES = T;
  window.EnemyAI = { makePeaceful, peacefulUpdate };
})();

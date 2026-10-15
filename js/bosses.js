// ボスの攻撃パターンと、予告つきの攻撃（投げ縄・しっぽ・腕の振り下ろし）
(() => {
  const C = window.CONFIG;

  // ---- 予告つきの攻撃 ----
  const Hazards = {
    // 投げ縄の輪っかが画面を横切る
    lasso(y, dir) {
      return {
        t: 0, warn: 1.1, y, dir, x: dir > 0 ? -40 : G.W + 40, r: 24,
        update(dt, w) {
          this.t += dt;
          if (this.t < this.warn) return;
          this.x += this.dir * w.spd(330) * dt;
          this.spin = (this.spin || 0) + dt * 8;
          if (U.dist2(this.x, this.y, w.player.x, w.player.y) < (this.r * 0.8 + C.player.hitRadius) ** 2) w.damagePlayer();
          if (this.x < -80 || this.x > G.W + 80) this.dead = true;
        },
        draw(ctx) {
          if (this.t < this.warn) {
            ctx.fillStyle = `rgba(255,70,40,${0.18 + Math.sin(this.t * 22) * 0.12})`;
            ctx.fillRect(0, this.y - this.r, G.W, this.r * 2);
            return;
          }
          const sx = this.dir > 0 ? -10 : G.W + 10;
          ctx.save();
          ctx.lineCap = 'round';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(sx, this.y - 30);
          ctx.quadraticCurveTo((sx + this.x) / 2, this.y - 50, this.x - this.dir * this.r, this.y);
          ctx.stroke();
          ctx.strokeStyle = '#c9a26b';
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.translate(this.x, this.y);
          ctx.scale(1, 0.55 + Math.sin(this.spin) * 0.15);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 8;
          ctx.beginPath();
          ctx.arc(0, 0, this.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#c9a26b';
          ctx.lineWidth = 4;
          ctx.stroke();
          ctx.restore();
        },
      };
    },

    // ガオンゴのしっぽ: 画面の下半分を横になぎ払う
    tail(dir) {
      const top = G.H * 0.55;
      return {
        t: 0, warn: 1.3, dir, x: dir > 0 ? -90 : G.W + 90, top,
        update(dt, w) {
          this.t += dt;
          if (this.t < this.warn) return;
          if (!this.started) { this.started = true; w.shake(6); }
          this.x += this.dir * 560 * dt;
          const p = w.player;
          if (p.y > this.top - 4 && Math.abs(p.x - this.x) < 60) w.damagePlayer();
          if (this.x < -150 || this.x > G.W + 150) this.dead = true;
        },
        draw(ctx) {
          if (this.t < this.warn) {
            ctx.save();
            ctx.fillStyle = `rgba(255,50,30,${0.16 + Math.sin(this.t * 20) * 0.1})`;
            ctx.fillRect(0, this.top, G.W, G.H - this.top);
            Draw.comicText('↑ にげろ！ ↑', G.W / 2, this.top + 40, { size: 22, color: '#ffeb3b', font: "'M PLUS Rounded 1c', sans-serif", weight: 900, alpha: 0.6 + Math.sin(this.t * 20) * 0.4 });
            ctx.restore();
            return;
          }
          ctx.save();
          ctx.translate(this.x, 0);
          const h = G.H - this.top;
          ctx.fillStyle = '#a8e61d';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(-55, this.top + 6, 110, h + 20, 40);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#e8343a';
          for (let y = this.top + 30; y < G.H; y += 46) {
            ctx.beginPath();
            ctx.moveTo(-this.dir * 50, y);
            ctx.lineTo(-this.dir * 82, y + 14);
            ctx.lineTo(-this.dir * 50, y + 28);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(-35, this.top + 20, 14, h - 30);
          ctx.restore();
        },
      };
    },

    // ガラクタ大王の腕の振り下ろし
    slam(x, warn = 1.0) {
      return {
        t: 0, warn, x, y: -80, r: 34,
        update(dt, w) {
          this.t += dt;
          if (this.t < this.warn) return;
          if (!this.started) { this.started = true; w.shake(5); }
          this.y += 1150 * dt;
          if (U.dist2(this.x, this.y, w.player.x, w.player.y) < (this.r * 0.85 + C.player.hitRadius) ** 2) w.damagePlayer();
          if (this.y > G.H + 100) this.dead = true;
        },
        draw(ctx) {
          if (this.t < this.warn) {
            ctx.fillStyle = `rgba(255,60,40,${0.15 + Math.sin(this.t * 24) * 0.1})`;
            ctx.fillRect(this.x - this.r, 0, this.r * 2, G.H);
            return;
          }
          ctx.save();
          ctx.translate(this.x, this.y);
          ctx.fillStyle = 'rgba(255,255,255,0.25)';
          ctx.fillRect(-this.r * 0.7, -200, this.r * 1.4, 170);
          ctx.fillStyle = '#6e4a36';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(-this.r, -this.r, this.r * 2, this.r * 2, 10);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#8b6650';
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.roundRect(i * 20 - 8, this.r - 22, 16, 20, 5);
            ctx.fill();
            ctx.stroke();
          }
          ctx.fillStyle = '#c9b49a';
          [[-20, -18], [20, -18], [0, -4]].forEach(([bx, by]) => {
            ctx.beginPath();
            ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.restore();
        },
      };
    },

    // ただの予告の帯（ドン・ボールの突進）
    band(y, h, dur) {
      return {
        t: 0, y, h, dur,
        update(dt) { this.t += dt; if (this.t > this.dur) this.dead = true; },
        draw(ctx) {
          ctx.fillStyle = `rgba(255,60,40,${0.18 + Math.sin(this.t * 22) * 0.12})`;
          ctx.fillRect(0, this.y - this.h / 2, G.W, this.h);
        },
      };
    },
  };

  // ---- ボス ----
  function enter(b, dt) {
    b.y += (b.targetY - b.y) * 2.2 * dt;
    if (Math.abs(b.y - b.targetY) < 2 || b.t > 2.4) { b.entering = false; b.y = b.targetY; }
  }

  function mouth(b, ox, oy) {
    return { x: b.x + ox * b.w, y: b.y + oy * b.h };
  }

  function throwBalls(b, w, n) {
    const colors = ['#ff4d6d', '#ffd23f', '#3ec1ff', '#7ae582'];
    for (let i = 0; i < n; i++) {
      const toward = U.clamp((w.player.x - b.x) / 200, -1, 1) * 70;
      w.spawnBullet({
        x: b.x + U.rand(-20, 20), y: b.y - b.h * 0.2, vx: w.spd(U.rand(-110, 110) + toward), vy: -w.spd(U.rand(170, 250)),
        ay: 290 * w.diff.bulletSpeed, r: 8, kind: 'ball', color: colors[i % colors.length],
      });
    }
  }

  function fireTriple(b, w, origin, interval = 0.22) {
    b.queue = b.queue || [];
    for (let i = 0; i < 3; i++) {
      b.queue.push({
        at: i * interval,
        fn: () => {
          const o = origin();
          w.fireAimed(o.x, o.y, w.n(w.late() ? 3 : 1), 0.35, w.spd(190), { kind: 'fire', r: 10 });
        },
      });
    }
  }

  function runQueue(b, dt) {
    if (!b.queue || !b.queue.length) return;
    for (const q of b.queue) q.at -= dt;
    while (b.queue.length && b.queue[0].at <= 0) b.queue.shift().fn();
  }

  function spawnSaucers(b, w) {
    const n = w.n(8);
    const cx = G.W / 2;
    const cy = G.H * 0.58;
    const R = Math.min(G.W * 0.47, G.H * 0.42);
    for (let i = 0; i < n; i++) {
      w.spawnBullet({
        x: b.x, y: b.y, sx: b.x, sy: b.y, r: 7, kind: 'saucer', a: (i / n) * Math.PI * 2, life: 0,
        update(s, dt) {
          s.life += dt;
          const t = s.life;
          let rad;
          if (t < 1.2) {
            const k = U.easeInOut(t / 1.2);
            s.x = U.lerp(s.sx, cx + Math.cos(s.a) * R, k);
            s.y = U.lerp(s.sy, cy + Math.sin(s.a) * R, k);
            return;
          }
          if (t < 3.2) rad = R;
          else if (t < 6) rad = U.lerp(R, R * 0.3, (t - 3.2) / 2.8);
          else rad = R * 0.3 + (t - 6) * 320;
          s.a += 0.9 * dt;
          s.x = cx + Math.cos(s.a) * rad;
          s.y = cy + Math.sin(s.a) * rad;
          if (t > 8) s.dead = true;
        },
      });
    }
  }

  const BOSSES = {
    gatts: {
      name: 'ガッツ', img: 'gatts', targetY: 130,
      init(b) { b.shotT = 1.2; b.lassoT = 1.5; b.gun = 1; },
      update(b, dt, w) {
        const half = b.hp < b.maxHp / 2;
        b.x = G.W / 2 + Math.sin(b.t * 0.9) * 110;
        b.shotT -= dt;
        if (b.shotT <= 0) {
          b.shotT = w.interval(half ? 1.7 : 1.35);
          b.gun = -b.gun;
          b.queue = [];
          for (let i = 0; i < 3; i++) {
            b.queue.push({
              at: i * 0.14,
              fn: () => w.fireAimed(b.x + b.gun * b.w * 0.4, b.y + b.h * 0.15, w.n(half ? 3 : 2), 0.3, w.spd(200), { color: '#ff4fd8' }),
            });
          }
        }
        runQueue(b, dt);
        // 体力が半分になると、投げ縄の輪っかが画面を横切る
        if (half) {
          b.lassoT -= dt;
          if (b.lassoT <= 0) {
            b.lassoT = 3.6;
            w.addHazard(Hazards.lasso(U.rand(0.45, 0.85) * G.H, Math.random() < 0.5 ? 1 : -1));
          }
        }
      },
    },

    pikari: {
      name: 'ピカリ', img: 'pikari', targetY: 110,
      init(b) { b.fanT = 1.2; b.saucerT = 1.0; b.col = 0; },
      update(b, dt, w) {
        const half = b.hp < b.maxHp / 2;
        b.x = G.W / 2 + Math.sin(b.t * 0.7) * 120;
        b.fanT -= dt;
        if (b.fanT <= 0) {
          b.fanT = w.interval(half ? 2.4 : 1.6);
          b.col++;
          const a = Math.PI / 2 + U.clamp((w.player.x - b.x) / 600, -0.3, 0.3);
          w.fireFan(b.x, b.y + b.h * 0.25, a, w.n(half ? 5 : 6), 1.1, w.spd(210), { kind: 'beam', color: b.col % 2 ? '#ff7ad9' : '#5ff3ff' });
        }
        // 体力が半分になると、小さな円盤で画面を囲む
        if (half) {
          b.saucerT -= dt;
          if (b.saucerT <= 0) { b.saucerT = 6.5; spawnSaucers(b, w); }
        }
      },
    },

    gaongo: {
      name: 'ガオンゴ', img: 'gaongo_big', targetY: 140,
      init(b) { b.fireT = 1.2; b.tailT = 2; b.rainT = 0; },
      update(b, dt, w) {
        const r = b.hp / b.maxHp;
        b.x = G.W / 2 + Math.sin(b.t * 0.6) * 70;
        const m = () => mouth(b, -0.06, -0.18);
        b.fireT -= dt;
        if (b.fireT <= 0) {
          b.fireT = w.interval(r < 0.6 ? 2.6 : 2.0);
          fireTriple(b, w, m);
        }
        runQueue(b, dt);
        // 体力が半分になると、しっぽで画面の下半分をなぎ払う
        if (r < 0.5) {
          b.tailT -= dt;
          if (b.tailT <= 0) { b.tailT = 5.5; w.addHazard(Hazards.tail(Math.random() < 0.5 ? 1 : -1)); }
        }
        // 体力が少なくなると、画面全体に小さな火の玉を降らせる
        if (r < 0.25) {
          b.rainT -= dt;
          if (b.rainT <= 0) {
            b.rainT = w.interval(0.2);
            w.spawnBullet({ x: U.rand(10, G.W - 10), y: -10, vx: U.rand(-20, 20), vy: w.spd(U.rand(150, 210)), r: 6, kind: 'fire' });
          }
        }
      },
    },

    don_ball: {
      name: 'ドン・ボール', img: 'don_ball', targetY: 125,
      init(b) { b.throwT = 1.2; b.chargeT = 3; b.mode = 'juggle'; },
      update(b, dt, w) {
        const half = b.hp < b.maxHp / 2;
        if (b.mode === 'juggle') {
          b.x = G.W / 2 + Math.sin(b.t * 0.8) * 100;
          b.rot = Math.sin(b.t * 3) * 0.08;
          b.throwT -= dt;
          if (b.throwT <= 0) { b.throwT = w.interval(1.5); throwBalls(b, w, w.n(half ? 5 : 4)); }
          // 体力が半分になると、玉乗りのまま左右に突進
          if (half) {
            b.chargeT -= dt;
            if (b.chargeT <= 0) { b.mode = 'up'; b.st = 0; b.invulnerable = true; }
          }
        } else if (b.mode === 'up') {
          b.st += dt;
          b.y -= 420 * dt;
          if (b.y < -b.h) {
            b.mode = 'warn';
            b.st = 0;
            b.lane = U.clamp(w.player.y, G.H * 0.45, G.H * 0.82);
            b.dir = Math.random() < 0.5 ? 1 : -1;
            w.addHazard(Hazards.band(b.lane, b.h * 0.7, 1.0));
          }
        } else if (b.mode === 'warn') {
          b.st += dt;
          if (b.st > 1.0) {
            b.mode = 'charge';
            b.x = b.dir > 0 ? -b.w : G.W + b.w;
            b.y = b.lane;
            b.invulnerable = false;
            w.shake(4);
          }
        } else if (b.mode === 'charge') {
          b.x += b.dir * 440 * dt;
          b.rot = b.dir * 0.2;
          if ((b.dir > 0 && b.x > G.W + b.w) || (b.dir < 0 && b.x < -b.w)) {
            b.mode = 'return';
            b.x = G.W / 2;
            b.y = -b.h;
            b.rot = 0;
          }
        } else if (b.mode === 'return') {
          b.y += (b.targetY - b.y) * 3 * dt;
          if (Math.abs(b.y - b.targetY) < 3) { b.mode = 'juggle'; b.chargeT = 5.5; }
        }
      },
    },

    junk_king: {
      name: 'ガラクタ大王', img: 'junk_king_1', targetY: 160,
      init(b) {
        b.form = 1;
        b.patT = 1.5;
        b.pat = 0;
        b.slamT = 3;
        b.tearT = 0;
        b.ringT = 4;
      },
      update(b, dt, w) {
        if (b.transition > 0) {
          b.transition -= dt;
          b.x += (G.W / 2 - b.x) * 2 * dt;
          if (b.transition < 0.8 && b.img === 'junk_king_1') {
            b.img = 'junk_king_2';
            b.flash = 1;
            w.shake(10);
            Sfx.play('explode');
            Particles.tinPop(b.x, b.y, 3);
          }
          if (Math.random() < 0.3) Particles.tinPop(b.x + U.rand(-b.w / 2, b.w / 2), b.y + U.rand(-b.h / 2, b.h / 2), 0.6);
          if (b.transition <= 0) { b.invulnerable = false; w.assists.start(); }
          return;
        }
        if (b.form === 1) {
          b.x = G.W / 2 + Math.sin(b.t * 0.5) * 60;
          // 各ステージの敵の攻撃を混ぜた弾幕
          b.patT -= dt;
          if (b.patT <= 0) {
            b.patT = w.interval(1.5);
            const p = b.pat++ % 4;
            if (p === 0) {
              b.queue = [];
              for (let i = 0; i < 3; i++) {
                b.queue.push({ at: i * 0.14, fn: () => w.fireAimed(b.x + (i % 2 ? 1 : -1) * b.w * 0.4, b.y + b.h * 0.1, w.n(3), 0.3, w.spd(200), { color: '#ff4fd8' }) });
              }
            } else if (p === 1) {
              w.fireFan(b.x, b.y + b.h * 0.1, Math.PI / 2, w.n(7), 1.3, w.spd(200), { kind: 'beam', color: '#ff7ad9' });
            } else if (p === 2) {
              fireTriple(b, w, () => ({ x: b.x, y: b.y - b.h * 0.2 }));
            } else {
              throwBalls(b, w, w.n(5));
            }
          }
          runQueue(b, dt);
          b.slamT -= dt;
          if (b.slamT <= 0) { b.slamT = 4.2; w.addHazard(Hazards.slam(U.clamp(w.player.x, 40, G.W - 40))); }
          return;
        }
        // 第2形態: 動きが速く、弾は涙のようにぽろぽろ落ちる
        b.x = G.W / 2 + Math.sin(b.t * 1.25) * 95;
        b.tearT -= dt;
        if (b.tearT <= 0) {
          b.tearT = w.interval(0.14);
          const side = Math.random() < 0.5 ? -1 : 1;
          w.spawnBullet({ x: b.x + side * b.w * 0.07, y: b.y - b.h * 0.3, vx: U.rand(-55, 55), vy: w.spd(U.rand(30, 70)), ay: 150 * w.diff.bulletSpeed, r: 6, kind: 'tear' });
        }
        b.ringT -= dt;
        if (b.ringT <= 0) {
          b.ringT = w.interval(3.2);
          w.fireRing(b.x, b.y - b.h * 0.25, w.n(12), w.spd(95), Math.random(), { kind: 'tear', r: 6 });
        }
        b.slamT -= dt;
        if (b.slamT <= 0) { b.slamT = 3.4; w.addHazard(Hazards.slam(U.clamp(w.player.x, 40, G.W - 40), 0.85)); }
      },
      // 第1形態の体力がなくなったら第2形態へ
      onZero(b, w) {
        if (b.form === 1) {
          b.form = 2;
          b.hp = b.maxHp2;
          b.maxHp = b.maxHp2;
          b.transition = 1.8;
          b.invulnerable = true;
          b.queue = [];
          w.clearBullets(true);
          w.banner('鎧がくだけた！', '#7fd8ff');
          return true; // まだ倒れない
        }
        return false;
      },
    },
  };

  window.Hazards = Hazards;
  window.BOSSES = BOSSES;
})();

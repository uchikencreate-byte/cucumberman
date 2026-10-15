// ゲーム本体: 1ステージ分の進行、当たり判定、描画
(() => {
  const C = window.CONFIG;

  // ---- セーブデータ（ブラウザに保存） ----
  const SAVE_KEY = 'cucumberman_save_v1';
  const Save = {
    data: {
      cleared: 0,
      best: { easy: [0, 0, 0, 0, 0], normal: [0, 0, 0, 0, 0] },
      seenOpening: false,
      sound: true,
      buttonsLeft: false,
    },
    load() {
      try {
        const s = localStorage.getItem(SAVE_KEY);
        if (s) {
          const d = JSON.parse(s);
          Object.assign(this.data, d);
          this.data.best = Object.assign({ easy: [0, 0, 0, 0, 0], normal: [0, 0, 0, 0, 0] }, d.best || {});
        }
      } catch (e) { /* 保存できない環境でも遊べる */ }
    },
    write() {
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* noop */ }
    },
  };

  // 救出した仲間の力（クリアしたステージ数で決まる）
  const POWER_STAGE = { joe: 1, zett: 2, bull: 3, jack: 4 };
  const has = (key) => Save.data.cleared >= POWER_STAGE[key];

  let run = null;

  // ---- 敵・ボスが使う道具 ----
  const World = {
    get player() { return run.player; },
    get diff() { return run.diff; },
    get assists() { return Assists; },
    // ふつうの後半は弾が増える
    boost() { return run.phase === 'waves' && run.t > run.lateAt ? run.diff.lateBoost : 1; },
    late() {
      if (run.boss && run.phase === 'boss') return run.boss.hp < run.boss.maxHp / 2 || run.boss.form === 2;
      return run.t > run.lateAt;
    },
    extra() { return run.diff.extraWaves; },
    n(c) { return Math.max(1, Math.floor(c * run.diff.bulletCount * this.boost() + 0.25)); },
    spd(v) { return v * run.diff.bulletSpeed; },
    interval(t) { return t / (run.diff.fireRate * Math.sqrt(this.boost())); },
    canFire(e) {
      return !e.peaceful && !e.calm && !e.hidden && run.player.alive && e.y > 10 && e.y < G.H * 0.72 && e.x > 0 && e.x < G.W;
    },
    spawnBullet(b) {
      b.r = b.r || 5;
      b.kind = b.kind || 'pellet';
      b.vx = b.vx || 0;
      b.vy = b.vy || 0;
      run.eBullets.push(b);
      return b;
    },
    fireFan(x, y, angle, count, spread, speed, o = {}) {
      for (let i = 0; i < count; i++) {
        const a = count > 1 ? angle + (i / (count - 1) - 0.5) * spread : angle;
        this.spawnBullet({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ...o });
      }
    },
    fireAimed(x, y, count, spread, speed, o) {
      this.fireFan(x, y, U.angleTo(x, y, run.player.x, run.player.y), count, spread, speed, o);
    },
    fireRing(x, y, count, speed, offset, o = {}) {
      for (let i = 0; i < count; i++) {
        const a = offset + (i / count) * Math.PI * 2;
        this.spawnBullet({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, ...o });
      }
    },
    addHazard(h) { run.hazards.push(h); },
    damagePlayer() { hurtPlayer(); },
    shake(v) { run.shake = Math.max(run.shake, v); },
    clearBullets(withScore) {
      for (const b of run.eBullets) {
        Particles.add({ kind: 'spark', x: b.x, y: b.y, vx: 0, vy: -30, life: 0.4, size: 3, color: '#fff3b0' });
        if (withScore) addScore(C.score.bulletCancel);
      }
      run.eBullets.length = 0;
    },
    banner(text, color, life = 2) { run.banners.push({ text, color: color || '#fff', t: 0, life }); },
  };

  function addScore(v) {
    run.score += Math.round(v * run.diff.scoreMul);
  }

  // ---- ステージ開始 ----
  function newRun(index, diffKey) {
    const stage = STAGES[index];
    Particles.clear();
    const lastT = stage.timeline.reduce((m, e) => Math.max(m, e[0]), 0);
    run = {
      stage, index, diffKey, diff: C.difficulty[diffKey],
      t: 0, phase: 'intro', phaseT: 0,
      score: 0, lives: C.player.lives, missed: false, hitFlag: false,
      player: { x: G.W / 2, y: G.H + 60, inv: 0, fireT: 0, alive: true, tilt: 0 },
      pBullets: [], eBullets: [], enemies: [], hazards: [], banners: [],
      boss: null, tlIdx: 0, lastT, lateAt: lastT * 0.55,
      barrier: { active: 0, cd: 0 }, gauge: 0,
      shake: 0, flash: 0, bgY: 0,
      frozen: false, paused: false,
      timeline: buildTimeline(stage, C.difficulty[diffKey]),
      gimmickDone: {}, bubbles: [], dark: 0, warm: 0,
      overT: 0, beamOn: false,
    };
    Assists.reset();
    Input.consume();
    World.banner(`STAGE ${stage.id}`, '#ffe14d', 2.2);
    return run;
  }

  // 敵の出現リスト。難易度の copies の数だけ、左右反転した敵を少し遅れて追加する
  function buildTimeline(stage, diff) {
    const base = stage.timeline.filter((e) => !e[2].normal || diff.extraWaves);
    const out = base.slice();
    for (let c = 1; c <= (diff.copies || 0); c++) {
      for (const [t, type, p] of base) {
        if (p.peace) continue;
        if (stage.hint && t < 20) continue; // ステージ1のはじめはチュートリアルなので増やさない
        const q = { ...p };
        if (q.x !== undefined) q.x = Math.abs(q.x - 0.5) < 0.08 ? U.clamp(q.x + (c % 2 ? 0.28 : -0.28), 0.1, 0.9) : 1 - q.x;
        if (q.side) q.side = q.side === 'L' ? 'R' : 'L';
        if (q.y !== undefined && q.side) q.y = U.clamp(q.y + 0.12, 0.25, 0.85);
        out.push([t + 0.6 * c, type, q]);
      }
    }
    return out.sort((a, b) => a[0] - b[0]);
  }

  // ---- 敵 ----
  function spawnEnemy(type, p) {
    const def = C.enemies[type];
    const beh = ENEMY_TYPES[type];
    const e = {
      type, def, beh, size: def.size, r: def.size * C.enemyHitScale,
      hp: def.hp * run.diff.enemyHp, x: 0, y: 0, t: 0, flash: 0,
      rot: 0, scale: 1, scaleX: 1, scaleY: 1,
    };
    beh.init(e, p, World);
    // ステージ5中盤: 出てきてすぐ目が青く変わる手下（撃たれず、攻撃もしない）
    if (p.peace) { e.peaceAt = 0.7; e.calm = true; }
    run.enemies.push(e);
    return e;
  }

  function hittable(e) {
    return !e.dead && !e.gone && !e.hidden && !e.peaceful && !e.calm && e.y > -e.size * 0.3;
  }

  function hitEnemy(e, dmg) {
    if (!hittable(e)) return;
    e.hp -= dmg;
    e.flash = 1;
    if (e.hp <= 0) killEnemy(e);
    else Sfx.play('hit');
  }

  function killEnemy(e) {
    e.dead = true;
    addScore(e.def.score);
    Particles.text(e.x, e.y - 10, String(Math.round(e.def.score * run.diff.scoreMul)), '#ffe14d', 12);
    if (has('jack')) run.gauge = Math.min(C.powers.jack.gaugeMax, run.gauge + C.powers.jack.perKill);
    Particles.tinPop(e.x, e.y, e.size / 48);
    Sfx.play('kill');
    if (e.beh.onKill) e.beh.onKill(e, World);
  }

  function updateEnemies(dt) {
    const p = run.player;
    for (const e of run.enemies) {
      e.t += dt;
      e.flash = Math.max(0, e.flash - dt * 6);
      if (e.peaceAt && !e.peaceful && e.t > e.peaceAt) {
        EnemyAI.makePeaceful(e);
        Sfx.play('peace');
      }
      if (e.peaceful) EnemyAI.peacefulUpdate(e, dt);
      else e.beh.update(e, dt, World);
      if (!e.peaceful && !e.calm && !e.hidden && !e.dead && p.alive &&
          U.dist2(e.x, e.y, p.x, p.y) < (e.r * 0.85 + C.player.hitRadius) ** 2) hurtPlayer();
      if (e.y > G.H + e.size + 30 || e.y < -400 || e.x < -220 || e.x > G.W + 220) e.gone = true;
    }
    run.enemies = run.enemies.filter((e) => !e.dead && !e.gone);
  }

  // ---- ボス ----
  function bossDims(b) {
    return Draw.spriteSize(Assets.images[b.img], b.size);
  }

  function spawnBoss() {
    const key = run.stage.boss;
    const def = BOSSES[key];
    const cfg = C.bosses[key];
    const hp = cfg.hp * run.diff.bossHp;
    const b = {
      key, def, name: def.name, img: def.img, size: cfg.size,
      x: G.W / 2, y: -cfg.size / 2, targetY: def.targetY,
      hp, maxHp: hp, maxHp2: (cfg.hp2 || 0) * run.diff.bossHp,
      t: 0, flash: 0, rot: 0, scale: 1, entering: true, invulnerable: false,
    };
    Object.assign(b, bossDims(b));
    def.init(b);
    run.boss = b;
    // ボス戦で曲を変える（曲がなければ、そのままステージの曲）
    if (run.stage.bossBgm) Bgm.play(run.stage.bossBgm, { keepIfMissing: true });
  }

  // 難易度「ふつう」のボス: リング弾をくり返し撃ち、体力が半分を切るとらせん弾も加わる
  const BARRAGE_STYLE = {
    gatts: { color: '#ff4fd8' },
    pikari: { kind: 'beam', color: '#5ff3ff' },
    gaongo: { kind: 'fire', r: 7 },
    don_ball: { color: '#ffe14d' },
    junk_king: { color: '#ff4fd8' },
  };
  function bossBarrage(b, dt) {
    const d = run.diff;
    if (!d.bossBarrage || b.invulnerable || b.transition > 0 || b.y < 0 || b.x < 20 || b.x > G.W - 20) return;
    if (b.mode && b.mode !== 'juggle') return; // ドン・ボールの突進中は撃たない
    const half = b.hp < b.maxHp / 2 || b.form === 2;
    const style = b.form === 2 ? { kind: 'tear', r: 6 } : BARRAGE_STYLE[b.key];
    const cx = b.x;
    const cy = b.y + b.h * 0.1;
    b.ringT = (b.ringT ?? 2) - dt;
    if (b.ringT <= 0) {
      b.ringT = World.interval(half ? 2.2 : 2.8);
      b.ringA = (b.ringA || 0) + 0.21;
      World.fireRing(cx, cy, World.n(d.ringCount), World.spd(105), b.ringA, style);
    }
    if (half) {
      b.spiralT = (b.spiralT ?? 0) - dt;
      if (b.spiralT <= 0) {
        b.spiralT = 0.13 / d.fireRate;
        b.spiralA = (b.spiralA || 0) + 0.33;
        for (const s of [0, Math.PI]) World.fireFan(cx, cy, b.spiralA + s, 1, 0, World.spd(120), style);
      }
    }
  }

  function damageBoss(dmg) {
    const b = run.boss;
    if (!b || b.entering || b.invulnerable || b.dying) return;
    b.hp -= dmg;
    // 大王の第2形態は、仲間全員の合体攻撃が出るまで倒れない
    if (b.form === 2 && !Assists.comboDone) b.hp = Math.max(b.hp, b.maxHp * 0.12);
    if (b.flash <= 0) b.flash = 0.35; // 撃たれ続けても白くなりっぱなしにならないよう、点滅は控えめに
    if (has('jack')) run.gauge = Math.min(C.powers.jack.gaugeMax, run.gauge + dmg * C.powers.jack.perBossDamage);
    Sfx.play('bossHit');
    if (b.hp <= 0) {
      b.hp = 0;
      if (b.def.onZero && b.def.onZero(b, World)) return;
      bossDefeated();
    }
  }

  function bossDefeated() {
    const b = run.boss;
    b.dying = true;
    b.dieT = 0;
    run.phase = 'bossDown';
    run.phaseT = 0;
    World.clearBullets(true);
    run.hazards.length = 0;
    addScore(C.score.bossBonus);
    Assists.active = false;
    Sfx.play('explode');
    World.shake(10);
  }

  function updateBoss(dt) {
    const b = run.boss;
    if (!b) return;
    b.t += dt;
    b.flash = Math.max(0, b.flash - dt * 5);
    Object.assign(b, bossDims(b));
    if (b.dying) { updateBossDown(b, dt); return; }
    if (b.entering) {
      b.y += (b.targetY - b.y) * 2.2 * dt;
      if (Math.abs(b.y - b.targetY) < 2 || b.t > 2.6) {
        b.entering = false;
        b.y = b.targetY;
        b.t = 0;
        const pre = STORY[run.stage.story].preBoss;
        if (pre && !run.preBossDone) {
          run.preBossDone = true;
          Game.storyPause(pre);
        }
      }
      return;
    }
    b.def.update(b, dt, World);
    bossBarrage(b, dt);
    const p = run.player;
    const r = Math.min(b.w, b.h) * 0.3;
    if (p.alive && !b.invulnerable && U.dist2(b.x, b.y, p.x, p.y) < (r + C.player.hitRadius) ** 2) hurtPlayer();
  }

  // ボスを倒したあとの演出: 爆発 → ガラクタが外れて小さな姿へ
  function updateBossDown(b, dt) {
    b.dieT += dt;
    if (b.dieT < 1.6) {
      if (Math.random() < 0.35) {
        Particles.tinPop(b.x + U.rand(-b.w / 2, b.w / 2) * 0.8, b.y + U.rand(-b.h / 2, b.h / 2) * 0.8, 1.2);
        if (Math.random() < 0.4) Sfx.play('kill');
      }
      b.x += Math.sin(b.dieT * 60) * 0.8;
      return;
    }
    if (!b.transformed) {
      b.transformed = true;
      Sfx.play('explode');
      World.shake(8);
      run.flash = 0.8;
      Particles.tinPop(b.x, b.y, 3.5);
      if (b.key === 'gaongo') { b.img = 'gaongo_small'; b.targetSize = 80; }
      else if (b.key === 'junk_king') { b.img = 'tin_king_small'; b.targetSize = 96; b.size = 96; }
      else b.targetSize = b.size * 0.45; // ガラクタが外れて、中から小さな人形が出てくる
    }
    if (b.targetSize) b.size += (b.targetSize - b.size) * 4 * dt;
    b.y += (G.H * 0.36 - b.y) * 2 * dt;
    b.x += (G.W / 2 - b.x) * 2 * dt;
    b.rot = Math.sin(b.dieT * 3) * 0.05;
    if (b.dieT > 3.4 && !run.finishing) {
      run.finishing = true;
      Game.finishStage();
    }
  }

  // ---- 自機 ----
  function canShoot() {
    return run.player.alive && (run.phase === 'waves' || run.phase === 'warning' || run.phase === 'boss');
  }

  function hurtPlayer() {
    const p = run.player;
    if (C.debug.god) return;
    if (!p.alive || p.inv > 0 || run.barrier.active > 0 || run.phase === 'bossDown' || run.phase === 'intro' || run.frozen) return;
    run.lives--;
    run.missed = true;
    run.hitFlag = true;
    p.inv = C.player.invincible;
    World.shake(8);
    run.flash = 0.35;
    Sfx.play('damage');
    Particles.burst(p.x, p.y, { count: 16, colors: ['#9dff5c', '#46c22b', '#ffffff'], speedMin: 80, speedMax: 260 });
    // 近くの弾を消して、立て直しやすく
    run.eBullets = run.eBullets.filter((b) => U.dist2(b.x, b.y, p.x, p.y) > 110 * 110);
    if (run.lives <= 0) {
      p.alive = false;
      run.overT = 1.6;
      Particles.tinPop(p.x, p.y, 2.5);
      Sfx.play('explode');
    }
  }

  function firePlayer() {
    const p = run.player;
    const sp = C.player.bulletSpeed;
    const y = p.y - C.player.size * 0.42;
    run.pBullets.push({ x: p.x, y, vx: 0, vy: -sp, dmg: C.player.bulletDamage });
    if (has('joe')) {
      const a = C.powers.joe.spreadAngle;
      for (const s of [-1, 1]) {
        run.pBullets.push({ x: p.x + s * 6, y: y + 4, vx: Math.sin(a * s) * sp, vy: -Math.cos(a) * sp, dmg: C.powers.joe.sideDamage, side: true });
      }
    }
    Sfx.play('shot');
  }

  function updatePlayer(dt) {
    const p = run.player;
    if (run.phase === 'intro') {
      p.y += (G.H * 0.8 - p.y) * 3 * dt;
      Input.consume();
      return;
    }
    if (!p.alive) { Input.consume(); return; }
    const d = Input.consume();
    const k = Input.keyAxis();
    p.x = U.clamp(p.x + d.x + k.x * C.player.keySpeed * dt, 14, G.W - 14);
    p.y = U.clamp(p.y + d.y + k.y * C.player.keySpeed * dt, 30, G.H - 26);
    p.tilt += (U.clamp((d.x + k.x * 4) * 0.06, -0.3, 0.3) - p.tilt) * Math.min(1, dt * 12);
    p.inv = Math.max(0, p.inv - dt);
    // ショット（設定で自動連射にもできる）
    const shooting = canShoot() && (C.player.autoFire || Input.firing());
    if (shooting) {
      p.fireT -= dt;
      if (p.fireT <= 0) { p.fireT += C.player.fireInterval; firePlayer(); }
    } else {
      p.fireT = 0; // 押した瞬間にすぐ撃てるように
    }
    // ゼット: まっすぐ強いビーム（撃っているあいだだけ）
    run.beamOn = shooting && has('zett');
    if (run.beamOn) {
      const half = C.powers.zett.beamWidth / 2;
      const dmg = C.powers.zett.beamDps * dt;
      for (const e of run.enemies) {
        if (e.y < p.y && Math.abs(e.x - p.x) < e.r + half) hitEnemyQuiet(e, dmg);
      }
      const b = run.boss;
      if (b && b.y < p.y && Math.abs(b.x - p.x) < b.w * 0.35 + half) damageBoss(dmg);
    }
    // バリア
    const bar = run.barrier;
    bar.cd = Math.max(0, bar.cd - dt);
    if (bar.active > 0) {
      bar.active -= dt;
      const R = C.powers.bull.radius;
      run.eBullets = run.eBullets.filter((b) => {
        if (U.dist2(b.x, b.y, p.x, p.y) < (R + b.r) ** 2) {
          Particles.add({ kind: 'spark', x: b.x, y: b.y, vx: 0, vy: 0, life: 0.3, size: 4, color: '#fff7b0' });
          return false;
        }
        return true;
      });
    }
  }

  // ビームのダメージ（毎フレーム当たるので、効果音は鳴らしすぎない）
  function hitEnemyQuiet(e, dmg) {
    if (!hittable(e)) return;
    e.hp -= dmg;
    e.flash = Math.max(e.flash, 0.4);
    if (e.hp <= 0) killEnemy(e);
  }

  function updateBullets(dt) {
    const p = run.player;
    // 自機の弾
    for (const b of run.pBullets) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -20 || b.x > G.W + 20) { b.dead = true; continue; }
      for (const e of run.enemies) {
        if (hittable(e) && U.dist2(b.x, b.y, e.x, e.y) < (e.r + 4) ** 2) {
          hitEnemy(e, b.dmg);
          b.dead = true;
          break;
        }
      }
      const boss = run.boss;
      if (!b.dead && boss && !boss.entering && !boss.dying &&
          Math.abs(b.x - boss.x) < boss.w * 0.36 && Math.abs(b.y - boss.y) < boss.h * 0.4) {
        if (!boss.invulnerable) {
          damageBoss(b.dmg);
          Particles.add({ kind: 'spark', x: b.x, y: b.y, vx: U.rand(-40, 40), vy: -40, life: 0.2, size: 3, color: '#fff' });
        }
        b.dead = true;
      }
    }
    run.pBullets = run.pBullets.filter((b) => !b.dead);

    // 敵の弾
    const hr = C.player.hitRadius;
    for (const b of run.eBullets) {
      if (b.update) b.update(b, dt);
      else {
        b.vx += (b.ax || 0) * dt;
        b.vy += (b.ay || 0) * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
      }
      b.t = (b.t || 0) + dt;
      if (b.kind === 'bubble') b.x += Math.sin(b.t * 6 + b.vy) * 20 * dt;
      if (b.y > G.H + 30 || b.y < -60 || b.x < -40 || b.x > G.W + 40) {
        if (!b.update || b.y > G.H + 30) b.dead = true;
      }
      if (b.update && (b.x < -80 || b.x > G.W + 80 || b.y < -80 || b.y > G.H + 80)) b.dead = true;
      if (!b.dead && p.alive && U.dist2(b.x, b.y, p.x, p.y) < (b.r * 0.7 + hr) ** 2) {
        if (run.barrier.active > 0) b.dead = true;
        else if (p.inv <= 0) { b.dead = true; hurtPlayer(); }
      }
    }
    run.eBullets = run.eBullets.filter((b) => !b.dead);
  }

  // ---- 仲間の力（ボタン） ----
  function useBarrier() {
    if (!run || run.paused || run.frozen || !has('bull') || !run.player.alive) return;
    if (run.barrier.cd > 0) return;
    run.barrier.active = C.powers.bull.duration;
    run.barrier.cd = C.powers.bull.cooldown;
    Sfx.play('barrier');
  }

  function useSpecial() {
    if (!run || run.paused || run.frozen || !has('jack') || !run.player.alive) return;
    if (run.gauge < C.powers.jack.gaugeMax) return;
    if (!(run.phase === 'waves' || run.phase === 'boss' || run.phase === 'warning')) return;
    run.gauge = 0;
    World.clearBullets(true);
    for (const e of run.enemies) {
      if (hittable(e)) hitEnemy(e, C.powers.jack.damage);
    }
    if (run.boss && !run.boss.entering) damageBoss(run.boss.maxHp * C.powers.jack.bossDamageRate);
    Particles.confetti(90);
    Particles.balloons(8);
    run.flash = 0.5;
    run.player.inv = Math.max(run.player.inv, 1.0);
    World.shake(6);
    World.banner('ビックリ！', '#ff4d6d', 1.2);
    Sfx.play('special');
  }

  // ---- ステージ5: 駆けつける仲間 ----
  const Assists = {
    order: ['joe', 'zett', 'bullgao', 'jack'],
    list: [],
    active: false,
    idx: 0,
    nextT: 0,
    comboT: 0,
    comboDone: false,
    reset() {
      this.list = [];
      this.active = false;
      this.idx = 0;
      this.comboDone = false;
    },
    start() {
      this.active = true;
      this.nextT = 4;
      this.comboT = 2.5;
    },
    update(dt) {
      for (const a of this.list) a.update(dt);
      if (!this.active) return;
      this.nextT -= dt;
      // ピンチ（被弾）のときは、すぐに駆けつける
      if (run.hitFlag) {
        run.hitFlag = false;
        if (this.nextT > 0.8) this.nextT = 0.8;
      }
      if (this.nextT <= 0 && this.idx < this.order.length) {
        this.arrive(this.order[this.idx++]);
        this.nextT = 4;
      }
      if (this.idx >= this.order.length && !this.comboDone) {
        this.comboT -= dt;
        if (this.comboT <= 0) this.combo();
      }
    },
    arrive(key) {
      const first = this.list.length === 0;
      const a = makeAssist(key);
      this.list.push(a);
      if (first) a.say = { text: 'ひとりじゃないよ！', t: 0 };
      Sfx.play('power');
      Particles.add({ kind: 'ring', x: a.tx, y: a.ty, life: 0.6, size: 50, color: '#ffe14d' });
    },
    // 全員そろうと、画面いっぱいの合体攻撃
    combo() {
      this.comboDone = true;
      World.banner('みんなの合体攻撃！', '#ffe14d', 2.4);
      run.flash = 1;
      World.shake(12);
      World.clearBullets(true);
      Particles.confetti(140);
      Particles.balloons(12);
      Sfx.play('special');
      setTimeout(() => Sfx.play('explode'), 250);
      if (run.boss) damageBoss(run.boss.maxHp * 0.4);
    },
    draw(ctx) {
      for (const a of this.list) a.draw(ctx);
    },
  };

  function makeAssist(key) {
    const p = () => run.player;
    const base = {
      key, t: 0, fireT: 0.5,
      draw(ctx) {
        const bob = Math.sin(this.t * 4) * 3;
        for (const s of this.sprites) Draw.drawSprite(s.img, s.x(this), s.y(this) + bob, s.size);
        if (this.extraDraw) this.extraDraw(ctx);
        if (this.say && this.say.t < 2.6) {
          const sx = U.clamp(this.x, 90, G.W - 90);
          speechBubble(ctx, sx, this.y - 52, this.say.text);
        }
      },
      move(dt) {
        this.t += dt;
        this.x += (this.tx - this.x) * 3 * dt;
        this.y += (this.ty - this.y) * 3 * dt;
        if (this.say) this.say.t += dt;
      },
    };
    const self = (o) => (a) => a[o];
    if (key === 'joe') {
      // 横から3方向の弾
      return Object.assign(base, {
        x: -40, y: G.H * 0.68, tx: 30, ty: G.H * 0.68,
        sprites: [{ img: 'wild_joe', x: self('x'), y: self('y'), size: 56 }],
        update(dt) {
          this.move(dt);
          this.fireT -= dt;
          if (this.fireT <= 0) {
            this.fireT = 0.3;
            for (const a of [-0.15, 0, 0.15]) {
              const ang = -Math.PI / 2 + 0.35 + a;
              run.pBullets.push({ x: this.x + 10, y: this.y - 20, vx: Math.cos(ang) * 520, vy: Math.sin(ang) * 520, dmg: 0.7, side: true, joe: true });
            }
          }
        },
      });
    }
    if (key === 'zett') {
      // 上からビーム
      return Object.assign(base, {
        x: G.W + 40, y: 40, tx: G.W - 34, ty: 48,
        sprites: [{ img: 'zett', x: self('x'), y: self('y'), size: 56 }],
        update(dt) {
          this.move(dt);
          const b = run.boss;
          if (b && !b.dying && this.t > 0.6) damageBoss(5 * dt);
        },
        extraDraw(ctx) {
          const b = run.boss;
          if (!b || b.dying || this.t < 0.6) return;
          beamLine(ctx, this.x - 8, this.y + 10, b.x + 20, b.y, 6);
        },
      });
    }
    if (key === 'bullgao') {
      // ブルちゃんとガオンゴがバリアを広げる
      return Object.assign(base, {
        x: G.W / 2, y: G.H + 60, tx: G.W / 2, ty: G.H * 0.5, wallY: G.H * 0.5, on: 0,
        sprites: [
          { img: 'bull_chan', x: () => 28, y: (a) => a.y, size: 52 },
          { img: 'gaongo_small', x: () => G.W - 30, y: (a) => a.y, size: 48 },
        ],
        update(dt) {
          this.move(dt);
          this.on = (this.t % 7) < 4.5 && this.t > 0.8 ? Math.min(1, this.on + dt * 4) : Math.max(0, this.on - dt * 4);
          if (this.on > 0.5) {
            const y = this.y;
            run.eBullets = run.eBullets.filter((b) => {
              if (Math.abs(b.y - y) < 10 && b.vy >= 0) {
                Particles.add({ kind: 'spark', x: b.x, y: b.y, vx: 0, vy: -20, life: 0.3, size: 3, color: '#fff7b0' });
                return false;
              }
              return true;
            });
          }
        },
        extraDraw(ctx) {
          if (this.on <= 0) return;
          ctx.save();
          ctx.globalAlpha = this.on * (0.55 + Math.sin(this.t * 10) * 0.1);
          const g = ctx.createLinearGradient(0, this.y - 10, 0, this.y + 10);
          g.addColorStop(0, 'rgba(255,240,120,0)');
          g.addColorStop(0.5, 'rgba(255,240,120,0.9)');
          g.addColorStop(1, 'rgba(160,255,120,0)');
          ctx.fillStyle = g;
          ctx.fillRect(40, this.y - 10, G.W - 80, 20);
          ctx.restore();
        },
      });
    }
    // ジャック: 紙吹雪と風船で弾を消す
    return Object.assign(base, {
      x: G.W + 40, y: G.H * 0.34, tx: G.W - 30, ty: G.H * 0.34, fireT: 1.0,
      sprites: [{ img: 'jack', x: self('x'), y: self('y'), size: 56 }],
      update(dt) {
        this.move(dt);
        this.fireT -= dt;
        if (this.fireT <= 0) {
          this.fireT = 4.5;
          World.clearBullets(true);
          Particles.confetti(50);
          Particles.balloons(5);
          Sfx.play('special');
        }
      },
    });
  }

  function speechBubble(ctx, x, y, text) {
    ctx.save();
    ctx.font = "900 15px 'M PLUS Rounded 1c', sans-serif";
    const w = ctx.measureText(text).width + 22;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - 16, w, 32, 14);
    ctx.moveTo(x - 6, y + 16);
    ctx.lineTo(x, y + 28);
    ctx.lineTo(x + 6, y + 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 5, y + 13, 10, 4);
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function beamLine(ctx, x1, y1, x2, y2, w) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.85;
    ctx.strokeStyle = '#5ff3ff';
    ctx.lineWidth = w + 4 + Math.sin(performance.now() / 40) * 1.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = w * 0.4;
    ctx.stroke();
    ctx.restore();
  }

  // ---- ステージの仕掛け ----
  function updateGimmicks(dt) {
    const t = run.t;
    for (const g of run.stage.gimmicks) {
      const id = g.kind + (g.at || g.from);
      if (g.at !== undefined && t >= g.at && !run.gimmickDone[id]) {
        run.gimmickDone[id] = true;
        if (g.kind === 'banner') World.banner(g.text, g.color);
        if (g.kind === 'peace') {
          for (const e of run.enemies) EnemyAI.makePeaceful(e);
          run.eBullets.forEach((b) => Particles.add({ kind: 'spark', x: b.x, y: b.y, vx: 0, vy: -20, life: 0.5, size: 3, color: '#bfefff' }));
          run.eBullets.length = 0;
          Sfx.play('peace');
        }
      }
    }
    const inRange = (kind) => run.stage.gimmicks.some((g) => g.kind === kind && t >= g.from && t < g.to);
    // ステージ3: 泡で視界が少し悪くなる
    if (inRange('bubbles') && Math.random() < dt * 1.6) {
      run.bubbles.push({ x: U.rand(0, G.W), y: G.H + 40, r: U.rand(18, 42), vy: U.rand(-120, -75), ph: Math.random() * 6 });
    }
    for (const b of run.bubbles) { b.y += b.vy * dt; b.ph += dt; }
    run.bubbles = run.bubbles.filter((b) => b.y > -60);
    // ステージ4: スポットライトが消えて暗くなる
    const dark = inRange('dark');
    if (dark && !run.gimmickDone.darkOn) { run.gimmickDone.darkOn = true; World.banner('ライトが消えた！', '#ffde59'); }
    if (!dark && run.gimmickDone.darkOn && !run.gimmickDone.darkOff) { run.gimmickDone.darkOff = true; World.banner('ライトがついた！', '#ffde59', 1.4); }
    run.dark += ((dark ? 1 : 0) - run.dark) * Math.min(1, dt * 2);
    // ステージ5: 大王の部屋に近づく暖かい光
    if (inRange('warm') || (run.stage.gimmicks.some((g) => g.kind === 'warm') && run.phase !== 'waves')) run.warm = Math.min(1, run.warm + dt / 12);
  }

  // ---- 進行 ----
  function update(dt) {
    run.phaseT += dt;
    run.shake = Math.max(0, run.shake - dt * 30);
    run.flash = Math.max(0, run.flash - dt * 2.5);
    const scroll = run.phase === 'boss' || run.phase === 'bossDown' ? 0.5 : 1;
    run.bgY += C.scrollSpeed * scroll * dt;

    if (run.phase === 'intro') {
      if (run.phaseT > 2.0) { run.phase = 'waves'; run.phaseT = 0; }
    } else if (run.phase === 'waves') {
      run.t += dt;
      while (run.tlIdx < run.timeline.length && run.timeline[run.tlIdx][0] <= run.t) {
        const [, type, p] = run.timeline[run.tlIdx++];
        spawnEnemy(type, p);
      }
      updateGimmicks(dt);
      const done = run.tlIdx >= run.timeline.length;
      const hostile = run.enemies.some((e) => !e.peaceful);
      const gap = run.stage.endGap || 3;
      if (done && ((run.t > run.lastT + gap && !hostile) || run.t > run.lastT + 12)) {
        run.phase = 'warning';
        run.phaseT = 0;
        World.banner('WARNING', '#ff3b3b', 2.6);
        Sfx.play('warning');
      }
    } else if (run.phase === 'warning') {
      updateGimmicks(dt);
      if (run.phaseT > 2.6) {
        run.phase = 'boss';
        run.phaseT = 0;
        spawnBoss();
      }
    } else if (run.phase === 'boss' || run.phase === 'bossDown') {
      updateGimmicks(dt);
    }

    updatePlayer(dt);
    updateEnemies(dt);
    updateBoss(dt);
    Assists.update(dt);
    updateBullets(dt);
    for (const h of run.hazards) h.update(dt, World);
    run.hazards = run.hazards.filter((h) => !h.dead);
    Particles.update(dt);
    for (const b of run.banners) b.t += dt;
    run.banners = run.banners.filter((b) => b.t < b.life);

    if (run.overT > 0) {
      run.overT -= dt;
      if (run.overT <= 0) Game.gameOver();
    }
  }

  // ---- 描画 ----
  function drawBackground(ctx) {
    const img = Assets.images[run.stage.bg];
    if (!img) { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, G.W, G.H); return; }
    const h = (G.W * img.height) / img.width;
    const off = run.bgY % h;
    for (let y = off - h; y < G.H; y += h) ctx.drawImage(img, 0, Math.floor(y), G.W, Math.ceil(h) + 1);
  }

  function drawEnemy(ctx, e) {
    if (e.beh.draw && e.beh.draw(e, ctx)) return;
    if (e.hidden) return;
    if (e.peaceful) {
      ctx.save();
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#7fd8ff';
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    const rot = (e.beh.rot && !e.peaceful ? e.beh.rot(e) : 0) + (e.rot || 0);
    Draw.drawSprite(e.type, e.x, e.y, e.size, {
      rot, scale: e.scale, scaleX: e.scaleX, scaleY: e.scaleY, flash: e.flash,
      outline: e.peaceful ? e.type + '_blue' : e.type,
    });
  }

  function drawBoss(ctx) {
    const b = run.boss;
    if (!b) return;
    if (b.dying && b.dieT < 1.6 && Math.floor(b.dieT * 20) % 2) b.flash = 0.6;
    Draw.drawSprite(b.img, b.x, b.y, b.size, { rot: b.rot, flash: run.frozen ? 0 : b.flash, outline: b.img });
  }

  function drawPlayerBullets(ctx) {
    for (const b of run.pBullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
      ctx.fillStyle = b.joe ? '#ffb347' : b.side ? '#c6ff6b' : '#7dff4f';
      ctx.strokeStyle = '#0d3b0d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, 3.4, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.ellipse(-1, -2.5, 1.1, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (run.beamOn) {
      const p = run.player;
      const w = C.powers.zett.beamWidth;
      const pulse = Math.sin(performance.now() / 50) * 1.5;
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#5ff3ff';
      ctx.fillRect(p.x - w / 2 - pulse, 0, w + pulse * 2, p.y - 28);
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#e8ffff';
      ctx.fillRect(p.x - w * 0.18, 0, w * 0.36, p.y - 28);
      ctx.restore();
    }
  }

  function drawEnemyBullets(ctx) {
    for (const b of run.eBullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      switch (b.kind) {
        case 'beam': {
          ctx.rotate(Math.atan2(b.vy, b.vx));
          ctx.fillStyle = b.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.roundRect(-11, -3.5, 22, 7, 3.5);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.fillRect(-7, -1, 14, 2);
          break;
        }
        case 'bubble': {
          ctx.fillStyle = 'rgba(160,230,255,0.35)';
          ctx.strokeStyle = '#e8fbff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, b.r + 1, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.strokeStyle = '#1b4a5c';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(-2.5, -2.5, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'fire': {
          const g = ctx.createRadialGradient(0, 0, 1, 0, 0, b.r + 3);
          g.addColorStop(0, '#fffbd0');
          g.addColorStop(0.45, '#ffb22e');
          g.addColorStop(1, '#ff3d1f');
          ctx.fillStyle = g;
          ctx.strokeStyle = '#3a0a00';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        }
        case 'ball': {
          ctx.rotate((b.t || 0) * 6);
          ctx.fillStyle = b.color;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.fillRect(-b.r, -1.5, b.r * 2, 3);
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'tear': {
          ctx.rotate(Math.atan2(b.vy, b.vx) - Math.PI / 2);
          ctx.fillStyle = '#5fb8ff';
          ctx.strokeStyle = '#0b2a55';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -b.r * 1.8);
          ctx.quadraticCurveTo(b.r * 1.1, 0, 0, b.r);
          ctx.quadraticCurveTo(-b.r * 1.1, 0, 0, -b.r * 1.8);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.8)';
          ctx.beginPath();
          ctx.arc(-1.5, -1, 1.5, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'saucer': {
          ctx.scale(1.35, 1.35);
          ctx.fillStyle = '#8a6a4f';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.ellipse(0, 1, 9, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#bff8ff';
          ctx.beginPath();
          ctx.arc(0, -1, 4, Math.PI, 0);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = Math.floor((b.life || 0) * 8) % 2 ? '#ff7ad9' : '#5ff3ff';
          ctx.fillRect(-6, 1, 2, 2);
          ctx.fillRect(4, 1, 2, 2);
          break;
        }
        default: {
          ctx.fillStyle = b.color || '#ff9a3c';
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.85)';
          ctx.beginPath();
          ctx.arc(-b.r * 0.3, -b.r * 0.3, b.r * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  function drawPlayer(ctx) {
    const p = run.player;
    if (!p.alive) return;
    if (p.inv > 0 && Math.floor(p.inv * 14) % 2 === 0) return;
    // 足元の影
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + 6, p.y + C.player.size * 0.45, 12, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    Draw.drawSprite('cucumberman', p.x, p.y, C.player.size, { rot: p.tilt });
    if (run.barrier.active > 0) {
      const R = C.powers.bull.radius;
      const k = run.barrier.active;
      ctx.save();
      ctx.globalAlpha = k < 0.8 && Math.floor(k * 12) % 2 ? 0.3 : 0.75;
      const g = ctx.createRadialGradient(p.x, p.y, R * 0.5, p.x, p.y, R);
      g.addColorStop(0, 'rgba(255,240,140,0.05)');
      g.addColorStop(0.85, 'rgba(255,230,90,0.35)');
      g.addColorStop(1, 'rgba(255,255,255,0.9)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff6a8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
    // 当たり判定の点（弾が多いときに見やすく）
    if (run.eBullets.length > 0) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#c10000';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawOverlays(ctx) {
    // 泡（ステージ3）
    for (const b of run.bubbles) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = 'rgba(190,255,220,0.35)';
      ctx.strokeStyle = 'rgba(230,255,240,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(b.x + Math.sin(b.ph * 2) * 6, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    // 暗転（ステージ4）
    if (run.dark > 0.01) {
      const p = run.player;
      const g = ctx.createRadialGradient(p.x, p.y, 40, p.x, p.y, 170);
      g.addColorStop(0, 'rgba(0,0,10,0)');
      g.addColorStop(1, `rgba(0,0,10,${0.62 * run.dark})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
    }
    // 暖かい光（ステージ5）
    if (run.warm > 0.01) {
      const g = ctx.createLinearGradient(0, 0, 0, G.H);
      g.addColorStop(0, `rgba(255,180,90,${0.32 * run.warm})`);
      g.addColorStop(0.6, `rgba(255,150,60,${0.1 * run.warm})`);
      g.addColorStop(1, 'rgba(255,150,60,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, G.W, G.H);
    }
  }

  function drawBanners() {
    for (const b of run.banners) {
      const k = b.t / b.life;
      const pop = Math.min(1, b.t / 0.25);
      const alpha = k > 0.8 ? (1 - k) / 0.2 : 1;
      const big = b.text === 'WARNING';
      const jp = /[^\x00-\x7F]/.test(b.text);
      const y = G.H * 0.38;
      if (big && Math.floor(b.t * 6) % 2) continue;
      if (b.text.startsWith('STAGE')) {
        Draw.comicText(b.text, G.W / 2, y - 20, { size: 44 * U.easeOutBack(pop), color: b.color, alpha });
        Draw.comicText(run.stage.name, G.W / 2, y + 22, { size: 22, color: '#fff', alpha: alpha * pop, font: "'M PLUS Rounded 1c', sans-serif", weight: 900 });
        continue;
      }
      Draw.comicText(b.text, G.W / 2, y, {
        size: (big ? 52 : jp ? 26 : 36) * U.easeOutBack(pop), color: b.color, alpha,
        font: jp ? "'M PLUS Rounded 1c', sans-serif" : undefined, weight: jp ? 900 : '', rot: -0.04,
      });
    }
  }

  function drawHud(ctx) {
    const top = ctx.createLinearGradient(0, 0, 0, 46);
    top.addColorStop(0, 'rgba(0,0,0,0.55)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, G.W, 46);
    // ライフ
    for (let i = 0; i < C.player.lives; i++) {
      Draw.drawSprite('cucumberman', 14 + i * 17, 21, 30, { alpha: i < run.lives ? 1 : 0.22 });
    }
    // スコア
    Draw.comicText(String(run.score).padStart(7, '0'), G.W / 2 + 6, 20, { size: 20, color: '#fff', lineWidth: 4, spacing: 1 });
    // ボスの体力
    const b = run.boss;
    if (b && !b.dying && run.phase === 'boss') {
      const x = 12;
      const y = 42;
      const w = G.W - 24;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(x - 2, y - 2, w + 4, 12);
      const r = b.entering ? Math.min(1, b.t / 2) : b.hp / b.maxHp;
      ctx.fillStyle = b.form === 2 ? '#5fb8ff' : '#ff4d4d';
      ctx.fillRect(x, y, w * r, 8);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, w + 4, 12);
      ctx.restore();
      Draw.comicText(b.name, x + 2, y + 18, { size: 13, align: 'left', font: "'M PLUS Rounded 1c', sans-serif", weight: 900, lineWidth: 3, shadow: false });
    }
    // 調整用のオプションが付いているときは、画面に表示する（ふつうに遊ぶときと取り違えないように）
    const dbg = C.debug;
    if (dbg.god || dbg.speed > 1 || dbg.clear !== null) {
      const parts = [dbg.god && '無敵', dbg.speed > 1 && `${dbg.speed}倍速`, dbg.clear !== null && `解放${dbg.clear}`].filter(Boolean);
      Draw.comicText('DEBUG ' + parts.join('・'), G.W / 2, 58, { size: 13, color: '#ff6b6b', font: "'M PLUS Rounded 1c', sans-serif", weight: 900, lineWidth: 3, shadow: false });
    }
    // ステージ1のはじめの操作説明
    if (run.stage.hint && run.phase === 'waves' && run.t < 5.5) {
      const a = Math.min(1, run.t * 2, (5.5 - run.t) * 2);
      Draw.comicText('画面をドラッグして 動かそう！', G.W / 2, G.H * 0.56, { size: 19, font: "'M PLUS Rounded 1c', sans-serif", weight: 900, alpha: a, color: '#fff' });
      const how = C.player.autoFire ? '弾は自動で出るよ' : ('ontouchstart' in window ? 'ショットボタンを押して撃とう' : 'Z キーを押して撃とう');
      Draw.comicText(how, G.W / 2, G.H * 0.56 + 28, { size: 16, font: "'M PLUS Rounded 1c', sans-serif", weight: 900, alpha: a, color: '#ffe14d' });
    }
  }

  function render() {
    const ctx = G.ctx;
    const s = (G.dpr * G.cssW) / G.W;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, G.W, G.H);
    if (!run) return;
    ctx.save();
    if (run.shake > 0) ctx.translate(U.rand(-run.shake, run.shake) * 0.5, U.rand(-run.shake, run.shake) * 0.5);
    drawBackground(ctx);
    for (const h of run.hazards) h.draw(ctx);
    for (const e of run.enemies) drawEnemy(ctx, e);
    drawBoss(ctx);
    Assists.draw(ctx);
    drawPlayerBullets(ctx);
    drawPlayer(ctx);
    drawEnemyBullets(ctx);
    Particles.draw();
    drawOverlays(ctx);
    ctx.restore();
    if (run.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.8, run.flash)})`;
      ctx.fillRect(0, 0, G.W, G.H);
    }
    drawBanners();
    drawHud(ctx);
  }

  let lastTs = 0;
  function frame(ts) {
    const dt = Math.min(1 / 30, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    if (run) {
      if (!run.paused && !run.frozen) {
        for (let i = 0; i < C.debug.speed && run && !run.frozen; i++) update(dt);
      }
      else if (run.frozen) Particles.update(dt);
      UI.updateHud(run);
    }
    render();
    requestAnimationFrame(frame);
  }

  // ---- 外から使う操作 ----
  const Game = {
    Save,
    has,
    get run() { return run; },
    newRun,
    endRun() { run = null; },
    useBarrier,
    useSpecial,
    // ゲームを止めて会話を見せる（ステージ5の大王の登場など）
    async storyPause(lines) {
      run.frozen = true;
      UI.setHudVisible(false);
      await UI.dialog(lines);
      run.frozen = false;
      UI.setHudVisible(true);
      Input.consume();
    },
    finishStage: () => App.finishStage(),
    gameOver: () => App.gameOver(),
    start() { requestAnimationFrame(frame); },
    render,
  };

  window.Game = Game;
})();

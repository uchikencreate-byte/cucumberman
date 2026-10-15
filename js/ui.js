// 画面の切りかえ（タイトル・ステージ選択・会話・結果など）と、ゲーム全体の流れ
(() => {
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const Save = Game.Save;
  const img = (key) => Assets.LIST[key];

  const UI = {
    show(id) {
      document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + id));
    },
    open(id) { $('#screen-' + id).classList.add('active'); },
    close(id) { $('#screen-' + id).classList.remove('active'); },
    hideAll() { document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active')); },

    setHudVisible(on) {
      $('#hud').classList.toggle('hidden', !on);
      $('#btn-fire').classList.toggle('hidden', !!C.player.autoFire);
      if (!on) Input.fireButton = false;
      $('#hud').classList.toggle('left', !!Save.data.buttonsLeft);
    },

    // プレイ中のボタンの見た目（毎フレーム）
    hudState: {},
    updateHud(run) {
      const st = this.hudState;
      const set = (k, v, fn) => { if (st[k] !== v) { st[k] = v; fn(v); } };
      const bar = $('#btn-barrier');
      const sp = $('#btn-special');
      set('hasBull', Game.has('bull'), (v) => bar.classList.toggle('hidden', !v));
      set('hasJack', Game.has('jack'), (v) => sp.classList.toggle('hidden', !v));
      const cd = run.barrier.cd;
      const max = C.powers.bull.cooldown;
      set('barP', Math.round((1 - cd / max) * 100), (v) => bar.style.setProperty('--p', v / 100));
      set('barOff', cd > 0 && run.barrier.active <= 0, (v) => bar.classList.toggle('off', v));
      set('barActive', run.barrier.active > 0, (v) => bar.classList.toggle('active', v));
      set('barCd', cd > 0 && run.barrier.active <= 0 ? String(Math.ceil(cd)) : '', (v) => { bar.querySelector('.power-cd').textContent = v; });
      const g = run.gauge / C.powers.jack.gaugeMax;
      set('spP', Math.round(g * 100), (v) => sp.style.setProperty('--p', v / 100));
      set('spReady', g >= 1, (v) => { sp.classList.toggle('ready', v); sp.classList.toggle('off', !v); });
    },

    // ---- 会話シーン ----
    dialog(lines, opts = {}) {
      return new Promise((resolve) => {
        const el = $('#screen-dialog');
        const backdrop = el.querySelector('.dlg-backdrop');
        const left = el.querySelector('.dlg-portrait.left');
        const right = el.querySelector('.dlg-portrait.right');
        const nameEl = el.querySelector('.dlg-name');
        const textEl = el.querySelector('.dlg-text');
        const skip = el.querySelector('.dlg-skip');
        backdrop.style.backgroundImage = opts.backdrop ? `url(${img(opts.backdrop)})` : '';
        backdrop.classList.toggle('image', !!opts.backdrop);
        left.innerHTML = '';
        right.innerHTML = '';
        let i = -1;
        let typing = null;
        let full = '';

        const portrait = (container, sp, also) => {
          container.innerHTML = '';
          const keys = sp.imgs || [sp.img];
          for (const k of keys) {
            const im = document.createElement('img');
            im.src = img(k);
            if (sp.small) im.classList.add('small');
            if (sp.imgs) im.classList.add('extra');
            container.appendChild(im);
          }
          if (also) {
            const im = document.createElement('img');
            im.src = img(also);
            im.classList.add('extra');
            container.appendChild(im);
          }
        };

        const next = () => {
          if (typing) { // 表示途中なら全部出す
            clearInterval(typing);
            typing = null;
            textEl.textContent = full;
            return;
          }
          i++;
          if (i >= lines.length) { finish(); return; }
          const line = lines[i];
          const sp = SPEAKERS[line.who];
          Sfx.play('tap');
          nameEl.textContent = line.action ? '' : sp.name;
          textEl.className = 'dlg-text' + (line.who === 'narration' ? ' narration' : '') + (line.action ? ' action' : '') + (line.big ? ' big' : '');
          left.classList.remove('nod');
          right.classList.remove('nod');
          if (line.who === 'narration') {
            left.classList.add('dim');
            right.classList.add('dim');
          } else if (sp.side === 'right') {
            if (!right.children.length) portrait(right, sp);
            right.classList.remove('dim');
            left.classList.add('dim');
            if (line.action) { void right.offsetWidth; right.classList.add('nod'); }
          } else {
            portrait(left, sp, line.also);
            left.classList.remove('dim');
            right.classList.add('dim');
          }
          // キュウカンバーマンは、いつも右にいる（オープニング以外のナレーションでは出さない）
          if (!right.children.length && (line.who !== 'narration' || opts.hero)) portrait(right, SPEAKERS.cucumberman);
          full = line.text;
          textEl.textContent = '';
          let n = 0;
          typing = setInterval(() => {
            n++;
            textEl.textContent = full.slice(0, n);
            if (n >= full.length) { clearInterval(typing); typing = null; }
          }, 38);
        };

        const finish = () => {
          clearInterval(typing);
          el.removeEventListener('click', onClick);
          skip.removeEventListener('click', onSkip);
          el.classList.remove('active');
          resolve();
        };
        const onClick = (e) => { if (e.target !== skip) next(); };
        const onSkip = (e) => { e.stopPropagation(); finish(); };
        el.addEventListener('click', onClick);
        skip.addEventListener('click', onSkip);
        el.classList.add('active');
        next();
      });
    },

    // ---- 仲間の救出 ----
    rescue(friendKey) {
      return new Promise((resolve) => {
        const f = FRIENDS[friendKey];
        const el = $('#screen-rescue');
        const panel = el.querySelector('.panel');
        panel.classList.remove('open');
        el.querySelector('.rescue-img').src = img(f.img);
        el.querySelector('.rescue-name').textContent = `${f.name} を助けた！`;
        el.querySelector('.rescue-power').innerHTML = `仲間の力：<b>${f.power}</b><br>（${f.how}）`;
        el.classList.add('active');
        setTimeout(() => { panel.classList.add('open'); Sfx.play('rescue'); }, 500);
        const btn = $('#btn-rescue-ok');
        const done = () => {
          btn.removeEventListener('click', done);
          el.classList.remove('active');
          Sfx.play('tap');
          resolve();
        };
        btn.addEventListener('click', done);
      });
    },

    // ---- ステージクリア ----
    result(info) {
      return new Promise((resolve) => {
        const el = $('#screen-result');
        const rows = [
          ...(info.noMiss ? [
            ['ステージスコア', (info.score - info.noMissBonus).toLocaleString()],
            ['ノーミスボーナス', '+' + info.noMissBonus.toLocaleString()],
          ] : []),
          ['スコア', info.score.toLocaleString()],
          ['ハイスコア', info.best.toLocaleString() + (info.isNew ? '<span class="new">NEW!</span>' : '')],
        ];
        el.querySelector('.result-rows').innerHTML = rows.map(([a, b]) => `<div class="result-row"><span>${a}</span><span>${b}</span></div>`).join('');
        $('#btn-next').classList.toggle('hidden', !info.hasNext);
        el.classList.add('active');
        const finish = (v) => {
          $('#btn-next').onclick = null;
          $('#btn-result-select').onclick = null;
          el.classList.remove('active');
          Sfx.play('tap');
          resolve(v);
        };
        $('#btn-next').onclick = () => finish('next');
        $('#btn-result-select').onclick = () => finish('select');
      });
    },

    // ---- ステージ選択 ----
    buildSelect() {
      const list = $('#stage-list');
      list.innerHTML = '';
      const diff = App.difficulty;
      $('#btn-select-diff').textContent = C.difficulty[diff].label + ' ▼';
      STAGES.forEach((s, i) => {
        const unlocked = i <= Save.data.cleared;
        const cleared = i < Save.data.cleared;
        const b = document.createElement('button');
        b.className = 'stage-card' + (unlocked ? '' : ' locked');
        b.style.backgroundImage = `url(${img(s.bg)})`;
        const boss = BOSSES[s.boss];
        const best = Save.data.best[diff][i] || 0;
        b.innerHTML = `
          <div class="stage-num">${s.id}</div>
          <div class="stage-info">
            <div class="stage-name">${unlocked ? s.name : '？？？'}</div>
            <div class="stage-best">${unlocked ? 'ハイスコア ' + best.toLocaleString() : 'まえのステージをクリアしよう'}</div>
          </div>
          ${unlocked ? `<img class="stage-boss" src="${img(boss.img)}" alt="">` : '<div class="stage-lock">🔒</div>'}
          ${cleared ? '<div class="stage-clear">CLEAR!</div>' : ''}`;
        if (unlocked) b.addEventListener('click', () => { Sfx.play('tap'); App.startStage(i); });
        list.appendChild(b);
      });
      const fl = $('#friends-list');
      fl.innerHTML = '';
      ['joe', 'zett', 'bull', 'jack'].forEach((k) => {
        const im = document.createElement('img');
        im.src = img(FRIENDS[k].img);
        im.className = 'friend' + (Game.has(k) ? '' : ' missing');
        im.title = Game.has(k) ? `${FRIENDS[k].name}：${FRIENDS[k].power}` : '？？？';
        fl.appendChild(im);
      });
      $('#btn-buttons-side').textContent = 'ボタン: ' + (Save.data.buttonsLeft ? '左' : '右');
    },

    updateSoundButtons() {
      const t = '音: ' + (Save.data.sound ? 'ON' : 'OFF');
      $('#btn-sound').textContent = t;
      $('#btn-sound-2').textContent = t;
    },

    updateTitleScore() {
      const sum = (arr) => arr.reduce((a, b) => a + b, 0);
      const total = Math.max(sum(Save.data.best.easy), sum(Save.data.best.normal));
      $('#title-hiscore').textContent = total > 0 ? `ハイスコア ${total.toLocaleString()}` : '';
    },
  };

  // ---- ゲーム全体の流れ ----
  const App = {
    difficulty: 'normal',

    async boot() {
      Save.load();
      if (C.debug.clear !== null) Save.data.cleared = C.debug.clear;
      G.canvas = $('#game');
      G.ctx = G.canvas.getContext('2d');
      Draw.resize();
      window.addEventListener('resize', Draw.resize);
      Input.init(G.canvas);
      Sfx.enabled = Save.data.sound;
      Bgm.enabled = Save.data.sound;
      this.difficulty = Save.data.difficulty || 'normal';
      this.bind();
      Game.start();
      await Assets.load((p) => { $('#loading-fill').style.width = Math.round(p * 100) + '%'; });
      if (document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
      $('.loading-bar').classList.add('hidden');
      $('#btn-boot').classList.remove('hidden');
    },

    bind() {
      // 最初のタップで音を使えるようにする（スマホのブラウザの決まり）
      $('#btn-boot').addEventListener('click', () => { Sfx.unlock(); Sfx.play('tap'); this.goTitle(); });
      $('#btn-start').addEventListener('click', () => { Sfx.unlock(); Sfx.play('tap'); UI.open('difficulty'); });
      document.querySelectorAll('.diff-btn').forEach((b) => b.addEventListener('click', () => {
        Sfx.play('tap');
        this.difficulty = b.dataset.diff;
        Save.data.difficulty = this.difficulty;
        Save.write();
        UI.close('difficulty');
        // まだ何もクリアしていなければ、すぐにステージ1へ
        if (Save.data.cleared === 0 && !this.fromSelect) this.startStage(0);
        else this.goSelect();
        this.fromSelect = false;
      }));
      $('#screen-difficulty [data-close]').addEventListener('click', () => { Sfx.play('tap'); UI.close('difficulty'); this.fromSelect = false; });
      $('#btn-select-back').addEventListener('click', () => { Sfx.play('tap'); this.goTitle(); });
      $('#btn-select-diff').addEventListener('click', () => { Sfx.play('tap'); this.fromSelect = true; UI.open('difficulty'); });
      $('#btn-buttons-side').addEventListener('click', () => {
        Sfx.play('tap');
        Save.data.buttonsLeft = !Save.data.buttonsLeft;
        Save.write();
        UI.buildSelect();
      });
      const toggleSound = () => {
        Save.data.sound = !Save.data.sound;
        Save.write();
        Sfx.enabled = Save.data.sound;
        Bgm.setEnabled(Save.data.sound);
        UI.updateSoundButtons();
        Sfx.play('tap');
      };
      $('#btn-sound').addEventListener('click', toggleSound);
      $('#btn-sound-2').addEventListener('click', toggleSound);

      // プレイ中のボタン（自機の操作とぶつからないように止める）
      const press = (el, fn) => {
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
      };
      press($('#btn-barrier'), () => Game.useBarrier());
      press($('#btn-special'), () => Game.useSpecial());
      press($('#btn-pause'), () => this.pause());
      // ショットボタン: 押しているあいだ撃つ
      const fire = $('#btn-fire');
      const fireOff = () => { Input.fireButton = false; fire.classList.remove('on'); };
      fire.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { fire.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
        Input.fireButton = true;
        fire.classList.add('on');
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => fire.addEventListener(ev, fireOff));
      fire.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyX') Game.useBarrier();
        if (e.code === 'KeyC') Game.useSpecial();
        if (e.code === 'Escape' || e.code === 'KeyP') { if (Game.run && Game.run.paused) this.resume(); else this.pause(); }
      });
      $('#btn-resume').addEventListener('click', () => this.resume());
      $('#btn-retire').addEventListener('click', () => { UI.close('pause'); this.goSelect(); });
      $('#btn-over-select').addEventListener('click', () => { Sfx.play('tap'); UI.close('gameover'); this.goSelect(); });
      $('#btn-ending-title').addEventListener('click', () => { Sfx.play('tap'); this.goTitle(); });
      document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
      UI.updateSoundButtons();
    },

    goTitle() {
      Game.endRun();
      UI.setHudVisible(false);
      UI.updateTitleScore();
      UI.show('title');
      Bgm.play('bgm_title');
    },

    goSelect() {
      Game.endRun();
      UI.setHudVisible(false);
      UI.buildSelect();
      UI.show('select');
      Bgm.play('bgm_title');
    },

    async startStage(i) {
      UI.hideAll();
      if (i === 0 && !Save.data.seenOpening) {
        Bgm.play('bgm_title');
        await UI.dialog(STORY.opening, { backdrop: 'title' });
        Save.data.seenOpening = true;
        Save.write();
      }
      Game.newRun(i, this.difficulty);
      UI.setHudVisible(true);
      Bgm.play(STAGES[i].bgm);
    },

    pause() {
      const run = Game.run;
      if (!run || run.paused || run.frozen || run.phase === 'bossDown' || run.overT > 0) return;
      run.paused = true;
      Bgm.pause();
      UI.open('pause');
    },

    resume() {
      const run = Game.run;
      if (!run) return;
      Sfx.play('tap');
      run.paused = false;
      Input.consume();
      Bgm.resume();
      UI.close('pause');
    },

    // ボスを倒したあと: 会話 → 仲間の救出 → 結果
    async finishStage() {
      const run = Game.run;
      run.frozen = true;
      UI.setHudVisible(false);
      const stage = run.stage;
      const story = STORY[stage.story];
      await UI.dialog(story.boss);
      if (stage.friend) {
        await UI.rescue(stage.friend);
        if (story.friend) await UI.dialog(story.friend);
      }
      // ノーミスボーナス
      const noMiss = !run.missed;
      if (noMiss) run.score += Math.round(C.score.noMissBonus * run.diff.scoreMul);
      const bests = Save.data.best[run.diffKey];
      const isNew = run.score > (bests[run.index] || 0);
      if (isNew) bests[run.index] = run.score;
      Save.data.cleared = Math.max(Save.data.cleared, stage.id);
      Save.write();
      if (stage.id === STAGES.length) {
        await this.ending(run.score);
        return;
      }
      const r = await UI.result({
        score: run.score, best: bests[run.index], isNew, noMiss,
        noMissBonus: Math.round(C.score.noMissBonus * run.diff.scoreMul), hasNext: run.index + 1 < STAGES.length,
      });
      if (r === 'next') this.startStage(run.index + 1);
      else this.goSelect();
    },

    gameOver() {
      const run = Game.run;
      run.frozen = true;
      UI.setHudVisible(false);
      Bgm.stop();
      $('#screen-gameover .gameover-score').textContent = 'スコア ' + run.score.toLocaleString();
      const bests = Save.data.best[run.diffKey];
      if (run.score > (bests[run.index] || 0)) { bests[run.index] = run.score; Save.write(); }
      UI.open('gameover');
    },

    // エンディング: 朝のCOBSANYA。ナレーションはコードで重ねる
    ending(score) {
      return new Promise((resolve) => {
        Game.endRun();
        Bgm.play('bgm_ending');
        UI.show('ending');
        const el = $('.ending-text');
        const text = STORY.ending;
        el.textContent = '';
        $('.ending-score').textContent = 'ステージ5 スコア ' + score.toLocaleString();
        $('.ending-bottom').style.visibility = 'hidden';
        let n = 0;
        const timer = setInterval(() => {
          n++;
          el.textContent = text.slice(0, n);
          if (n >= text.length) {
            clearInterval(timer);
            setTimeout(() => { $('.ending-bottom').style.visibility = 'visible'; resolve(); }, 800);
          }
        }, 90);
      });
    },
  };

  window.UI = UI;
  window.App = App;
  App.boot();
})();

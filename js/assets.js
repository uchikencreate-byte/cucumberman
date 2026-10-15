// 画像の読み込み。白く光る版（被弾時）と、目が青い版（ステージ5の戦いたくない手下）も作る。
(() => {
  const LIST = {
    cucumberman: 'assets/characters/cucumberman.png',
    wild_joe: 'assets/characters/wild_joe.png',
    zett: 'assets/characters/zett.png',
    bull_chan: 'assets/characters/bull_chan.png',
    jack: 'assets/characters/jack.png',
    gatts: 'assets/bosses/gatts.png',
    pikari: 'assets/bosses/pikari.png',
    don_ball: 'assets/bosses/don_ball.png',
    gaongo_big: 'assets/bosses/gaongo_big.png',
    gaongo_small: 'assets/bosses/gaongo_small.png',
    junk_king_1: 'assets/bosses/junk_king_1.png',
    junk_king_2: 'assets/bosses/junk_king_2.png',
    tin_king_small: 'assets/bosses/tin_king_small.png',
    cactus: 'assets/enemies/cactus.png',
    tumbleweed: 'assets/enemies/tumbleweed.png',
    vulture: 'assets/enemies/vulture.png',
    mamebot: 'assets/enemies/mamebot.png',
    miniufo: 'assets/enemies/miniufo.png',
    starjunk: 'assets/enemies/starjunk.png',
    minikaiju: 'assets/enemies/minikaiju.png',
    bubblefrog: 'assets/enemies/bubblefrog.png',
    swampsnake: 'assets/enemies/swampsnake.png',
    boxsoldier: 'assets/enemies/boxsoldier.png',
    balloon: 'assets/enemies/balloon.png',
    ballmini: 'assets/enemies/ballmini.png',
    bg1: 'assets/backgrounds/bg_stage1.jpg',
    bg2: 'assets/backgrounds/bg_stage2.jpg',
    bg3: 'assets/backgrounds/bg_stage3.jpg',
    bg4: 'assets/backgrounds/bg_stage4.jpg',
    bg5: 'assets/backgrounds/bg_stage5.jpg',
    title: 'assets/ui/title_key_visual.jpg',
    ending: 'assets/ui/ending.jpg',
  };
  const ENEMY_KEYS = ['cactus', 'tumbleweed', 'vulture', 'mamebot', 'miniufo', 'starjunk', 'minikaiju', 'bubblefrog', 'swampsnake', 'boxsoldier', 'balloon', 'ballmini'];

  const images = {};
  const flash = {};
  const blueEyes = {};
  const outlined = {};
  const BOSS_KEYS = ['gatts', 'pikari', 'don_ball', 'gaongo_big', 'gaongo_small', 'junk_king_1', 'junk_king_2', 'tin_king_small'];

  function makeCanvas(img) {
    const c = document.createElement('canvas');
    c.width = img.naturalWidth || img.width;
    c.height = img.naturalHeight || img.height;
    return c;
  }

  // 被弾したときに白く光らせる版
  function makeFlash(img) {
    const c = makeCanvas(img);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  // 明るいオレンジ（光る目）を青に置きかえた版
  function makeBlueEyes(img) {
    const c = makeCanvas(img);
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    try {
      const d = x.getImageData(0, 0, c.width, c.height);
      const p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        if (p[i + 3] < 30) continue;
        const r = p[i], g = p[i + 1], b = p[i + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        if (mx < 190 || mx - mn < 90 || r !== mx) continue;
        const hue = ((g - b) / (mx - mn)) * 60; // 赤〜黄の範囲
        if (hue < 18 || hue > 55) continue;
        const v = mx / 255;
        p[i] = Math.round(70 * v);
        p[i + 1] = Math.round(190 * v);
        p[i + 2] = Math.round(255 * v);
      }
      x.putImageData(d, 0, 0);
    } catch (e) {
      // file:// で開いた場合など。色の置きかえはあきらめ、描画時に青い光を重ねる
      c.noRecolor = true;
    }
    return c;
  }

  // 背景から浮き上がるように、うすい光のふちどりを付けた版（pad はふちの太さ）
  function makeOutlined(src, sil, pad, color) {
    const w = (src.naturalWidth || src.width);
    const h = (src.naturalHeight || src.height);
    const c = document.createElement('canvas');
    c.width = w + pad * 2;
    c.height = h + pad * 2;
    const x = c.getContext('2d');
    const tint = document.createElement('canvas');
    tint.width = w;
    tint.height = h;
    const tx = tint.getContext('2d');
    tx.drawImage(sil, 0, 0);
    tx.globalCompositeOperation = 'source-in';
    tx.fillStyle = color;
    tx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.drawImage(tint, pad + Math.cos(a) * pad, pad + Math.sin(a) * pad);
    }
    x.drawImage(src, pad, pad);
    c.pad = pad;
    c.srcW = w;
    return c;
  }

  function load(onProgress) {
    const keys = Object.keys(LIST);
    let done = 0;
    return Promise.all(keys.map((k) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[k] = img;
        done++;
        onProgress && onProgress(done / keys.length);
        resolve();
      };
      img.onerror = () => {
        console.warn('画像が読み込めません:', LIST[k]);
        done++;
        onProgress && onProgress(done / keys.length);
        resolve();
      };
      img.src = LIST[k];
    }))).then(() => {
      for (const k of keys) {
        if (!images[k] || k.startsWith('bg') || k === 'title' || k === 'ending') continue;
        flash[k] = makeFlash(images[k]);
      }
      for (const k of ENEMY_KEYS) {
        if (!images[k]) continue;
        blueEyes[k] = makeBlueEyes(images[k]);
        outlined[k] = makeOutlined(images[k], images[k], 5, 'rgba(255,244,220,0.75)');
        outlined[k + '_blue'] = makeOutlined(blueEyes[k], images[k], 5, 'rgba(170,230,255,0.8)');
      }
      for (const k of BOSS_KEYS) {
        if (images[k]) outlined[k] = makeOutlined(images[k], images[k], 8, 'rgba(255,240,215,0.6)');
      }
    });
  }

  window.Assets = { LIST, images, flash, blueEyes, outlined, load };
})();

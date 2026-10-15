// ゲームの数値はすべてここで調整する（すべて仮の値）
window.CONFIG = {
  // 画面: 横幅は360で固定、縦は端末に合わせて 640〜800
  view: { width: 360, minHeight: 640, maxHeight: 800 },

  // 背景のスクロール速度（1秒あたり）
  scrollSpeed: 40,

  player: {
    size: 76,            // 表示の大きさ（長辺）
    hitRadius: 5,        // 当たり判定（見た目よりかなり小さい）
    lives: 3,
    invincible: 2.2,     // ダメージ後の無敵時間（秒）
    autoFire: false,     // true にすると弾が自動で出る（false はショットボタン / Zキーを押しているあいだ撃つ）
    fireInterval: 0.1,   // 連射の間隔（秒）
    bulletSpeed: 640,
    bulletDamage: 1,
    dragGain: 1.3,       // 指の移動量に対する自機の移動量
    keySpeed: 260,       // PCのキー操作の速さ
  },

  // 救出した仲間の力
  powers: {
    joe: { spreadAngle: 0.2, sideDamage: 0.5 },          // 3方向弾
    zett: { beamDps: 7, beamWidth: 10 },                 // ビーム（1秒あたりのダメージ。ショット中だけ出る）
    bull: { duration: 3, cooldown: 20, radius: 46 },     // バリア
    jack: { gaugeMax: 100, perKill: 6, perBossDamage: 0.25, damage: 40, bossDamageRate: 0.06 }, // 必殺技
  },

  // 難易度
  difficulty: {
    easy: {
      label: 'やさしい',
      bulletCount: 0.6,   // 弾の数の倍率
      bulletSpeed: 0.85,  // 弾の速さの倍率
      fireRate: 0.7,      // 撃つ頻度の倍率
      enemyHp: 1.0,       // ザコ敵の体力の倍率
      bossHp: 0.8,        // ボスの体力の倍率
      extraWaves: false,  // ふつう専用の追加の敵を出すか
      copies: 0,          // 敵を左右反転して何組ふやすか（0=ふやさない）
      bossBarrage: false, // ボスがリング弾・らせん弾も撃つか
      ringCount: 0,       // リング弾の数
      lateBoost: 1.0,     // ステージ後半の弾の増え方
      scoreMul: 1,
    },
    normal: {
      label: 'ふつう',
      bulletCount: 1.3,
      bulletSpeed: 1.15,
      fireRate: 1.3,
      enemyHp: 1.5,
      bossHp: 1.0,
      extraWaves: true,
      copies: 1,
      bossBarrage: true,
      ringCount: 12,
      lateBoost: 1.35,
      scoreMul: 1.5,
    },
  },

  // ザコ敵（size=表示の長辺、hp=体力、score=倒したときの点数）
  enemies: {
    cactus:     { size: 54, hp: 4, score: 100 },
    tumbleweed: { size: 46, hp: 3, score: 100 },
    vulture:    { size: 54, hp: 2, score: 150 },
    mamebot:    { size: 46, hp: 3, score: 120 },
    miniufo:    { size: 50, hp: 3, score: 150 },
    starjunk:   { size: 42, hp: 2, score: 80 },
    minikaiju:  { size: 52, hp: 4, score: 150 },
    bubblefrog: { size: 58, hp: 7, score: 250 },
    swampsnake: { size: 48, hp: 9, score: 300 },
    boxsoldier: { size: 58, hp: 4, score: 200 },
    balloon:    { size: 56, hp: 2, score: 120 },
    ballmini:   { size: 52, hp: 4, score: 150 },
  },
  enemyHitScale: 0.34,   // 当たり判定の半径 = size × この値

  // ボス
  bosses: {
    gatts:     { size: 150, hp: 220 },
    pikari:    { size: 150, hp: 300 },
    gaongo:    { size: 175, hp: 420 },
    don_ball:  { size: 160, hp: 460 },
    junk_king: { size: 220, hp: 560, hp2: 560 },
  },

  score: { bossBonus: 5000, noMissBonus: 3000, bulletCancel: 10 },

  audio: {
    sfxVolume: 0.45,
    bgmVolume: 0.6,
    bgmExtensions: ['mp3', 'm4a', 'ogg'], // assets/bgm/<スロット名>.<拡張子> を順に探す
  },

  // 調整用（URLに ?speed=3&god=1&clear=4 などを付ける）
  // speed: 早送りの倍率 / god: 無敵 / clear: クリア済みステージ数を上書き（仲間の力の確認用）
  debug: (() => {
    const q = new URLSearchParams(location.search);
    return {
      speed: Math.min(8, Math.max(1, Number(q.get('speed')) || 1)),
      god: q.get('god') === '1',
      clear: q.has('clear') ? Number(q.get('clear')) : null,
    };
  })(),
};

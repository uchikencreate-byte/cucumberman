// ステージの敵の出現タイムライン。[秒, 敵の種類, {x:横位置(0〜1), y:縦位置(0〜1), side:'L'|'R', normal:1(ふつう専用)}]
(() => {
  const line = (t, x, n = 5, gap = 0.32, phase = 0, extra = {}) =>
    Array.from({ length: n }, (_, i) => [t + i * gap, 'mamebot', { x, phase, ...extra }]);
  const spread = (t, type, xs, gap = 0.3, extra = {}) => xs.map((x, i) => [t + i * gap, type, { x, ...extra }]);
  const meteor = (from, to, every) => {
    const out = [];
    let i = 0;
    for (let t = from; t < to; t += every, i++) {
      const x = ((i * 0.37) % 1) * 0.9 + 0.05;
      out.push([t, 'starjunk', { x, normal: i % 3 === 2 ? 1 : 0 }]);
    }
    return out;
  };

  const STAGES = [
    {
      id: 1, name: '西部の荒野', bg: 'bg1', bgm: 'bgm_stage1', boss: 'gatts', friend: 'joe', story: 'stage1',
      hint: true,
      timeline: [
        // チュートリアル: 最初は敵が少ない
        [6, 'cactus', { x: 0.3 }], [9, 'cactus', { x: 0.7 }],
        [13, 'tumbleweed', { side: 'L', y: 0.35 }], [16.5, 'tumbleweed', { side: 'R', y: 0.45 }],
        [20, 'vulture', { x: 0.5 }], [24, 'vulture', { x: 0.25 }], [24.6, 'vulture', { x: 0.75 }],
        [28, 'cactus', { x: 0.2 }], [28, 'cactus', { x: 0.8 }], [30, 'tumbleweed', { side: 'L', y: 0.3 }],
        [34, 'vulture', { x: 0.4 }], [35, 'vulture', { x: 0.6 }], [36, 'tumbleweed', { side: 'R', y: 0.5 }],
        [39, 'cactus', { x: 0.5 }], [39, 'cactus', { x: 0.15, normal: 1 }], [39, 'cactus', { x: 0.85, normal: 1 }],
        // 後半: 敵が増える
        [43, 'tumbleweed', { side: 'L', y: 0.3 }], [43.8, 'tumbleweed', { side: 'R', y: 0.5 }], [44.6, 'tumbleweed', { side: 'L', y: 0.65, normal: 1 }],
        ...spread(47, 'vulture', [0.2, 0.5, 0.8], 0.4),
        [51, 'cactus', { x: 0.3 }], [51, 'cactus', { x: 0.7 }], [52, 'cactus', { x: 0.5, normal: 1 }],
        [54, 'tumbleweed', { side: 'R', y: 0.35 }], [54.5, 'tumbleweed', { side: 'L', y: 0.55 }],
        [57, 'vulture', { x: 0.3 }], [57.3, 'vulture', { x: 0.7 }], [57.6, 'vulture', { x: 0.5, normal: 1 }],
        [60, 'cactus', { x: 0.2 }], [60, 'cactus', { x: 0.5 }], [60, 'cactus', { x: 0.8 }],
        [63, 'tumbleweed', { side: 'L', y: 0.3 }], [63.5, 'tumbleweed', { side: 'R', y: 0.45 }], [64, 'tumbleweed', { side: 'L', y: 0.6 }],
        ...spread(66, 'vulture', [0.2, 0.4, 0.6], 0.4), [67.2, 'vulture', { x: 0.8, normal: 1 }],
        [70, 'cactus', { x: 0.35 }], [70, 'cactus', { x: 0.65 }],
      ],
      gimmicks: [],
    },
    {
      id: 2, name: 'レトロ宇宙', bg: 'bg2', bgm: 'bgm_stage2', boss: 'pikari', friend: 'zett', story: 'stage2',
      timeline: [
        ...line(4, 0.5, 4),
        [8, 'miniufo', { x: 0.3 }], [9, 'miniufo', { x: 0.7 }],
        [12, 'starjunk', { x: 0.2, dir: 1 }], [12.5, 'starjunk', { x: 0.8, dir: -1 }],
        ...line(15, 0.3, 5), ...line(15.8, 0.7, 5, 0.32, Math.PI, { normal: 1 }),
        [20, 'miniufo', { x: 0.5 }], [20.4, 'miniufo', { x: 0.2, normal: 1 }],
        ...spread(23, 'starjunk', [0.1, 0.5, 0.9], 0.25),
        ...line(26, 0.5, 6),
        [29, 'miniufo', { x: 0.25 }], [29.3, 'miniufo', { x: 0.75 }],
        // 中盤: 隕石ゾーン
        ...meteor(32, 44, 0.32),
        ...line(46, 0.25, 5), ...line(46, 0.75, 5, 0.32, Math.PI),
        ...spread(50, 'miniufo', [0.2, 0.5, 0.8], 0.3),
        ...spread(54, 'starjunk', [0.15, 0.4, 0.6, 0.85], 0.3),
        ...line(57, 0.5, 6), [57, 'miniufo', { x: 0.15, normal: 1 }], [57.5, 'miniufo', { x: 0.85, normal: 1 }],
        [62, 'miniufo', { x: 0.3 }], [62.3, 'miniufo', { x: 0.7 }], [62.6, 'starjunk', { x: 0.5 }],
        ...line(66, 0.3, 5), ...line(66.4, 0.7, 5, 0.32, Math.PI),
        ...spread(70, 'miniufo', [0.25, 0.5, 0.75], 0.35),
      ],
      gimmicks: [{ at: 31, kind: 'banner', text: '隕石ゾーン！', color: '#ffcf6b' }],
    },
    {
      id: 3, name: '怪獣ソフビの沼', bg: 'bg3', bgm: 'bgm_stage3', boss: 'gaongo', friend: 'bull', story: 'stage3',
      timeline: [
        // 前半は敵が多め
        [3, 'minikaiju', { x: 0.3, y: 0.35 }], [3.6, 'minikaiju', { x: 0.7, y: 0.3 }],
        [5, 'bubblefrog', { x: 0.5 }],
        ...spread(8, 'minikaiju', [0.2, 0.5, 0.8], 0.4, { y: 0.3 }),
        [11, 'bubblefrog', { x: 0.25 }], [11, 'bubblefrog', { x: 0.75, normal: 1 }],
        ...spread(14, 'minikaiju', [0.15, 0.4, 0.6, 0.85], 0.35, { y: 0.35 }),
        [17, 'swampsnake', { side: 'L', y: 0.55 }],
        [19, 'bubblefrog', { x: 0.5 }], [19.5, 'minikaiju', { x: 0.2, y: 0.3 }], [19.8, 'minikaiju', { x: 0.8, y: 0.3 }],
        ...spread(23, 'minikaiju', [0.3, 0.7, 0.5], 0.4, { y: 0.4 }),
        [26, 'swampsnake', { side: 'R', y: 0.45 }],
        // 中盤: 泡で視界が少し悪くなる
        [31, 'minikaiju', { x: 0.25, y: 0.3 }], [31.5, 'minikaiju', { x: 0.75, y: 0.3 }],
        [35, 'bubblefrog', { x: 0.3 }],
        [38, 'minikaiju', { x: 0.6, y: 0.35 }], [38.5, 'minikaiju', { x: 0.4, y: 0.25, normal: 1 }],
        [42, 'bubblefrog', { x: 0.7 }], [43, 'swampsnake', { side: 'L', y: 0.6, normal: 1 }],
        [48, 'swampsnake', { side: 'L', y: 0.4 }], [48.5, 'swampsnake', { side: 'R', y: 0.7, normal: 1 }],
        [52, 'bubblefrog', { x: 0.3 }], [52.4, 'bubblefrog', { x: 0.7 }],
        ...spread(55, 'minikaiju', [0.15, 0.4, 0.6, 0.85], 0.35, { y: 0.35 }),
        [59, 'swampsnake', { side: 'R', y: 0.5 }],
        [62, 'bubblefrog', { x: 0.5 }], [62.5, 'minikaiju', { x: 0.2, y: 0.3 }], [63, 'minikaiju', { x: 0.8, y: 0.3 }],
        ...spread(66, 'minikaiju', [0.3, 0.5, 0.7], 0.4, { y: 0.3 }),
      ],
      gimmicks: [{ from: 30, to: 47, kind: 'bubbles' }],
    },
    {
      id: 4, name: 'びっくり箱サーカス', bg: 'bg4', bgm: 'bgm_stage4', boss: 'don_ball', friend: 'jack', story: 'stage4',
      timeline: [
        [3, 'balloon', { x: 0.3 }], [4, 'balloon', { x: 0.7 }],
        [7, 'boxsoldier', {}],
        [10, 'ballmini', { side: 'L', y: 0.55 }],
        ...spread(13, 'balloon', [0.2, 0.5, 0.8], 0.4),
        [16, 'boxsoldier', {}], [16.5, 'boxsoldier', { normal: 1 }],
        [19, 'ballmini', { side: 'R', y: 0.4 }], [19.6, 'ballmini', { side: 'L', y: 0.7, normal: 1 }],
        ...spread(23, 'balloon', [0.15, 0.4, 0.6, 0.85], 0.4),
        [27, 'boxsoldier', {}], [27.5, 'ballmini', { side: 'L', y: 0.6 }],
        // 中盤: スポットライトが消えて暗くなる
        [33, 'balloon', { x: 0.3 }], [33.3, 'balloon', { x: 0.7 }],
        [36, 'boxsoldier', {}],
        [39, 'ballmini', { side: 'R', y: 0.5 }],
        ...spread(42, 'balloon', [0.25, 0.5, 0.75], 0.4),
        [45, 'boxsoldier', { normal: 1 }],
        [49, 'ballmini', { side: 'L', y: 0.45 }], [49.5, 'ballmini', { side: 'R', y: 0.7 }],
        [52, 'boxsoldier', {}], [52.6, 'boxsoldier', {}],
        ...spread(55, 'balloon', [0.1, 0.3, 0.5, 0.7, 0.9], 0.3),
        [59, 'ballmini', { side: 'L', y: 0.35 }], [59.5, 'ballmini', { side: 'R', y: 0.6 }], [60, 'ballmini', { side: 'L', y: 0.8, normal: 1 }],
        [63, 'boxsoldier', {}], [63.4, 'boxsoldier', { normal: 1 }], [63.8, 'balloon', { x: 0.5 }],
        [67, 'balloon', { x: 0.25 }], [67.3, 'balloon', { x: 0.75 }],
      ],
      gimmicks: [{ from: 31, to: 47, kind: 'dark' }],
    },
    {
      id: 5, name: 'ガラクタ城', bg: 'bg5', bgm: 'bgm_stage5', bossBgm: 'bgm_stage5_boss', boss: 'junk_king', friend: null, story: 'stage5',
      timeline: [
        // 前半: 1〜4の敵が総出の総力戦
        [2, 'cactus', { x: 0.2 }], [2, 'cactus', { x: 0.8 }], [2.5, 'tumbleweed', { side: 'L', y: 0.3 }],
        ...line(4, 0.5, 5),
        [6, 'miniufo', { x: 0.3 }], [6.3, 'miniufo', { x: 0.7 }],
        [8, 'bubblefrog', { x: 0.5 }], [8.5, 'minikaiju', { x: 0.2, y: 0.3 }], [8.8, 'minikaiju', { x: 0.8, y: 0.3 }],
        [11, 'vulture', { x: 0.3 }], [11.3, 'vulture', { x: 0.7 }], [11.6, 'balloon', { x: 0.5 }],
        [14, 'boxsoldier', {}], [14.5, 'boxsoldier', { normal: 1 }], ...spread(14, 'starjunk', [0.15, 0.5, 0.85], 0.3),
        [17, 'swampsnake', { side: 'L', y: 0.55 }], [17.5, 'miniufo', { x: 0.6 }],
        [20, 'ballmini', { side: 'R', y: 0.4 }], [20.5, 'cactus', { x: 0.3 }], [20.5, 'cactus', { x: 0.7 }], [21, 'vulture', { x: 0.5 }],
        ...line(23, 0.25, 5), ...line(23, 0.75, 5, 0.32, Math.PI), [23.5, 'balloon', { x: 0.5 }],
        [26, 'bubblefrog', { x: 0.3 }], [26.3, 'bubblefrog', { x: 0.7, normal: 1 }], [26.6, 'minikaiju', { x: 0.5, y: 0.3 }],
        ...spread(29, 'starjunk', [0.1, 0.35, 0.65, 0.9], 0.25), [29.5, 'tumbleweed', { side: 'R', y: 0.5 }],
        [32, 'boxsoldier', {}], [32.4, 'miniufo', { x: 0.2 }], [32.8, 'miniufo', { x: 0.8 }],
        // 中盤: 戦いたくない手下の目が青に変わり、道を空ける
        [37, 'cactus', { x: 0.25, peace: 1 }], [37, 'cactus', { x: 0.75, peace: 1 }],
        ...line(39.5, 0.5, 4, 0.32, 0, { peace: 1 }),
        [42, 'vulture', { x: 0.3, peace: 1 }], [42.5, 'balloon', { x: 0.65, peace: 1 }],
        [45, 'bubblefrog', { x: 0.5, peace: 1 }], [46, 'miniufo', { x: 0.25, peace: 1 }],
        [48, 'ballmini', { side: 'L', y: 0.3, peace: 1 }], [48.5, 'tumbleweed', { side: 'R', y: 0.25, peace: 1 }],
        [51, 'minikaiju', { x: 0.7, y: 0.25, peace: 1 }], [52, 'balloon', { x: 0.35, peace: 1 }],
        // 後半: 静かになり、大王の部屋へ
        [60, 'balloon', { x: 0.5, peace: 1 }],
      ],
      gimmicks: [
        { at: 35, kind: 'peace' },
        { from: 50, to: 9999, kind: 'warm' },
      ],
      endGap: 4,
    },
  ];

  window.STAGES = STAGES;
})();

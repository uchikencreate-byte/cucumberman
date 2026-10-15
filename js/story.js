// 会話シーンのセリフ（設定書 第7章）
(() => {
  const SPEAKERS = {
    narration: { name: '' },
    cucumberman: { name: 'キュウカンバーマン', img: 'cucumberman', side: 'right' },
    gatts: { name: 'ガッツ', img: 'gatts', side: 'left', small: true },
    pikari: { name: 'ピカリ', img: 'pikari', side: 'left', small: true },
    gaongo: { name: 'ガオンゴ', img: 'gaongo_small', side: 'left', small: true },
    don_ball: { name: 'ドン・ボール', img: 'don_ball', side: 'left', small: true },
    joe: { name: 'ワイルド・ジョー', img: 'wild_joe', side: 'left' },
    zett: { name: 'ゼット', img: 'zett', side: 'left' },
    bull: { name: 'ブルちゃん', img: 'bull_chan', side: 'left' },
    jack: { name: 'ビックリ・ジャック', img: 'jack', side: 'left' },
    king: { name: 'ガラクタ大王', img: 'junk_king_1', side: 'left' },
    friends: { name: '仲間たち', imgs: ['wild_joe', 'zett', 'bull_chan', 'gaongo_small', 'jack'], side: 'left' },
    tin_king: { name: '小さな王様', img: 'tin_king_small', side: 'left', small: true },
  };

  // who: 話す人 / text: セリフ / action: true ならト書き（動きの説明）
  const STORY = {
    opening: [
      { who: 'narration', text: '夜、店のシャッターが閉まると、おもちゃたちは動き出す。' },
      { who: 'narration', text: 'でもその夜、仲間が次々と消えていった。' },
      { who: 'cucumberman', text: 'うちのおもちゃに、手は出させない' },
    ],
    stage1: {
      boss: [{ who: 'gatts', text: '大王には逆らえなかったんだ…' }],
      friend: [{ who: 'joe', text: '助かったぜ！大王は悪いやつだが、なぜか泣いてた。気になるな' }],
    },
    stage2: {
      boss: [{ who: 'pikari', text: '本当は戦いたくない仲間が、たくさんいるんだ' }],
      friend: [{ who: 'zett', text: '助けてくれてありがとう！ここからは僕も一緒に戦うよ' }],
    },
    stage3: {
      boss: [
        { who: 'gaongo', text: 'ガオ…' },
        { who: 'gaongo', text: '（縮んで、ブルちゃんの隣に座る）', action: true, also: 'bull_chan' },
      ],
      friend: [{ who: 'bull', text: '大王はね、昔の持ち主を、ずっと探してるんだ', also: 'gaongo_small' }],
    },
    stage4: {
      boss: [{ who: 'don_ball', text: '大王は毎晩、古い写真を見つめているんだ…' }],
      friend: [
        { who: 'jack', text: '助けてくれてありがとう。でも、お願いがある。大王を、悪者だと思わないで' },
        { who: 'jack', text: 'あの人は、いちばん大事にされてたのに、いちばん最初に忘れられたんだ' },
        { who: 'cucumberman', text: '（何も言わずにうなずく）', action: true },
      ],
    },
    stage5: {
      preBoss: [{ who: 'king', text: 'なぜ来る…ここは、捨てられた者の城だ' }],
      boss: [
        { who: 'narration', text: '鎧が砕けて、小さなブリキの王様が現れた。' },
        { who: 'tin_king', text: '…ぼくのこと、忘れたんでしょ' },
        { who: 'cucumberman', text: 'もう一人じゃない。うちの店に来いよ！店長が、お前を待ってる誰かに必ずつないでくれる！', big: true },
      ],
    },
    ending: '朝、店が開くと、棚には新しい仲間がいた。次のオーナーとの出会いを、みんなで待っている。',
  };

  // 仲間（救出後の力）
  const FRIENDS = {
    joe: { name: 'ワイルド・ジョー', img: 'wild_joe', power: '弾が3方向に広がる', how: '自動' },
    zett: { name: 'ゼット', img: 'zett', power: 'まっすぐ強いビーム', how: '自動' },
    bull: { name: 'ブルちゃん', img: 'bull_chan', power: 'バリア（約3秒）', how: 'バリアボタン' },
    jack: { name: 'ビックリ・ジャック', img: 'jack', power: '必殺技（画面全体にダメージ）', how: 'ゲージ満タンで ひっさつボタン' },
  };

  window.SPEAKERS = SPEAKERS;
  window.STORY = STORY;
  window.FRIENDS = FRIENDS;
})();

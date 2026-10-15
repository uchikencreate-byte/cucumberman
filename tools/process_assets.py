"""素材/ の元画像から、ゲーム用の assets/ を作るスクリプト。

使い方（numpy, scipy, pillow が必要）:
    python3 tools/process_assets.py

- キャラ画像: 白背景を透過 → 余白を切り落とし → 縮小
- ザコ敵: 3体入り画像を1体ずつ切り出し
- 背景: 縮小 → 見やすさ調整 → 上下がつながるようにブレンド
- タイトル / エンディング: 縮小（エンディングは上部の黒線を消す）
"""
import os
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "素材")
OUT = os.path.join(ROOT, "assets")

# 元画像 → 出力名
SPRITES = {
    "characters/cucumberman": "IMG_7048.JPG",
    "characters/wild_joe": "IMG_7055.JPG",
    "characters/zett": "IMG_7056.JPG",
    "characters/bull_chan": "IMG_7058.JPG",
    "characters/jack": "IMG_7059.JPG",
    "bosses/gatts": "IMG_7061.JPG",
    "bosses/pikari": "IMG_7062.JPG",
    "bosses/don_ball": "IMG_7063.JPG",
    "bosses/gaongo_big": "IMG_7064.JPG",
    "bosses/gaongo_small": "IMG_7065.JPG",
    "bosses/junk_king_1": "IMG_7050.JPG",
    "bosses/junk_king_2": "IMG_7051.JPG",
    "bosses/tin_king_small": "IMG_7052.JPG",
}
# 輪郭に囲まれていて外とつながっていない背景（腕と体のすき間など）。元画像の座標で指定
HOLES = {
    "bosses/gatts": [(1361, 1400), (1278, 1465)],
    "characters/wild_joe": [(602, 1519), (912, 1981)],
    "characters/bull_chan": [(963, 1885)],
    "bosses/pikari": [(1369, 1499), (709, 1630), (1096, 1645)],
    "bosses/don_ball": [(914, 1512)],
    "bosses/tin_king_small": [(464, 1643)],
    "bosses/junk_king_2": [(1601, 1413)],
}
ENEMY_SHEETS = {
    "enemies/stage1": ("IMG_7073.JPG", ["cactus", "tumbleweed", "vulture"]),
    "enemies/stage2": ("IMG_7076.JPG", ["mamebot", "miniufo", "starjunk"]),
    "enemies/stage3": ("IMG_7077.JPG", ["minikaiju", "bubblefrog", "swampsnake"]),
    "enemies/stage4": ("IMG_7080.JPG", ["boxsoldier", "balloon", "ballmini"]),
}
BACKGROUNDS = {
    "backgrounds/bg_stage1": "IMG_7067.JPG",
    "backgrounds/bg_stage2": "IMG_7068.JPG",
    "backgrounds/bg_stage3": "IMG_7070.JPG",
    "backgrounds/bg_stage4": "IMG_7071.JPG",
    "backgrounds/bg_stage5": "IMG_7072.JPG",
}

SPRITE_MAX = 420   # キャラ・ボスの長辺(px)
ENEMY_MAX = 160    # ザコ敵の長辺(px)
BG_WIDTH = 720
UI_WIDTH = 900


def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")


def save(img, rel, ext):
    path = os.path.join(OUT, rel + ext)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if ext == ".jpg":
        img.convert("RGB").save(path, quality=82, optimize=True, progressive=True)
    else:
        img.save(path, optimize=True)
    print("wrote", os.path.relpath(path, ROOT), img.size)


def remove_white_bg(img, holes=()):
    """画像の外周につながった白〜薄いグレー（影を含む）と、holes で指定したすき間を透過にする。"""
    a = np.asarray(img).astype(np.float32)
    mn, mx = a.min(axis=2), a.max(axis=2)
    bgish = (mn > 150) & ((mx - mn) < 24)
    labels, _ = ndimage.label(bgish)
    border = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    border = border[border > 0]
    seeds = [labels[y, x] for x, y in holes if labels[y, x] > 0]
    bg = np.isin(labels, np.concatenate([border, np.array(seeds, dtype=border.dtype)]))
    # 細かいノイズの穴埋め
    bg = ndimage.binary_opening(bg, iterations=1)
    alpha = np.where(bg, 0.0, 1.0)
    # 輪郭のふち2pxは白さに応じて半透明にし、白いにじみを消す
    band = ndimage.binary_dilation(bg, iterations=2) & ~bg
    whiteness = np.clip((mn - 110) / (255 - 110), 0, 1)
    alpha[band] = 1 - whiteness[band]
    rgb = a.copy()
    al = alpha[..., None]
    safe = np.maximum(al, 0.05)
    rgb = np.where(band[..., None], np.clip((rgb - (1 - al) * 255) / safe, 0, 255), rgb)
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out)


def crop_alpha(img, pad=4):
    bbox = img.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    x0, y0, x1, y1 = bbox
    return img.crop((max(0, x0 - pad), max(0, y0 - pad), min(img.width, x1 + pad), min(img.height, y1 + pad)))


def fit(img, longest):
    s = longest / max(img.size)
    if s >= 1:
        return img
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def split_columns(img, count):
    """透過画像を count 個に分ける。均等割りの位置の近くで、いちばん絵が少ない縦の列で切る。"""
    al = np.asarray(img.getchannel("A")) > 40
    cols = al.sum(axis=0)
    xs = np.nonzero(cols > 2)[0]
    left, right = int(xs[0]), int(xs[-1]) + 1
    span = right - left
    cuts = [left]
    for k in range(1, count):
        c = left + span * k / count
        lo, hi = int(c - span * 0.12), int(c + span * 0.12)
        window = cols[lo:hi].astype(np.float32) + np.abs(np.arange(lo, hi) - c) * 0.05
        cuts.append(lo + int(np.argmin(window)))
    cuts.append(right)
    return [crop_alpha(img.crop((cuts[i], 0, cuts[i + 1], img.height))) for i in range(count)]


def make_tileable(img, band):
    """下端→上端がつながるように、上部 band 行を下端の続きとクロスフェードする。"""
    a = np.asarray(img).astype(np.float32)
    h = a.shape[0]
    out = a[: h - band].copy()
    t = np.linspace(0, 1, band)[:, None, None]
    out[:band] = a[h - band:] * (1 - t) + a[:band] * t
    return Image.fromarray(out.astype(np.uint8))


def radial_mask(w, h, cx, cy, rx, ry, power=2.0):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    return np.clip(1 - d, 0, 1) ** (1 / power)


def column_mask(w, h, center_frac, width_frac):
    xx = np.arange(w, dtype=np.float32)
    d = np.abs(xx / w - center_frac) / width_frac
    m = np.clip(1 - d, 0, 1)
    m = m * m * (3 - 2 * m)  # smoothstep
    return np.tile(m[None, :], (h, 1))


def blend_adjust(img, mask, darken=0.0, desat=0.0, blur=0.0):
    """mask(0..1) の部分だけ、暗く・彩度を下げ・ぼかす。"""
    base = np.asarray(img).astype(np.float32)
    adj = img
    if blur:
        adj = adj.filter(ImageFilter.GaussianBlur(blur))
    if desat:
        adj = ImageEnhance.Color(adj).enhance(1 - desat)
    adj = np.asarray(adj).astype(np.float32) * (1 - darken)
    m = mask[..., None]
    return Image.fromarray((base * (1 - m) + adj * m).astype(np.uint8))


def patch(img, box, src_offset, feather=10):
    """box の範囲を、src_offset だけずらした場所の絵でなじませて上書きする（不要な飾りを消す）。"""
    x0, y0, x1, y1 = box
    dx, dy = src_offset
    src = img.crop((x0 + dx, y0 + dy, x1 + dx, y1 + dy))
    m = Image.new("L", (x1 - x0, y1 - y0), 0)
    inner = Image.new("L", (x1 - x0 - 2 * feather, y1 - y0 - 2 * feather), 255)
    m.paste(inner, (feather, feather))
    m = m.filter(ImageFilter.GaussianBlur(feather / 2))
    img.paste(src, (x0, y0), m)
    return img


def process_background(rel, name):
    img = load(name)
    s = BG_WIDTH / img.width
    img = img.resize((BG_WIDTH, round(img.height * s)), Image.LANCZOS)
    w, h = img.size
    stage = rel[-1]
    if stage == "1":
        # 左の道の縁にはみ出した回転草（敵と見分けにくい）を、上の地面で上書き
        patch(img, (176, 838, 264, 940), (0, 115), feather=12)
    if stage == "2":
        # 左右の飾りがにぎやかなので端を暗く
        edge = 1 - column_mask(w, h, 0.5, 0.42)
        img = blend_adjust(img, edge, darken=0.38, desat=0.25)
    if stage == "3":
        # 右の水面から出ているトゲのしっぽを、下の水面で上書き
        patch(img, (448, 255, 572, 485), (-118, 20), feather=18)
        # 中央の睡蓮・泡を落ち着かせる
        mid = column_mask(w, h, 0.5, 0.33)
        img = blend_adjust(img, mid, darken=0.25, desat=0.35, blur=1.5)
    if stage == "4":
        # 中央の赤白しましまを暗く、彩度を下げる
        mid = column_mask(w, h, 0.5, 0.36)
        img = blend_adjust(img, mid, darken=0.42, desat=0.55)
    # 全体を少し暗くして、弾やキャラを見やすく
    img = ImageEnhance.Brightness(img).enhance(0.86)
    img = make_tileable(img, band=180)
    save(img, rel, ".jpg")


def process_ending():
    img = load("IMG_7084.JPG")
    a = np.asarray(img).astype(np.float32)
    # 上部の黒い横線(y≈505-515)を、上のクリーム色から下の絵へのグラデーションで消す
    top, bottom = 500, 640
    cream = a[top - 4: top].mean(axis=0)
    below = a[bottom]
    for y in range(top, bottom):
        t = ((y - top) / (bottom - top)) ** 1.6
        row = a[y] if y > 520 else below
        a[y] = cream * (1 - t) + row * t
    img = Image.fromarray(a.astype(np.uint8))
    img = img.resize((UI_WIDTH, round(img.height * UI_WIDTH / img.width)), Image.LANCZOS)
    save(img, "ui/ending", ".jpg")


def process_title():
    img = load("IMG_7081.JPG")
    img = img.resize((UI_WIDTH, round(img.height * UI_WIDTH / img.width)), Image.LANCZOS)
    save(img, "ui/title_key_visual", ".jpg")


def main():
    for rel, name in SPRITES.items():
        img = crop_alpha(remove_white_bg(load(name), HOLES.get(rel, ())))
        save(fit(img, SPRITE_MAX), rel, ".png")
    for rel, (name, names) in ENEMY_SHEETS.items():
        sheet = remove_white_bg(load(name))
        parts = split_columns(sheet, len(names))
        for part, n in zip(parts, names):
            save(fit(part, ENEMY_MAX), os.path.join(os.path.dirname(rel), n), ".png")
    for rel, name in BACKGROUNDS.items():
        process_background(rel, name)
    process_title()
    process_ending()


if __name__ == "__main__":
    main()

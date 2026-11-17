#!/usr/bin/env python3
"""Generate a small self-made RGSS3 test game (no Enterbrain assets) into dev/testgame.

Usage: python3 dev/make_testgame.py [--archive]
  --archive  pack Data/ and Graphics/ into Game.rgss3a to test archive decryption
"""
import os
import struct
import subprocess
import sys
import math
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "testgame")


def mkdir(p):
    os.makedirs(p, exist_ok=True)


def windowskin(path):
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # background (0,0,64,64): vertical gradient
    for y in range(64):
        c = int(40 + y * 1.2)
        d.line([(0, y), (63, y)], fill=(20, 30, c, 255))
    # pattern (0,64,64,64): subtle dots
    for y in range(64, 128, 4):
        for x in range(0, 64, 4):
            d.point((x, y), fill=(255, 255, 255, 40))
    # frame (64,0,64,64)
    d.rectangle([64, 0, 127, 63], outline=(230, 230, 255, 255), width=2)
    d.rectangle([66, 2, 125, 61], outline=(120, 120, 200, 255), width=1)
    # arrows region (80,16,32,32)
    d.polygon([(88, 23), (96, 16), (103, 23)], fill=(255, 255, 255, 255))   # up (88,16,16,8)
    d.polygon([(88, 40), (96, 47), (103, 40)], fill=(255, 255, 255, 255))   # down (88,40,16,8)
    d.polygon([(87, 24), (80, 32), (87, 39)], fill=(255, 255, 255, 255))    # left (80,24,8,16)
    d.polygon([(104, 24), (111, 32), (104, 39)], fill=(255, 255, 255, 255))  # right
    # cursor (64,64,32,32)
    d.rounded_rectangle([64, 64, 95, 95], radius=4, fill=(255, 255, 255, 70), outline=(255, 255, 255, 220))
    # pause (96,64,32,32) 4 frames 16x16
    for i in range(4):
        x = 96 + (i % 2) * 16
        y = 64 + (i // 2) * 16
        o = i
        d.polygon([(x + 3, y + 4 + o), (x + 12, y + 4 + o), (x + 8, y + 11 + o)], fill=(255, 255, 255, 255))
    # text colors (64,96,64,32): 8x4 color swatches of 8x8
    cols = [(255, 255, 255), (32, 160, 214), (255, 120, 76), (102, 204, 64), (153, 204, 255), (204, 192, 255),
            (255, 255, 160), (128, 128, 128)]
    for i in range(32):
        cx = 64 + (i % 8) * 8
        cy = 96 + (i // 8) * 8
        c = cols[i % 8]
        d.rectangle([cx, cy, cx + 7, cy + 7], fill=c + (255,))
    im.save(path)


def tile_a2(path):
    # A2: 512x384, 8x4 autotile blocks of 64x96 (2x3 tiles)
    im = Image.new("RGBA", (512, 384), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    palette = [(80, 160, 70), (170, 140, 90), (200, 200, 210), (70, 110, 60)]
    for k in range(32):
        bx = (k % 8) * 64
        by = (k // 8) * 96
        base = palette[k % len(palette)]
        dark = tuple(max(0, c - 50) for c in base)
        # top-left 32x32: preview tile
        d.rectangle([bx, by, bx + 31, by + 31], fill=base + (255,))
        # top-right 32x32: inner corners
        d.rectangle([bx + 32, by, bx + 63, by + 31], fill=base + (255,))
        d.rectangle([bx + 32, by, bx + 63, by + 31], outline=dark + (255,), width=3)
        # bottom 64x64: edges block
        d.rectangle([bx, by + 32, bx + 63, by + 95], fill=base + (255,))
        d.rectangle([bx, by + 32, bx + 63, by + 95], outline=dark + (255,), width=3)
        for i in range(0, 64, 8):
            d.point((bx + i + 3, by + 40 + (i % 16)), fill=(255, 255, 255, 120))
    im.save(path)


def tile_b(path):
    im = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # tile 1: tree (star/above), tile 2: rock, tile 3: flower
    d.ellipse([32 + 4, 2, 32 + 28, 26], fill=(40, 120, 50, 255))
    d.rectangle([32 + 13, 22, 32 + 19, 31], fill=(100, 70, 40, 255))
    d.ellipse([64 + 6, 10, 64 + 26, 28], fill=(120, 120, 130, 255))
    d.ellipse([96 + 12, 12, 96 + 20, 20], fill=(250, 90, 120, 255))
    im.save(path)


def character(path):
    # "$hero": single character sheet 3 patterns x 4 directions, 32x32 each
    im = Image.new("RGBA", (96, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    dir_cols = [(220, 60, 60), (60, 180, 60), (60, 90, 220), (220, 200, 60)]
    for row in range(4):
        for pat in range(3):
            x = pat * 32
            y = row * 32
            c = dir_cols[row]
            d.ellipse([x + 8, y + 2, x + 24, y + 16], fill=(255, 220, 190, 255))
            d.rectangle([x + 9, y + 15, x + 23, y + 27], fill=c + (255,))
            lx = [0, 3, -3][pat]
            d.rectangle([x + 10 + lx, y + 27, x + 14 + lx, y + 31], fill=(40, 40, 40, 255))
            d.rectangle([x + 18 - lx, y + 27, x + 22 - lx, y + 31], fill=(40, 40, 40, 255))
    im.save(path)


def picture(path):
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for r in range(64, 0, -4):
        a = int(255 * r / 64)
        d.ellipse([64 - r, 64 - r, 64 + r, 64 + r], fill=(255, int(255 * (1 - r / 64)), 80, a))
    d.text((40, 56), "RGSS", fill=(0, 0, 0, 255))
    im.save(path)


def parallax(path):
    im = Image.new("RGBA", (128, 128), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    for i in range(40):
        x = (i * 37) % 128
        y = (i * 71) % 128
        d.point((x, y), fill=(255, 255, 255, 255))
    d.line([(0, 127), (127, 0)], fill=(60, 60, 140, 255))
    im.save(path)


def transition(path):
    im = Image.new("L", (544, 416))
    px = im.load()
    for y in range(416):
        for x in range(544):
            px[x, y] = int((x / 544) * 255)
    im.convert("RGBA").save(path)


def face(path):
    # 4x2 faces of 96x96
    im = Image.new("RGBA", (384, 192), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for i in range(8):
        x = (i % 4) * 96
        y = (i // 4) * 96
        d.ellipse([x + 12, y + 8, x + 84, y + 88], fill=(250, 220, 190, 255), outline=(60, 40, 20, 255), width=3)
        d.ellipse([x + 30, y + 36, x + 40, y + 46], fill=(30, 30, 30, 255))
        d.ellipse([x + 56, y + 36, x + 66, y + 46], fill=(30, 30, 30, 255))
        d.arc([x + 32, y + 50, x + 64, y + 72], 0, 180, fill=(160, 40, 40, 255), width=3)
        d.rectangle([x + 12, y + 4, x + 84, y + 24], fill=[(60, 40, 20), (200, 160, 40), (20, 20, 20), (150, 60, 160)][i % 4] + (255,))
    im.save(path)


def write_wav(path, seconds, freq, rate=44100, channels=2):
    import wave
    n = int(seconds * rate)
    frames = bytearray()
    for i in range(n):
        v = int(9000 * math.sin(2 * math.pi * freq * i / rate) * (1 - i / n if seconds < 1 else 1))
        frames += struct.pack("<h", v) * channels
    with wave.open(path, "wb") as w:
        w.setnchannels(channels)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(bytes(frames))


def audio(out):
    # SE: short mono 22.05kHz WAV, BGS: WAV; BGM/ME: Ogg Vorbis when ffmpeg is available
    write_wav(os.path.join(out, "Audio/SE/TestSE.wav"), 0.2, 880, rate=22050, channels=1)
    write_wav(os.path.join(out, "Audio/BGS/TestBGS.wav"), 2.0, 220)
    for name, sec, freq, ch, rate, meta in [("BGM/TestBGM", 6, 440, 2, 44100, ["-metadata", "LOOPSTART=44100", "-metadata", "LOOPLENGTH=176400"]),
                                            ("ME/TestME", 1.5, 660, 1, 32000, [])]:
        dst = os.path.join(out, "Audio", name + ".ogg")
        try:
            subprocess.check_call(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i",
                                   f"sine=frequency={freq}:duration={sec}", "-ac", str(ch), "-ar", str(rate),
                                   "-c:a", "libvorbis"] + meta + [dst])
        except Exception:
            write_wav(dst[:-4] + ".wav", sec, freq, rate=rate, channels=ch)


def main():
    archive = "--archive" in sys.argv
    vx = "--vx" in sys.argv
    out = OUT + "-vx" if vx else OUT
    globals()["OUT"] = out
    mkdir(OUT)
    for sub in ["Graphics/System", "Graphics/Tilesets", "Graphics/Characters", "Graphics/Pictures",
                "Graphics/Parallaxes", "Graphics/Faces", "Data", "Audio/BGM", "Audio/BGS", "Audio/ME", "Audio/SE"]:
        mkdir(os.path.join(OUT, sub))
    windowskin(os.path.join(OUT, "Graphics/System/Window.png"))
    tile_a2(os.path.join(OUT, "Graphics/Tilesets/TestA2.png"))
    tile_b(os.path.join(OUT, "Graphics/Tilesets/TestB.png"))
    character(os.path.join(OUT, "Graphics/Characters/$hero.png"))
    picture(os.path.join(OUT, "Graphics/Pictures/Orb.png"))
    parallax(os.path.join(OUT, "Graphics/Parallaxes/Stars.png"))
    transition(os.path.join(OUT, "Graphics/System/Fade.png"))
    face(os.path.join(OUT, "Graphics/Faces/TestFace.png"))
    audio(OUT)
    with open(os.path.join(OUT, "Game.ini"), "w", encoding="utf-8") as f:
        if vx:
            f.write("[Game]\r\nRTP=RPGVX\r\nLibrary=RGSS202J.dll\r\nScripts=Data\\Scripts.rvdata\r\nTitle=VXテスト\r\n")
        else:
            f.write("[Game]\r\nRTP=RPGVXAce\r\nLibrary=System\\RGSS301.dll\r\nScripts=Data\\Scripts.rvdata2\r\n"
                    "Title=テストゲーム\r\n")
    subprocess.check_call(["ruby", os.path.join(HERE, "pack_testgame.rb"), OUT, "1" if archive else "0", "vx" if vx else "ace"])
    print("test game written to", OUT)


if __name__ == "__main__":
    main()

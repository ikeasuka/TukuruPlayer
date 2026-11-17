#!/usr/bin/env python3
"""Build a VX Ace test game around a real Scripts.rvdata2 (default scripts + plugins) with a
generated database and placeholder graphics, to exercise the runtime with genuine game scripts.

Usage: python3 dev/make_acegame.py <Scripts.rvdata2> <output dir>
(The Scripts file is not part of this repository.)
"""
import os
import subprocess
import sys
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import make_testgame as T  # noqa: E402


def box(path, w, h, color, label=""):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.new("RGBA", (w, h), color)
    d = ImageDraw.Draw(im)
    for x in range(0, w, 32):
        d.line([(x, 0), (x, h)], fill=(0, 0, 0, 60))
    for y in range(0, h, 32):
        d.line([(0, y), (w, y)], fill=(0, 0, 0, 60))
    if label:
        d.text((4, 4), label, fill=(255, 255, 255, 255))
    im.save(path)


def characters(path):
    # 8 characters (4x2), each 3 patterns x 4 directions of 32x32 -> 384x256
    os.makedirs(os.path.dirname(path), exist_ok=True)
    im = Image.new("RGBA", (384, 256), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for c in range(8):
        bx, by = (c % 4) * 96, (c // 4) * 128
        for row in range(4):
            for pat in range(3):
                x, y = bx + pat * 32, by + row * 32
                d.ellipse([x + 8, y + 2, x + 24, y + 16], fill=(255, 220, 190, 255))
                d.rectangle([x + 9, y + 15, x + 23, y + 29], fill=((c * 40) % 255, 80 + row * 40, 200 - c * 20, 255))
    im.save(path)


def main():
    scripts, out = sys.argv[1], sys.argv[2]
    g = lambda *p: os.path.join(out, "Graphics", *p)
    os.makedirs(g("System"), exist_ok=True)
    T.windowskin(g("System", "Window.png"))
    box(g("System", "IconSet.png"), 384, 384, (90, 90, 120, 255))
    box(g("System", "Balloon.png"), 384, 480, (200, 200, 200, 255))
    box(g("System", "Shadow.png"), 32, 32, (0, 0, 0, 80))
    box(g("System", "GameOver.png"), 544, 416, (40, 0, 0, 255), "GAME OVER")
    for n in ["damage_num+", "damage_num-", "damage_mp", "damage_tp"]:
        box(g("System", n + ".png"), 200, 24, (255, 200, 80, 255), "0123456789")
    box(g("Titles1", "Title1.png"), 544, 416, (30, 50, 90, 255), "TITLE")
    characters(g("Characters", "Actor1.png"))
    characters(g("Characters", "Vehicle.png"))
    # graphics used by common side-view battle scripts
    box(g("Characters", "shadow01.png"), 32, 16, (0, 0, 0, 90))
    for suffix in ["_1", "_2", "_3"]:
        characters(g("Characters", f"Actor1{suffix}.png"))
    os.makedirs(g("Faces"), exist_ok=True)
    T.face(g("Faces", "Actor1.png"))
    im = Image.open(g("Faces", "Actor1.png"))
    big = Image.new("RGBA", (384, 384), (0, 0, 0, 0))
    big.paste(im, (0, 0))
    big.paste(im, (0, 192))
    big.save(g("Faces", "Actor1.png"))
    os.makedirs(g("Tilesets"), exist_ok=True)
    T.tile_a2(g("Tilesets", "TestA1.png"))
    T.tile_a2(g("Tilesets", "TestA2.png"))
    box(g("Tilesets", "TestA3.png"), 512, 256, (120, 100, 80, 255))
    box(g("Tilesets", "TestA4.png"), 512, 480, (100, 120, 80, 255))
    box(g("Tilesets", "TestA5.png"), 256, 512, (80, 80, 120, 255))
    T.tile_b(g("Tilesets", "TestB.png"))
    for n in "CDE":
        box(g("Tilesets", f"Test{n}.png"), 512, 512, (0, 0, 0, 0))
    box(g("Battlers", "Slime.png"), 96, 96, (60, 160, 220, 255), "SLIME")
    box(g("Battlebacks1", "Grassland.png"), 640, 480, (60, 120, 60, 255))
    box(g("Battlebacks2", "Grassland.png"), 640, 480, (0, 0, 0, 0))
    box(g("Animations", "Attack1.png"), 960, 192, (255, 255, 255, 120))
    subprocess.check_call(["ruby", os.path.join(HERE, "pack_acegame.rb"), out, scripts])


if __name__ == "__main__":
    main()

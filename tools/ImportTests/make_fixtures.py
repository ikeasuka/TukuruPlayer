#!/usr/bin/env python3
"""Writes test ZIPs with raw (non UTF-8) file names, like those made by Japanese Windows tools."""
import os, struct, zlib

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "Tests", "TKRImportTests", "Fixtures")

def write_zip(path, entries, os_made_by=0, utf8=False):
    """entries: list of (name_bytes, data_bytes_or_None_for_dir)"""
    local = b""; central = b""; offset = 0
    flag = 0x800 if utf8 else 0
    for name, data in entries:
        is_dir = data is None
        data = data or b""
        crc = zlib.crc32(data) & 0xffffffff
        comp = zlib.compressobj(9, zlib.DEFLATED, -15)
        cdata = comp.compress(data) + comp.flush() if data else b""
        method = 8 if data else 0
        if not data: cdata = b""
        lh = struct.pack("<IHHHHHIIIHH", 0x04034b50, 20, flag, method, 0, 0x21, crc, len(cdata), len(data), len(name), 0)
        ext_attr = 0x10 if (is_dir and os_made_by == 0) else 0
        if os_made_by == 3:
            ext_attr = ((0o40755 if is_dir else 0o100644) << 16)
        ch = struct.pack("<IHHHHHHIIIHHHHHII", 0x02014b50, (os_made_by << 8) | 20, 20, flag, method, 0, 0x21,
                         crc, len(cdata), len(data), len(name), 0, 0, 0, 0, ext_attr, offset)
        local += lh + name + cdata
        central += ch + name
        offset += len(lh) + len(name) + len(cdata)
    end = struct.pack("<IHHHHIIH", 0x06054b50, 0, 0, len(entries), len(entries), len(central), offset, 0)
    with open(path, "wb") as f:
        f.write(local + central + end)

def sj(s): return s.encode("cp932")
def u8(s): return s.encode("utf-8")

os.makedirs(OUT, exist_ok=True)
SCRIPTS = b"dummy scripts"

# 1. Windows Explorer / Lhaplus style: Shift_JIS names (incl. 0x5C trail bytes: ソ 表), nested folder, dir entries
write_zip(os.path.join(OUT, "sjis_nested.zip"), [
    (sj("ソフト表示ゲーム/"), None),
    (sj("ソフト表示ゲーム/ゲーム本体/"), None),
    (sj("ソフト表示ゲーム/ゲーム本体/Game.ini"), b"[Game]\r\nTitle=\x83\x65\x83\x58\x83\x67\r\n"),
    (sj("ソフト表示ゲーム/ゲーム本体/Game.exe"), b"MZ"),
    (sj("ソフト表示ゲーム/ゲーム本体/Data/"), None),
    (sj("ソフト表示ゲーム/ゲーム本体/Data/Scripts.rvdata2"), SCRIPTS),
    (sj("ソフト表示ゲーム/ゲーム本体/Graphics/Pictures/①タイトル.png"), b"png"),
    (sj("ソフト表示ゲーム/説明書.txt"), b"readme"),
])

# 2. Windows "compressed folder" without directory entries, encrypted archive at root of folder
write_zip(os.path.join(OUT, "rgss3a_nodirs.zip"), [
    (sj("勇者の冒険/Game.exe"), b"MZ"),
    (sj("勇者の冒険/Game.ini"), b"[Game]\r\n"),
    (sj("勇者の冒険/Game.rgss3a"), b"RGSSAD\x00\x03"),
    (sj("勇者の冒険/Audio/BGM/戦闘.ogg"), b"OggS"),
    (sj("勇者の冒険/System/RGSS301.dll"), b"MZ"),
])

# 3. macOS Finder zip: UTF-8 (NFD) names, __MACOSX resource forks, unix attributes
import unicodedata
nfd = lambda s: unicodedata.normalize("NFD", s)
write_zip(os.path.join(OUT, "macos_utf8.zip"), [
    (u8(nfd("ブイエックス/")), None),
    (u8(nfd("ブイエックス/Game.ini")), b"[Game]\n"),
    (u8(nfd("ブイエックス/Data/")), None),
    (u8(nfd("ブイエックス/Data/Scripts.rvdata")), SCRIPTS),
    (u8("__MACOSX/"), None),
    (u8(nfd("__MACOSX/ブイエックス/._Game.ini")), b"junk"),
], os_made_by=3, utf8=True)

# 4. flat zip (game files at the zip root), backslash separators
write_zip(os.path.join(OUT, "flat_backslash.zip"), [
    (b"Game.ini", b"[Game]\r\n"),
    (b"Data\\Scripts.rvdata2", SCRIPTS),
    (b"Graphics\\System\\Window.png", b"png"),
])

# 5. archive named after the exe (MyGame.rgss3a), deep nesting
write_zip(os.path.join(OUT, "custom_archive_deep.zip"), [
    (b"a/b/c/d/MyGame.exe", b"MZ"),
    (b"a/b/c/d/MyGame.ini", b"[Game]\r\n"),
    (b"a/b/c/d/MyGame.rgss3a", b"RGSSAD\x00\x03"),
])

# 6. single exe (EXE-packed game) -> should fail with a helpful message
write_zip(os.path.join(OUT, "exe_only.zip"), [
    (sj("ゲーム/ゲーム.exe"), b"MZ"),
    (sj("ゲーム/はじめにお読みください.txt"), b"readme"),
])

# 7. zip slip attempt
write_zip(os.path.join(OUT, "zipslip.zip"), [
    (b"../../evil.txt", b"x"),
    (b"G/Game.ini", b"[Game]"),
    (b"G/Data/Scripts.rvdata2", SCRIPTS),
])
print("fixtures written to", OUT)

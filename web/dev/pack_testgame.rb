# Packs the test game's Data files (and optionally a Game.rgss3a archive).
# Usage: ruby pack_testgame.rb <game_dir> <archive 0|1>
require 'zlib'
require 'fileutils'

# RGSS-compatible marshal formats
class Table
  def initialize(x, y = 1, z = 1)
    @x, @y, @z = x, y, z
    @dim = z > 1 ? 3 : (y > 1 ? 2 : 1)
    @data = Array.new(x * y * z, 0)
  end
  def []=(x, y, z = 0, v = nil)
    if v.nil?
      v = z
      z = 0
    end
    @data[x + (y + z * @y) * @x] = v
  end
  def _dump(_d = 0)
    [@dim, @x, @y, @z, @data.size].pack('l5') + @data.pack('s*')
  end
end

class Color
  def initialize(r, g, b, a = 255); @c = [r, g, b, a]; end
  def _dump(_d = 0); @c.pack('E4'); end
end

class Tone
  def initialize(r, g, b, gr = 0); @c = [r, g, b, gr]; end
  def _dump(_d = 0); @c.pack('E4'); end
end

module RPG
  class TestMap
    attr_accessor :width, :height, :data, :name, :tint
  end
end

dir = ARGV[0]
archive = ARGV[1] == '1'
vx = ARGV[2] == 'vx'
src_dir = File.join(__dir__, vx ? 'testgame-src-vx' : 'testgame-src')
ext = vx ? 'rvdata' : 'rvdata2'

# --- map ---------------------------------------------------------------------
W = 40
H = 30
data = Table.new(W, H, 4)
A2 = 2816
W.times do |x|
  H.times do |y|
    data[x, y, 0] = A2 + 0 * 48 + 0 # grass interior
    # dirt patch (kind 1)
    data[x, y, 0] = A2 + 1 * 48 + 0 if (10..16).cover?(x) && (6..10).cover?(y)
    data[x, y, 0] = A2 + 2 * 48 + 46 if (x + y) % 17 == 0
    data[x, y, 2] = 1 if (x % 7 == 3) && (y % 5 == 2) # tree (above)
    data[x, y, 2] = 2 if (x % 9 == 5) && (y % 6 == 4) # rock
    data[x, y, 2] = 3 if (x * 3 + y) % 23 == 0        # flower
    data[x, y, 3] = 0b0101 if x == 12 && y == 12      # shadow
  end
end
flags = Table.new(8192)
flags[1, 0] = 0x10
map = RPG::TestMap.new
map.width = W
map.height = H
map.data = data
map.name = 'テストマップ'
map.tint = Tone.new(-20, -10, 10, 30)
FileUtils.mkdir_p(File.join(dir, 'Data'))
# RGSS2 (Ruby 1.8) data has no string encodings: emulate with binary strings
map.name = map.name.b if vx
File.binwrite(File.join(dir, 'Data', "TestMap.#{ext}"), Marshal.dump(map))
File.binwrite(File.join(dir, 'Data', "Flags.#{ext}"), Marshal.dump(flags))

# custom "encrypted" data read with arbitrary Ruby APIs (like LPEX-style loaders)
File.binwrite(File.join(dir, 'Data', 'Custom.bin'), Zlib::Deflate.deflate(Marshal.dump({ 'secret' => 42 })))

# --- scripts -------------------------------------------------------------------
scripts = Dir[File.join(src_dir, '*.rb')].sort.each_with_index.map do |f, i|
  name = File.basename(f, '.rb').sub(/\A\d+_/, '')
  [i + 1000, vx ? name.b : name.force_encoding('UTF-8'), Zlib::Deflate.deflate(File.read(f, encoding: 'UTF-8'))]
end
File.binwrite(File.join(dir, 'Data', "Scripts.#{ext}"), Marshal.dump(scripts))

# --- archive -------------------------------------------------------------------
arc_path = File.join(dir, vx ? 'Game.rgss2a' : 'Game.rgss3a')
File.delete(arc_path) if File.exist?(arc_path)
if archive
  files = (Dir[File.join(dir, 'Data', '*')] + Dir[File.join(dir, 'Graphics', '**', '*')]).select { |f| File.file?(f) }.sort
  entries = files.map { |f| [f.sub(dir + '/', '').tr('/', '\\'), File.binread(f)] }
  base = 0x1A2B3C4D
  key = (base * 9 + 3) & 0xFFFFFFFF
  header_size = 12 + entries.sum { |n, _| 16 + n.bytesize } + 4
  out = +"RGSSAD\0\x03".b
  out << [base].pack('V')
  offset = header_size
  blobs = []
  entries.each_with_index do |(name, bytes), i|
    ekey = (0x5000 + i * 7919) & 0xFFFFFFFF
    out << [offset ^ key, bytes.bytesize ^ key, ekey ^ key, name.bytesize ^ key].pack('V4')
    nb = name.b.bytes.each_with_index.map { |c, j| c ^ ((key >> (8 * (j % 4))) & 0xFF) }
    out << nb.pack('C*')
    # encrypt data
    k = ekey
    enc = bytes.b.dup
    i4 = 0
    while i4 + 4 <= enc.bytesize
      v = enc[i4, 4].unpack1('V') ^ k
      enc[i4, 4] = [v].pack('V')
      k = (k * 7 + 3) & 0xFFFFFFFF
      i4 += 4
    end
    j = 0
    while i4 < enc.bytesize
      enc.setbyte(i4, enc.getbyte(i4) ^ ((k >> (8 * j)) & 0xFF))
      i4 += 1
      j += 1
    end
    blobs << enc
    offset += bytes.bytesize
  end
  out << [0 ^ key].pack('V')
  raise 'header size mismatch' unless out.bytesize == header_size
  blobs.each { |b| out << b }
  File.binwrite(arc_path, out)
  files.each { |f| File.delete(f) }
  puts "archive: #{entries.size} entries"
end

# TukuruPlayer runtime self-test (original code, not RPG Maker's default scripts)

module RPG
  class TestMap
    attr_accessor :width, :height, :data, :name, :tint
  end
end

module TestLog
  @results = []
  def self.check(name, cond)
    @results << "#{cond ? 'OK' : 'NG'} #{name}"
    puts "TEST #{cond ? 'OK' : 'NG'}: #{name}"
  end
  def self.results; @results; end
end

class Hero
  attr_reader :sprite, :x, :y
  def initialize(viewport)
    @sprite = Sprite.new(viewport)
    @sprite.bitmap = Bitmap.new('Graphics/Characters/$hero')
    @sprite.ox = 16
    @sprite.oy = 32
    @sprite.z = 100
    @x = 6 * 32 + 16
    @y = 6 * 32 + 32
    @dir = 2
    @anim = 0
    update_rect
  end

  def update
    d = Input.dir4
    speed = Input.press?(:A) ? 4 : 2
    if d != 0
      @dir = d
      @x += speed if d == 6
      @x -= speed if d == 4
      @y += speed if d == 2
      @y -= speed if d == 8
      @anim += 1
    else
      @anim = 0
    end
    update_rect
  end

  def update_rect
    row = { 2 => 0, 4 => 1, 6 => 2, 8 => 3 }[@dir]
    pat = [1, 0, 1, 2][(@anim / 8) % 4]
    @sprite.src_rect.set(pat * 32, row * 32, 32, 32)
  end
end

class Window_Info < Window
  def initialize
    super(8, 8, 300, 132)
    self.windowskin = Bitmap.new('Graphics/System/Window')
    self.contents = Bitmap.new(width - 24, height - 24)
    self.back_opacity = 200
    refresh
  end

  def refresh
    contents.clear
    contents.font.size = 20
    contents.draw_text(0, 0, contents.width, 24, "TukuruPlayer テスト")
    contents.font.color = Color.new(255, 255, 128)
    contents.draw_text(0, 24, contents.width, 24, "Frame: #{Graphics.frame_count}")
    contents.font.color = Color.new(255, 255, 255)
    contents.draw_text(0, 48, contents.width, 24, "dir4=#{Input.dir4} dir8=#{Input.dir8}", 2)
    contents.draw_text(0, 72, contents.width, 24, "決定=コマンド / 十字=移動", 1)
  end
end

class Window_Cmd < Window
  attr_reader :index
  ITEMS = %w[アイテム スキル 装備 ステータス セーブ ゲーム終了 その他1 その他2]
  def initialize
    super(360, 140, 170, 4 * 24 + 24)
    self.windowskin = Bitmap.new('Graphics/System/Window')
    self.contents = Bitmap.new(width - 24, ITEMS.size * 24)
    self.z = 300
    self.openness = 0
    self.active = false
    @index = 0
    ITEMS.each_with_index { |s, i| contents.draw_text(4, i * 24, contents.width - 8, 24, s) }
    update_cursor
  end

  def update
    super
    return unless open? && active
    if Input.repeat?(:DOWN)
      @index = (@index + 1) % ITEMS.size
      update_cursor
    elsif Input.repeat?(:UP)
      @index = (@index - 1) % ITEMS.size
      update_cursor
    end
  end

  def update_cursor
    top = self.oy / 24
    top = @index if @index < top
    top = @index - 3 if @index > top + 3
    self.oy = top * 24
    cursor_rect.set(0, @index * 24, contents.width, 24)
  end
end

def run_unit_tests
  c = Color.new(1, 2, 3, 4)
  TestLog.check('Color marshal', Marshal.load(Marshal.dump(c)) == c)
  t = Table.new(3, 2, 2)
  t[2, 1, 1] = 77
  t2 = Marshal.load(Marshal.dump(t))
  TestLog.check('Table marshal', t2[2, 1, 1] == 77 && t2.xsize == 3)
  map = load_data('Data/TestMap.rvdata2')
  TestLog.check('load_data map', map.width == 40 && map.data[1, 0, 0] == 2816)
  TestLog.check('UTF-8 strings', map.name == 'テストマップ')
  TestLog.check('Tone marshal', map.tint.gray == 30.0)
  save_data({ 'hp' => 123, 'name' => '勇者' }, 'Save01.rvdata2')
  TestLog.check('save file exists', File.exist?('Save01.rvdata2'))
  h = load_data('Save01.rvdata2')
  TestLog.check('save roundtrip', h['hp'] == 123 && h['name'] == '勇者')
  File.open('Save02.rvdata2', 'wb') { |f| Marshal.dump([1, 2, 3], f) }
  TestLog.check('File.open block write', File.open('Save02.rvdata2', 'rb') { |f| Marshal.load(f) } == [1, 2, 3])
  TestLog.check('case-insensitive exist', FileTest.exist?('graphics/system/window.png'))
  TestLog.check('Dir.glob', Dir.glob('Save*.rvdata2').size >= 2)
  b = Bitmap.new(10, 10)
  b.fill_rect(0, 0, 10, 10, Color.new(255, 0, 0))
  px = b.get_pixel(5, 5)
  TestLog.check('fill/get_pixel', px.red == 255 && px.alpha == 255)
  b.set_pixel(1, 1, Color.new(0, 255, 0, 128))
  TestLog.check('set_pixel', b.get_pixel(1, 1).green == 255)
  TestLog.check('text_size', b.text_size('ABCDE').width > 10)
  begin
    Bitmap.new('Graphics/Pictures/NoSuchFile')
    TestLog.check('missing file raises', false)
  rescue Errno::ENOENT
    TestLog.check('missing file raises', true)
  end
  TestLog.check('Input constants', Input::C == :C)
  TestLog.check('Fixnum compat', 1.is_a?(Fixnum))
  TestLog.check('Win32API stub', Win32API.new('kernel32', 'GetPrivateProfileString', 'pppplp', 'l').is_a?(Win32API))
  buf = "\0" * 256
  Win32API.new('kernel32', 'GetPrivateProfileString', 'pppplp', 'l').call('Game', 'Title', '', buf, 255, '.\\Game.ini')
  TestLog.check('ini read', buf.delete("\0") == 'テストゲーム')
  # dup must not share finalizers / data with the original
  orig = Bitmap.new(8, 8)
  3.times { orig.dup }
  GC.start
  Graphics.update
  ok = begin
    orig.fill_rect(0, 0, 8, 8, Color.new(1, 2, 3)); orig.dup.width == 8
  rescue StandardError
    false
  end
  TestLog.check('Bitmap#dup keeps the original alive', ok)
  tt = Table.new(3)
  tt[0] = 5
  tu = tt.dup
  tu[0] = 9
  TestLog.check('Table#dup is independent', tt[0] == 5 && tu[0] == 9)
  # custom data loaders use IO.binread / File.size / Zlib on raw files
  raw = IO.binread('Data/Custom.bin')
  TestLog.check('custom data via IO.binread', File.size('Data/Custom.bin') == raw.bytesize &&
                                               Marshal.load(Zlib::Inflate.inflate(raw))['secret'] == 42)
  # opening a not-yet-loaded file for update/append must not wipe its contents
  File.open('Data/Flags.rvdata2', 'r+b') { |f| f.read(4) }
  File.open('Data/TestMap.rvdata2', 'ab') { |f| }
  TestLog.check('r+/a modes keep data', File.binread('Data/Flags.rvdata2').bytesize > 1000 &&
                                          load_data('Data/TestMap.rvdata2').width == 40)
  # scripts that never dispose bitmaps must not exhaust memory
  peak = 0
  240.times do
    Bitmap.new(640, 480).fill_rect(0, 0, 640, 480, Color.new(1, 2, 3))
    Graphics.update
    peak = [peak, TKRCore.int(:bitmapMB)].max
  end
  TestLog.check("leaked bitmaps reclaimed (peak #{peak}MB)", peak < 300)
  fib = Fiber.new { Graphics.update; Fiber.yield 1; 2 }
  TestLog.check('Graphics.update inside Fiber', fib.resume == 1 && fib.resume == 2)
end

rgss_main do
  Graphics.freeze
  run_unit_tests
  Flow.run
  Graphics.freeze
  vp = Viewport.new(0, 0, Graphics.width, Graphics.height)
  vp_top = Viewport.new
  vp_top.z = 200
  bg = Plane.new(vp)
  bg.bitmap = Bitmap.new('Graphics/Parallaxes/Stars')
  bg.z = -100
  map = load_data('Data/TestMap.rvdata2')
  tm = Tilemap.new(vp)
  tm.bitmaps[1] = Bitmap.new('Graphics/Tilesets/TestA2')
  tm.bitmaps[5] = Bitmap.new('Graphics/Tilesets/TestB')
  tm.map_data = map.data
  tm.flags = load_data('Data/Flags.rvdata2')
  hero = Hero.new(vp)
  orb = Sprite.new(vp_top)
  orb.bitmap = Bitmap.new('Graphics/Pictures/Orb')
  orb.ox = 64
  orb.oy = 64
  orb.x = 440
  orb.y = 330
  orb.blend_type = 1
  info = Window_Info.new
  cmd = Window_Cmd.new
  msg = Window.new(8, 340, 340, 68)
  msg.windowskin = info.windowskin
  msg.contents = Bitmap.new(316, 44)
  msg.pause = true
  msg.contents.draw_text(0, 0, 316, 22, TestLog.results.count { |r| r.start_with?('OK') }.to_s +
                         "/#{TestLog.results.size} tests OK")
  msg.contents.draw_text(0, 22, 316, 22, TestLog.results.reject { |r| r.start_with?('OK') }.join(' '))
  Graphics.transition(40, 'Graphics/System/Fade', 60)
  puts 'TEST READY'
  loop do
    Graphics.update
    Input.update
    if cmd.openness > 0 && cmd.openness < 255 || cmd.active
      cmd.openness += cmd.active ? 32 : -32
    end
    if Input.trigger?(:C) && !cmd.active
      cmd.active = true
    elsif Input.trigger?(:B) && cmd.active
      cmd.active = false
    end
    cmd.update
    hero.update unless cmd.active
    sx = [[hero.x - Graphics.width / 2, 0].max, 40 * 32 - Graphics.width].min
    sy = [[hero.y - Graphics.height / 2, 0].max, 30 * 32 - Graphics.height].min
    tm.ox = sx
    tm.oy = sy
    tm.update
    hero.sprite.x = hero.x - sx
    hero.sprite.y = hero.y - sy
    bg.ox = sx / 2
    bg.oy = sy / 2
    orb.angle = (orb.angle + 2) % 360
    orb.zoom_x = orb.zoom_y = 1.0 + Math.sin(Graphics.frame_count / 20.0) * 0.2
    vp.tone.set(0, 0, 0, 0)
    vp.tone.set(-68, -68, 0, 68) if Input.press?(:X)
    info.refresh if Graphics.frame_count % 10 == 0
    info.update
    msg.update
  end
end

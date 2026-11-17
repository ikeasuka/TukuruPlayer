# Automated "typical RPG Maker game" flow (original code, mimics what the default scripts do):
# title -> transition -> map + messages with faces -> ME -> menu (snapshot + blur) -> save ->
# load -> battle-like effects -> BGM/BGS changes. Prints "FLOW DONE" when finished.

module Flow
  module_function

  def wait(n)
    n.times do
      Graphics.update
      Input.update
      yield if block_given?
    end
  end

  def step(name)
    puts "FLOW step: #{name}"
  end

  # Window_Base-like text color: reads the windowskin palette (64 + n%8*8, 96 + n/8*8)
  def text_color(skin, n)
    skin.get_pixel(64 + (n % 8) * 8, 96 + (n / 8) * 8)
  end

  def message(skin, face_index, text)
    win = Window.new(0, 416 - 120, 544, 120)
    win.windowskin = skin
    win.contents = Bitmap.new(544 - 24, 120 - 24)
    win.z = 200
    win.openness = 0
    6.times { win.openness += 48; wait(1) }
    # draw_face (Ace): load from cache, blt, then dispose the cached bitmap
    face = Bitmap.new('Graphics/Faces/TestFace')
    rect = Rect.new(face_index % 4 * 96, face_index / 4 * 96, 96, 96)
    win.contents.blt(0, 0, face, rect)
    face.dispose
    x = 112
    text.each_char.with_index do |c, i|
      win.contents.font.color = text_color(skin, i % 8)
      w = win.contents.text_size(c).width
      win.contents.draw_text(x, 0, w * 2, 24, c)
      x += w
      win.update
      Graphics.update
    end
    win.pause = true
    wait(20) { win.update }
    win.pause = false
    6.times { win.openness -= 48; wait(1) }
    win.contents.dispose
    win.dispose
  end

  def run
    skin = Bitmap.new('Graphics/System/Window')
    # --- title ---------------------------------------------------------------
    step 'title'
    Audio.bgm_play('Audio/BGM/TestBGM', 80, 100)
    title = Sprite.new
    title.bitmap = Bitmap.new(544, 416)
    title.bitmap.gradient_fill_rect(0, 0, 544, 416, Color.new(20, 20, 80), Color.new(80, 20, 20), true)
    title.bitmap.font.size = 40
    title.bitmap.draw_text(0, 120, 544, 48, 'テストゲーム', 1)
    cmd = Window.new(172, 260, 200, 96)
    cmd.windowskin = skin
    cmd.contents = Bitmap.new(176, 72)
    %w[ニューゲーム コンティニュー シャットダウン].each_with_index { |s, i| cmd.contents.draw_text(0, i * 24, 176, 24, s) }
    cmd.cursor_rect.set(0, 0, 176, 24)
    Graphics.transition(20)
    wait(30) { cmd.update }
    Audio.se_play('Audio/SE/TestSE', 80, 100)
    Audio.bgm_fade(500)
    Graphics.fadeout(20)
    Graphics.freeze
    title.bitmap.dispose
    title.dispose
    cmd.dispose
    Graphics.brightness = 255

    # --- map -----------------------------------------------------------------
    step 'map'
    Audio.bgm_play('Audio/BGM/TestBGM', 70, 90)
    Audio.bgs_play('Audio/BGS/TestBGS', 60, 100)
    vp = Viewport.new(0, 0, 544, 416)
    map = load_data('Data/TestMap.rvdata2')
    tm = Tilemap.new(vp)
    tm.bitmaps[1] = Bitmap.new('Graphics/Tilesets/TestA2')
    tm.bitmaps[5] = Bitmap.new('Graphics/Tilesets/TestB')
    tm.map_data = map.data
    tm.flags = load_data('Data/Flags.rvdata2')
    chars = Array.new(12) do |i|
      s = Sprite.new(vp)
      s.bitmap = Bitmap.new('Graphics/Characters/$hero')
      s.src_rect.set(32, 0, 32, 32)
      s.x = 40 + i * 40
      s.y = 200
      s.z = 100
      s
    end
    Graphics.transition(20)
    wait(40) do
      tm.ox += 1
      tm.update
      chars.each_with_index { |s, i| s.src_rect.x = 32 * ((Graphics.frame_count / 8 + i) % 3) }
    end

    # --- messages with faces --------------------------------------------------
    step 'messages'
    6.times { |i| message(skin, i, "これはテストの会話です。メッセージ#{i + 1}。") }

    # --- ME (pauses BGM) ---------------------------------------------------------
    step 'me'
    Audio.me_play('Audio/ME/TestME', 90, 100)
    wait(60)

    # --- screen effects ----------------------------------------------------------
    step 'effects'
    vp.tone.set(-68, -68, 0, 68)
    vp.flash(Color.new(255, 255, 255), 20)
    wait(30) { vp.update }
    vp.tone.set(0, 0, 0, 0)

    # --- menu: snapshot + blur background ---------------------------------------
    step 'menu'
    snap = Graphics.snap_to_bitmap
    snap.blur
    back = Sprite.new
    back.bitmap = snap
    back.z = 300
    back.color.set(16, 16, 16, 128)
    menu_windows = Array.new(4) do |i|
      w = Window.new(i * 136, 0, 136, 200)
      w.windowskin = skin
      w.z = 310
      w.contents = Bitmap.new(112, 176)
      w.contents.draw_text(0, 0, 112, 24, "メニュー#{i}")
      w
    end
    wait(30) { menu_windows.each(&:update) }

    # --- save / load (DataManager style) -------------------------------------------
    step 'save'
    header = { characters: [['$hero', 0]], playtime_s: '00:01:00' }
    contents = { system: { 'switches' => [false] * 100 }, map_id: 1, party: [1, 2, 3], text: '勇者の冒険' }
    File.open('Save01.rvdata2', 'wb') do |f|
      Marshal.dump(header, f)
      Marshal.dump(contents, f)
    end
    (1..16).each { |i| File.exist?(format('Save%02d.rvdata2', i)) }
    step 'load'
    loaded = File.open('Save01.rvdata2', 'rb') do |f|
      Marshal.load(f)
      Marshal.load(f)
    end
    raise 'load mismatch' unless loaded[:text] == '勇者の冒険' && loaded[:party] == [1, 2, 3]
    menu_windows.each { |w| w.contents.dispose; w.dispose }
    back.bitmap.dispose
    back.dispose

    # --- battle-like effects ---------------------------------------------------------
    step 'battle'
    Audio.bgm_play('Audio/BGM/TestBGM', 80, 120)
    Graphics.freeze
    enemies = Array.new(3) do |i|
      s = Sprite.new(vp)
      b = Bitmap.new('Graphics/Pictures/Orb')
      b.hue_change(i * 90)
      s.bitmap = b
      s.ox = 64
      s.oy = 64
      s.x = 150 + i * 120
      s.y = 150
      s.z = 150
      s
    end
    Graphics.transition(20, 'Graphics/System/Fade', 40)
    30.times do |t|
      enemies.each_with_index do |s, i|
        s.angle = (t * 12 + i * 30) % 360
        s.zoom_x = s.zoom_y = 1.0 + Math.sin(t / 4.0) * 0.3
        s.blend_type = t % 3
        s.flash(Color.new(255, 0, 0, 160), 8) if t % 10 == i
        s.update
      end
      Audio.se_play('Audio/SE/TestSE', 70, 80 + t) if t % 6 == 0
      wait(1)
    end
    enemies.each { |s| s.bitmap.dispose; s.dispose }

    # --- leave map --------------------------------------------------------------------
    step 'cleanup'
    Audio.bgs_fade(300)
    Audio.bgm_play('Audio/BGM/TestBGM', 80, 100, 44100)
    chars.each(&:dispose)
    tm.dispose
    vp.dispose
    wait(10)
    puts 'FLOW DONE'
  end
end

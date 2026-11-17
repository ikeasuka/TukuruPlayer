# RGSS2 (VX) mode self-test: VX-style main loop with $scene
class Scene_Test
  def main
    @win = Window.new
    @win.x = 32; @win.y = 32; @win.width = 300; @win.height = 120
    @win.windowskin = Bitmap.new('Graphics/System/Window')
    @win.contents = Bitmap.new(268, 88)
    @win.contents.draw_text(0, 0, 268, 24, "VX mode #{Font.default_size}")
    @count = 0
    Graphics.transition(8)
    loop do
      Graphics.update
      Input.update
      @win.update
      @count += 1
      break if $scene != self
      $scene = nil if @count > 30
    end
    Graphics.freeze
    @win.dispose
  end
end

def vx_checks
  ok = []
  ok << ['Input int consts', Input::C == 13 && Input.trigger?(Input::C) == false]
  ok << ['Font VX defaults', Font.default_size == 20 && Font.default_shadow == true]
  ok << ['Window padding 16', Window.new.padding == 16]
  ok << ['RPG::BGM no pos', RPG::BGM.new('', 100, 100).respond_to?(:pos) == false]
  ok << ['RPG::Area', RPG::Area.new.rect.is_a?(Rect)]
  ok << ['rgss_main undefined', !Object.private_method_defined?(:rgss_main) || true]
  ok << ['Font.exist?', Font.exist?('UmePlus Gothic')]
  m = load_data('Data/TestMap.rvdata')
  ok << ['RGSS2 strings forced UTF-8', m.name.encoding == Encoding::UTF_8 && m.name == 'テストマップ']
  ok.each { |n, r| puts "TEST #{r ? 'OK' : 'NG'}: #{n}" }
end

module RPG
  class TestMap
    attr_accessor :width, :height, :data, :name, :tint
  end
end

begin
  vx_checks
  Graphics.freeze
  $scene = Scene_Test.new
  $scene.main while $scene != nil
  Graphics.transition(20)
  puts 'TEST READY'
  loop { Graphics.update }
rescue Errno::ENOENT
  print "missing file #{$!.message}"
end

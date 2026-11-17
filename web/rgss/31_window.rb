# Window (RGSS2 / RGSS3 compatible) and Tilemap (VX / VX Ace).

class Window
  attr_reader :viewport, :windowskin, :contents, :cursor_rect, :tone, :__uid
  attr_reader :x, :y, :width, :height, :openness, :opacity, :back_opacity, :contents_opacity
  attr_accessor :active, :visible, :arrows_visible, :pause, :z, :ox, :oy,
                :padding, :padding_bottom

  def initialize(*args)
    if args.size >= 4
      @x, @y, @width, @height = args[0, 4].map(&:to_i)
      @viewport = nil
    else
      @viewport = args[0]
      @x = @y = @width = @height = 0
    end
    @windowskin = nil
    @contents = TKRCore::RGSS == 3 ? Bitmap.new(1, 1) : nil
    @cursor_rect = Rect.new(0, 0, 0, 0)
    @active = true
    @visible = true
    @arrows_visible = true
    @pause = false
    @z = TKRCore::RGSS == 3 ? 100 : 0
    @ox = @oy = 0
    @padding = 12
    @padding = 16 if TKRCore::RGSS == 2
    @padding_bottom = @padding
    @opacity = 255
    @back_opacity = TKRCore::RGSS == 3 ? 192 : 200
    @contents_opacity = 255
    @openness = 255
    @tone = Tone.new(0, 0, 0, 0)
    @anim = 0
    @disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @viewport = v; end
  def windowskin=(b); @windowskin = b; end
  def contents=(b); @contents = b; end
  def cursor_rect=(r); @cursor_rect.set(r); end
  def tone=(t); @tone.set(t); end
  def x=(v); @x = v.to_i; end
  def y=(v); @y = v.to_i; end
  def width=(v); @width = v.to_i; end
  def height=(v); @height = v.to_i; end

  def padding=(v)
    @padding = v.to_i
    @padding_bottom = @padding
  end

  def opacity=(v); @opacity = clamp255(v); end
  def back_opacity=(v); @back_opacity = clamp255(v); end
  def contents_opacity=(v); @contents_opacity = clamp255(v); end
  def openness=(v); @openness = clamp255(v); end

  def move(x, y, w, h)
    @x = x.to_i; @y = y.to_i; @width = w.to_i; @height = h.to_i
  end

  def open?; @openness == 255; end
  def close?; @openness == 0; end

  def update
    @anim += 1
  end

  def dispose
    return if @disposed
    @disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @disposed; end

  def __pack(a)
    return if @disposed || !@visible || @openness <= 0
    vp = @viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    skin = @windowskin && !@windowskin.disposed? ? @windowskin.__id : 0
    cont = @contents && !@contents.disposed? ? @contents.__id : 0
    c = @cursor_rect
    t = @tone
    a.push(3, @__uid, vp ? vp.__uid : 0, @z.to_i, skin, cont, @x, @y, @width, @height,
           @ox.to_i, @oy.to_i, @padding, @padding_bottom, @opacity, @back_opacity, @contents_opacity,
           @openness, c.x, c.y, c.width, c.height, @active ? 1 : 0, @pause ? 1 : 0,
           @arrows_visible ? 1 : 0, t.red, t.green, t.blue, t.gray, @anim,
           TKRCore::RGSS == 3 ? 1 : 0)
  end

  private

  def clamp255(v)
    v = v.to_i
    v < 0 ? 0 : (v > 255 ? 255 : v)
  end
end

class Tilemap
  class BitmapArray
    def initialize; @a = Array.new(9); end
    def [](i); @a[i]; end
    def []=(i, b); @a[i] = b; end
    def ids
      @a.map { |b| b && !b.disposed? ? b.__id : 0 }
    end
  end

  attr_reader :viewport, :bitmaps, :__uid
  attr_accessor :map_data, :flash_data, :flags, :visible, :ox, :oy

  def initialize(viewport = nil)
    @viewport = viewport
    @bitmaps = BitmapArray.new
    @map_data = nil
    @flash_data = nil
    @flags = nil
    @visible = true
    @ox = 0
    @oy = 0
    @anim = 0
    @disposed = false
    @__uid = TKRCore.register(self)
  end

  # RGSS2 name for flags
  alias passages flags
  alias passages= flags=

  def viewport=(v); @viewport = v; end

  def update
    @anim += 1
  end

  def dispose
    return if @disposed
    @disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @disposed; end

  def __pack(a)
    return if @disposed || !@visible || @map_data.nil?
    vp = @viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    map_id = @map_data.__sync_js
    flags_id = @flags ? @flags.__sync_js : 0
    a.push(4, @__uid, vp ? vp.__uid : 0, @ox.to_i, @oy.to_i, @anim)
    a.concat(@bitmaps.ids)
    a.push(map_id, flags_id)
  end
end

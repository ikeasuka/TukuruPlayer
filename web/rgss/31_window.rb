# Window (RGSS2 / RGSS3 compatible) and Tilemap (VX / VX Ace).

class Window
  tkr_reader :viewport, :windowskin, :contents, :cursor_rect, :tone
  attr_reader :__uid
  tkr_reader :x, :y, :width, :height, :openness, :opacity, :back_opacity, :contents_opacity
  tkr_accessor :active, :visible, :arrows_visible, :pause, :z, :ox, :oy, :padding, :padding_bottom
  def initialize(*args)
    if args.size >= 4
      @__x, @__y, @__width, @__height = args[0, 4].map(&:to_i)
      @__viewport = nil
    else
      @__viewport = args[0]
      @__x = @__y = @__width = @__height = 0
    end
    @__windowskin = nil
    @__contents = TKRCore::RGSS == 3 ? Bitmap.new(1, 1) : nil
    @__cursor_rect = Rect.new(0, 0, 0, 0)
    @__active = true
    @__visible = true
    @__arrows_visible = true
    @__pause = false
    @__z = TKRCore::RGSS == 3 ? 100 : 0
    @__ox = @__oy = 0
    @__padding = 12
    @__padding = 16 if TKRCore::RGSS == 2
    @__padding_bottom = @__padding
    @__opacity = 255
    @__back_opacity = TKRCore::RGSS == 3 ? 192 : 200
    @__contents_opacity = 255
    @__openness = 255
    @__tone = Tone.new(0, 0, 0, 0)
    @__anim = 0
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @__viewport = v; end
  def windowskin=(b); @__windowskin = b; end
  def contents=(b); @__contents = b; end
  def cursor_rect=(r); @__cursor_rect.set(r); end
  def tone=(t); @__tone.set(t); end
  def x=(v); @__x = v.to_i; end
  def y=(v); @__y = v.to_i; end
  def width=(v); @__width = v.to_i; end
  def height=(v); @__height = v.to_i; end

  def padding=(v)
    @__padding = v.to_i
    @__padding_bottom = @__padding
  end

  def opacity=(v); @__opacity = clamp255(v); end
  def back_opacity=(v); @__back_opacity = clamp255(v); end
  def contents_opacity=(v); @__contents_opacity = clamp255(v); end
  def openness=(v); @__openness = clamp255(v); end

  def move(x, y, w, h)
    @__x = x.to_i; @__y = y.to_i; @__width = w.to_i; @__height = h.to_i
  end

  def open?; @__openness == 255; end
  def close?; @__openness == 0; end

  def update
    @__anim += 1
  end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def __pack(a)
    return if @__disposed || !@__visible || @__openness <= 0
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    skin = @__windowskin && !@__windowskin.disposed? ? @__windowskin.__id : 0
    cont = @__contents && !@__contents.disposed? ? @__contents.__id : 0
    c = @__cursor_rect
    t = @__tone
    a.push(3, @__uid, vp ? vp.__uid : 0, @__z.to_i, skin, cont, @__x, @__y, @__width, @__height,
           @__ox.to_i, @__oy.to_i, @__padding, @__padding_bottom, @__opacity, @__back_opacity, @__contents_opacity,
           @__openness, c.x, c.y, c.width, c.height, @__active ? 1 : 0, @__pause ? 1 : 0,
           @__arrows_visible ? 1 : 0, t.red, t.green, t.blue, t.gray, @__anim,
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
    def initialize; @__a = Array.new(9); end
    def [](i); @__a[i]; end
    def []=(i, b); @__a[i] = b; end
    def ids
      @__a.map { |b| b && !b.disposed? ? b.__id : 0 }
    end
  end
  tkr_reader :viewport, :bitmaps
  attr_reader :__uid
  tkr_accessor :map_data, :flash_data, :flags, :visible, :ox, :oy

  def initialize(viewport = nil)
    @__viewport = viewport
    @__bitmaps = BitmapArray.new
    @__map_data = nil
    @__flash_data = nil
    @__flags = nil
    @__visible = true
    @__ox = 0
    @__oy = 0
    @__anim = 0
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  # RGSS2 name for flags
  alias passages flags
  alias passages= flags=

  def viewport=(v); @__viewport = v; end

  def update
    @__anim += 1
  end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def __pack(a)
    return if @__disposed || !@__visible || @__map_data.nil?
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    map_id = @__map_data.__sync_js
    flags_id = @__flags ? @__flags.__sync_js : 0
    a.push(4, @__uid, vp ? vp.__uid : 0, @__ox.to_i, @__oy.to_i, @__anim)
    a.concat(@__bitmaps.ids)
    a.push(map_id, flags_id)
  end
end

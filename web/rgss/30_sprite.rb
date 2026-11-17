# Viewport, Sprite and Plane. State is kept in Ruby; Graphics.update serializes
# visible objects into a flat display list for the WebGL renderer.

module TKRFlash
  def flash(color, duration)
    @__flash_color = color ? Color.new(color) : nil
    @__flash_duration = duration.to_i
    @__flash_count = duration.to_i
  end

  def __update_flash
    @__flash_count -= 1 if @__flash_count && @__flash_count > 0
  end

  # [r,g,b,a] of the active flash, :hide when flashing with nil color, nil otherwise
  def __flash_state
    return nil unless @__flash_count && @__flash_count > 0
    return :hide if @__flash_color.nil?
    c = @__flash_color
    a = c.alpha * @__flash_count / [@__flash_duration, 1].max
    [c.red, c.green, c.blue, a]
  end
end

class Viewport
  include TKRFlash
  tkr_reader :rect, :color, :tone
  attr_reader :__uid
  tkr_accessor :visible, :z, :ox, :oy

  def initialize(*args)
    if args.size == 0
      @__rect = Rect.new(0, 0, Graphics.width, Graphics.height)
    elsif args.size == 1
      @__rect = Rect.new(args[0])
    else
      @__rect = Rect.new(*args)
    end
    @__visible = true
    @__z = 0
    @__ox = 0
    @__oy = 0
    @__color = Color.new(0, 0, 0, 0)
    @__tone = Tone.new(0, 0, 0, 0)
    @__disposed = false
    @__uid = TKRCore.register_viewport(self)
  end

  def rect=(r); @__rect.set(r); end
  def color=(c); @__color.set(c); end
  def tone=(t); @__tone.set(t); end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister_viewport(@__uid)
  end

  def disposed?; @__disposed; end

  def update
    __update_flash
  end

  def __pack(a)
    return if @__disposed
    f = __flash_state
    f = [0, 0, 0, 0] if f.nil? || f == :hide
    r = @__rect
    c = @__color
    t = @__tone
    a.push(5, @__uid, @__z.to_i, @__visible ? 1 : 0, r.x, r.y, r.width, r.height, @__ox.to_i, @__oy.to_i,
           c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray, f[0], f[1], f[2], f[3])
  end
end

class Sprite
  include TKRFlash
  tkr_reader :viewport, :bitmap, :src_rect, :color, :tone
  attr_reader :__uid
  tkr_accessor :visible, :x, :y, :z, :ox, :oy, :zoom_x, :zoom_y, :angle, :mirror,
                :bush_depth, :bush_opacity, :blend_type,
                :wave_amp, :wave_length, :wave_speed, :wave_phase
  tkr_reader :opacity
  def initialize(viewport = nil)
    @__viewport = viewport
    @__bitmap = nil
    @__src_rect = Rect.new(0, 0, 0, 0)
    @__visible = true
    @__x = @__y = @__z = @__ox = @__oy = 0
    @__zoom_x = @__zoom_y = 1.0
    @__angle = 0
    @__mirror = false
    @__bush_depth = 0
    @__bush_opacity = 128
    @__opacity = 255
    @__blend_type = 0
    @__color = Color.new(0, 0, 0, 0)
    @__tone = Tone.new(0, 0, 0, 0)
    @__wave_amp = 0
    @__wave_length = 180
    @__wave_speed = 360
    @__wave_phase = 0.0
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @__viewport = v; end

  def bitmap=(b)
    @__bitmap = b
    if b && !b.disposed?
      @__src_rect.set(0, 0, b.width, b.height)
    end
  end

  def src_rect=(r); @__src_rect.set(r); end
  def color=(c); @__color.set(c); end
  def tone=(t); @__tone.set(t); end

  def opacity=(v)
    v = v.to_i
    @__opacity = v < 0 ? 0 : (v > 255 ? 255 : v)
  end

  def width; @__src_rect.width; end
  def height; @__src_rect.height; end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def update
    __update_flash
    @__wave_phase = (@__wave_phase + @__wave_speed / 180.0) % 360 if @__wave_amp != 0
  end

  def __pack(a)
    return if @__disposed || !@__visible
    b = @__bitmap
    return if b.nil? || b.disposed? || @__opacity <= 0
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    f = __flash_state
    return if f == :hide
    c = f || [@__color.red, @__color.green, @__color.blue, @__color.alpha]
    if f && @__color.alpha > f[3]
      c = [@__color.red, @__color.green, @__color.blue, @__color.alpha]
    end
    r = @__src_rect
    t = @__tone
    a.push(1, @__uid, vp ? vp.__uid : 0, @__z.to_i, b.__id, @__x.to_i, @__y.to_i, @__ox.to_i, @__oy.to_i,
           @__zoom_x, @__zoom_y, @__angle, @__mirror ? 1 : 0, r.x, r.y, r.width, r.height, @__opacity,
           @__blend_type.to_i, @__bush_depth.to_i, @__bush_opacity.to_i, c[0], c[1], c[2], c[3],
           t.red, t.green, t.blue, t.gray, @__wave_amp, @__wave_length, @__wave_phase)
  end
end

class Plane
  tkr_reader :viewport, :bitmap, :color, :tone, :opacity
  attr_reader :__uid
  tkr_accessor :visible, :z, :ox, :oy, :zoom_x, :zoom_y, :blend_type

  def initialize(viewport = nil)
    @__viewport = viewport
    @__bitmap = nil
    @__visible = true
    @__z = 0
    @__ox = 0
    @__oy = 0
    @__zoom_x = 1.0
    @__zoom_y = 1.0
    @__opacity = 255
    @__blend_type = 0
    @__color = Color.new(0, 0, 0, 0)
    @__tone = Tone.new(0, 0, 0, 0)
    @__disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @__viewport = v; end
  def bitmap=(b); @__bitmap = b; end
  def color=(c); @__color.set(c); end
  def tone=(t); @__tone.set(t); end

  def opacity=(v)
    v = v.to_i
    @__opacity = v < 0 ? 0 : (v > 255 ? 255 : v)
  end

  def dispose
    return if @__disposed
    @__disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @__disposed; end

  def update; end

  def __pack(a)
    return if @__disposed || !@__visible
    b = @__bitmap
    return if b.nil? || b.disposed? || @__opacity <= 0
    vp = @__viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    c = @__color
    t = @__tone
    a.push(2, @__uid, vp ? vp.__uid : 0, @__z.to_i, b.__id, @__ox.to_i, @__oy.to_i, @__zoom_x, @__zoom_y,
           @__opacity, @__blend_type.to_i, c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray)
  end
end

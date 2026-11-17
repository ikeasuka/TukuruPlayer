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
  attr_reader :rect, :color, :tone, :__uid
  attr_accessor :visible, :z, :ox, :oy

  def initialize(*args)
    if args.size == 0
      @rect = Rect.new(0, 0, Graphics.width, Graphics.height)
    elsif args.size == 1
      @rect = Rect.new(args[0])
    else
      @rect = Rect.new(*args)
    end
    @visible = true
    @z = 0
    @ox = 0
    @oy = 0
    @color = Color.new(0, 0, 0, 0)
    @tone = Tone.new(0, 0, 0, 0)
    @disposed = false
    @__uid = TKRCore.register_viewport(self)
  end

  def rect=(r); @rect.set(r); end
  def color=(c); @color.set(c); end
  def tone=(t); @tone.set(t); end

  def dispose
    return if @disposed
    @disposed = true
    TKRCore.unregister_viewport(@__uid)
  end

  def disposed?; @disposed; end

  def update
    __update_flash
  end

  def __pack(a)
    return if @disposed
    f = __flash_state
    f = [0, 0, 0, 0] if f.nil? || f == :hide
    r = @rect
    c = @color
    t = @tone
    a.push(5, @__uid, @z.to_i, @visible ? 1 : 0, r.x, r.y, r.width, r.height, @ox.to_i, @oy.to_i,
           c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray, f[0], f[1], f[2], f[3])
  end
end

class Sprite
  include TKRFlash
  attr_reader :viewport, :bitmap, :src_rect, :color, :tone, :__uid
  attr_accessor :visible, :x, :y, :z, :ox, :oy, :zoom_x, :zoom_y, :angle, :mirror,
                :bush_depth, :bush_opacity, :blend_type,
                :wave_amp, :wave_length, :wave_speed, :wave_phase
  attr_reader :opacity

  def initialize(viewport = nil)
    @viewport = viewport
    @bitmap = nil
    @src_rect = Rect.new(0, 0, 0, 0)
    @visible = true
    @x = @y = @z = @ox = @oy = 0
    @zoom_x = @zoom_y = 1.0
    @angle = 0
    @mirror = false
    @bush_depth = 0
    @bush_opacity = 128
    @opacity = 255
    @blend_type = 0
    @color = Color.new(0, 0, 0, 0)
    @tone = Tone.new(0, 0, 0, 0)
    @wave_amp = 0
    @wave_length = 180
    @wave_speed = 360
    @wave_phase = 0.0
    @disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @viewport = v; end

  def bitmap=(b)
    @bitmap = b
    if b && !b.disposed?
      @src_rect.set(0, 0, b.width, b.height)
    end
  end

  def src_rect=(r); @src_rect.set(r); end
  def color=(c); @color.set(c); end
  def tone=(t); @tone.set(t); end

  def opacity=(v)
    v = v.to_i
    @opacity = v < 0 ? 0 : (v > 255 ? 255 : v)
  end

  def width; @src_rect.width; end
  def height; @src_rect.height; end

  def dispose
    return if @disposed
    @disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @disposed; end

  def update
    __update_flash
    @wave_phase = (@wave_phase + @wave_speed / 180.0) % 360 if @wave_amp != 0
  end

  def __pack(a)
    return if @disposed || !@visible
    b = @bitmap
    return if b.nil? || b.disposed? || @opacity <= 0
    vp = @viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    f = __flash_state
    return if f == :hide
    c = f || [@color.red, @color.green, @color.blue, @color.alpha]
    if f && @color.alpha > f[3]
      c = [@color.red, @color.green, @color.blue, @color.alpha]
    end
    r = @src_rect
    t = @tone
    a.push(1, @__uid, vp ? vp.__uid : 0, @z.to_i, b.__id, @x.to_i, @y.to_i, @ox.to_i, @oy.to_i,
           @zoom_x, @zoom_y, @angle, @mirror ? 1 : 0, r.x, r.y, r.width, r.height, @opacity,
           @blend_type.to_i, @bush_depth.to_i, @bush_opacity.to_i, c[0], c[1], c[2], c[3],
           t.red, t.green, t.blue, t.gray, @wave_amp, @wave_length, @wave_phase)
  end
end

class Plane
  attr_reader :viewport, :bitmap, :color, :tone, :__uid, :opacity
  attr_accessor :visible, :z, :ox, :oy, :zoom_x, :zoom_y, :blend_type

  def initialize(viewport = nil)
    @viewport = viewport
    @bitmap = nil
    @visible = true
    @z = 0
    @ox = 0
    @oy = 0
    @zoom_x = 1.0
    @zoom_y = 1.0
    @opacity = 255
    @blend_type = 0
    @color = Color.new(0, 0, 0, 0)
    @tone = Tone.new(0, 0, 0, 0)
    @disposed = false
    @__uid = TKRCore.register(self)
  end

  def viewport=(v); @viewport = v; end
  def bitmap=(b); @bitmap = b; end
  def color=(c); @color.set(c); end
  def tone=(t); @tone.set(t); end

  def opacity=(v)
    v = v.to_i
    @opacity = v < 0 ? 0 : (v > 255 ? 255 : v)
  end

  def dispose
    return if @disposed
    @disposed = true
    TKRCore.unregister(@__uid)
  end

  def disposed?; @disposed; end

  def update; end

  def __pack(a)
    return if @disposed || !@visible
    b = @bitmap
    return if b.nil? || b.disposed? || @opacity <= 0
    vp = @viewport
    if vp
      return if vp.disposed? || !vp.visible
    end
    c = @color
    t = @tone
    a.push(2, @__uid, vp ? vp.__uid : 0, @z.to_i, b.__id, @ox.to_i, @oy.to_i, @zoom_x, @zoom_y,
           @opacity, @blend_type.to_i, c.red, c.green, c.blue, c.alpha, t.red, t.green, t.blue, t.gray)
  end
end

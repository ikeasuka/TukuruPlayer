# Bitmap: pixel data lives in JS (canvas / ImageBitmap), referenced by id.

class Bitmap
  tkr_reader :width, :height
  attr_reader :__id
  tkr_accessor :font

  def initialize(*args)
    if args.size == 1
      path = args[0].to_s
      begin
        @__id = TKRCore.call(:bmpLoad, path).await.to_i
      rescue JS::Error, StandardError => e
        raise Errno::ENOENT, path
      end
      @__width = TKRCore.int(:bmpW, @__id)
      @__height = TKRCore.int(:bmpH, @__id)
    elsif args.size == 2
      w = args[0].to_i
      h = args[1].to_i
      raise RGSSError, 'failed to create bitmap' if w <= 0 || h <= 0
      @__width = w
      @__height = h
      @__id = TKRCore.int(:bmpCreate, w, h)
    else
      raise ArgumentError, "wrong number of arguments (#{args.size} for 1..2)"
    end
    @__font = Font.new
    @__disposed = false
    ObjectSpace.define_finalizer(self, Bitmap.__finalizer(@__id))
  end

  # Wrap an existing JS bitmap id (snap_to_bitmap etc.)
  def self.__wrap(id)
    b = allocate
    b.__init_wrap(id)
    b
  end

  def __init_wrap(id)
    @__id = id
    @__width = TKRCore.int(:bmpW, id)
    @__height = TKRCore.int(:bmpH, id)
    @__font = Font.new
    @__disposed = false
    ObjectSpace.define_finalizer(self, Bitmap.__finalizer(id))
  end

  def self.__finalizer(id)
    proc { TKRCore.call(:bmpDispose, id) rescue nil }
  end

  def initialize_copy(o)
    super
    # dup/clone also copies finalizers: drop the copied one, otherwise collecting the copy
    # would dispose the ORIGINAL bitmap (e.g. Cache.system("Iconset").dup in battle scripts)
    ObjectSpace.undefine_finalizer(self)
    raise RGSSError, 'disposed bitmap' if o.disposed?
    @__id = TKRCore.int(:bmpDup, o.__id)
    @__font = o.font.dup
    @__disposed = false
    ObjectSpace.define_finalizer(self, Bitmap.__finalizer(@__id))
  end

  def dispose
    return if @__disposed
    TKRCore.call(:bmpDispose, @__id)
    @__disposed = true
  end

  def disposed?
    @__disposed
  end

  def rect
    Rect.new(0, 0, @__width, @__height)
  end

  def check_disposed
    raise RGSSError, 'disposed bitmap' if @__disposed
  end
  private :check_disposed

  def blt(x, y, src, src_rect, opacity = 255)
    check_disposed
    return if src.nil? || src.disposed?
    TKRCore.call(:bmpBlt, @__id, x.to_i, y.to_i, src.__id, src_rect.x, src_rect.y,
                  src_rect.width, src_rect.height, opacity.to_i)
    self
  end

  def stretch_blt(dest_rect, src, src_rect, opacity = 255)
    check_disposed
    return if src.nil? || src.disposed?
    TKRCore.call(:bmpStretch, @__id, dest_rect.x, dest_rect.y, dest_rect.width, dest_rect.height,
                  src.__id, src_rect.x, src_rect.y, src_rect.width, src_rect.height, opacity.to_i)
    self
  end

  def fill_rect(*args)
    check_disposed
    if args.size == 2
      r, c = args
      x, y, w, h = r.x, r.y, r.width, r.height
    else
      x, y, w, h, c = args
    end
    TKRCore.call(:bmpFill, @__id, x.to_i, y.to_i, w.to_i, h.to_i,
                  c.red.to_i, c.green.to_i, c.blue.to_i, c.alpha.to_i)
    self
  end

  def gradient_fill_rect(*args)
    check_disposed
    if args[0].is_a?(Rect)
      r, c1, c2, vertical = args
      x, y, w, h = r.x, r.y, r.width, r.height
    else
      x, y, w, h, c1, c2, vertical = args
    end
    TKRCore.call(:bmpGrad, @__id, x.to_i, y.to_i, w.to_i, h.to_i,
                  c1.red.to_i, c1.green.to_i, c1.blue.to_i, c1.alpha.to_i,
                  c2.red.to_i, c2.green.to_i, c2.blue.to_i, c2.alpha.to_i, vertical ? 1 : 0)
    self
  end

  def clear
    check_disposed
    TKRCore.call(:bmpClear, @__id)
    self
  end

  def clear_rect(*args)
    check_disposed
    if args.size == 1
      r = args[0]
      x, y, w, h = r.x, r.y, r.width, r.height
    else
      x, y, w, h = args
    end
    TKRCore.call(:bmpClearRect, @__id, x.to_i, y.to_i, w.to_i, h.to_i)
    self
  end

  def get_pixel(x, y)
    check_disposed
    r, g, b, a = TKRCore.str(:bmpGetPixel, @__id, x.to_i, y.to_i).split(',').map(&:to_i)
    Color.new(r, g, b, a)
  end

  def set_pixel(x, y, c)
    check_disposed
    TKRCore.call(:bmpSetPixel, @__id, x.to_i, y.to_i, c.red.to_i, c.green.to_i, c.blue.to_i, c.alpha.to_i)
    self
  end

  def hue_change(hue)
    check_disposed
    TKRCore.call(:bmpHue, @__id, hue.to_i % 360)
    self
  end

  def blur
    check_disposed
    TKRCore.call(:bmpBlur, @__id)
    self
  end

  def radial_blur(angle, division)
    check_disposed
    TKRCore.call(:bmpRadialBlur, @__id, angle.to_i, division.to_i)
    self
  end

  def draw_text(*args)
    check_disposed
    if args[0].is_a?(Rect)
      r = args[0]
      x, y, w, h = r.x, r.y, r.width, r.height
      str = args[1]
      align = args[2] || 0
    else
      x, y, w, h, str = args[0, 5]
      align = args[5] || 0
    end
    s = str.to_s
    return self if s.empty?
    s = s.dup.force_encoding('UTF-8') unless s.encoding == Encoding::UTF_8
    TKRCore.call(:bmpDrawText, @__id, x.to_i, y.to_i, w.to_i, h.to_i, s.scrub('?'), align.to_i, @__font.__spec)
    self
  end

  def text_size(str)
    s = str.to_s
    s = s.dup.force_encoding('UTF-8') unless s.encoding == Encoding::UTF_8
    w = s.empty? ? 0 : TKRCore.int(:textSize, @__font.__spec, s.scrub('?'))
    Rect.new(0, 0, w, @__font.size.to_i)
  end
end

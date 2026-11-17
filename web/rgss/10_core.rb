# Core RGSS classes: Color, Tone, Rect, Table, Font, errors and the JS bridge.

class RGSSError < StandardError; end
class RGSSReset < Exception; end

module TKRCore
  JSAPI = JS.global[:TKR]
  RGSS = $TKR_ENGINE || 3

  @uid = 0
  @drawables = ObjectSpace::WeakMap.new
  @viewports = ObjectSpace::WeakMap.new

  class << self
    def call(name, *args)
      JSAPI.call(name, *args)
    end

    def int(name, *args)
      JSAPI.call(name, *args).to_i
    end

    def str(name, *args)
      JSAPI.call(name, *args).to_s
    end

    def next_uid
      @uid += 1
    end

    def register(obj)
      id = next_uid
      @drawables[id] = obj
      id
    end

    def unregister(id)
      @drawables.delete(id)
    end

    def register_viewport(vp)
      id = next_uid
      @viewports[id] = vp
      id
    end

    def unregister_viewport(id)
      @viewports.delete(id)
    end

    def each_drawable(&block)
      @drawables.each_value(&block)
    end

    def each_viewport(&block)
      @viewports.each_value(&block)
    end

    # Dispose everything (F12 reset)
    def reset_all
      list = []
      @drawables.each_value { |d| list << d }
      list.each { |d| d.dispose rescue nil }
      vps = []
      @viewports.each_value { |v| vps << v }
      vps.each { |v| v.dispose rescue nil }
      Audio.bgm_stop
      Audio.bgs_stop
      Audio.me_stop
      Audio.se_stop
      Graphics.__reset
      GC.start
    end

    def b(v)
      v ? 1 : 0
    end
  end
end

class Color
  attr_reader :red, :green, :blue, :alpha

  def initialize(*args)
    case args.size
    when 0 then set(0, 0, 0, 0)
    when 1 then set(args[0])
    else set(*args)
    end
  end

  def set(*args)
    if args.size == 1
      c = args[0]
      @red = c.red; @green = c.green; @blue = c.blue; @alpha = c.alpha
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.alpha = args.size > 3 ? args[3] : 255
    end
    self
  end

  def red=(v); @red = clamp(v); end
  def green=(v); @green = clamp(v); end
  def blue=(v); @blue = clamp(v); end
  def alpha=(v); @alpha = clamp(v); end

  def ==(o)
    o.is_a?(Color) && @red == o.red && @green == o.green && @blue == o.blue && @alpha == o.alpha
  end

  def to_s
    format('(%f, %f, %f, %f)', @red, @green, @blue, @alpha)
  end
  alias inspect to_s

  def _dump(_depth = 0)
    [@red, @green, @blue, @alpha].pack('E4')
  end

  def self._load(s)
    new(*s.unpack('E4'))
  end

  def __rgba
    "#{@red.to_i},#{@green.to_i},#{@blue.to_i},#{@alpha.to_i}"
  end

  private

  def clamp(v)
    v = v.to_f
    v < 0 ? 0.0 : (v > 255 ? 255.0 : v)
  end
end

class Tone
  attr_reader :red, :green, :blue, :gray

  def initialize(*args)
    case args.size
    when 0 then set(0, 0, 0, 0)
    when 1 then set(args[0])
    else set(*args)
    end
  end

  def set(*args)
    if args.size == 1
      t = args[0]
      @red = t.red; @green = t.green; @blue = t.blue; @gray = t.gray
    else
      self.red = args[0]
      self.green = args[1]
      self.blue = args[2]
      self.gray = args.size > 3 ? args[3] : 0
    end
    self
  end

  def red=(v); @red = clamp(v); end
  def green=(v); @green = clamp(v); end
  def blue=(v); @blue = clamp(v); end

  def gray=(v)
    v = v.to_f
    @gray = v < 0 ? 0.0 : (v > 255 ? 255.0 : v)
  end

  def ==(o)
    o.is_a?(Tone) && @red == o.red && @green == o.green && @blue == o.blue && @gray == o.gray
  end

  def zero?
    @red == 0 && @green == 0 && @blue == 0 && @gray == 0
  end

  def to_s
    format('(%f, %f, %f, %f)', @red, @green, @blue, @gray)
  end
  alias inspect to_s

  def _dump(_depth = 0)
    [@red, @green, @blue, @gray].pack('E4')
  end

  def self._load(s)
    new(*s.unpack('E4'))
  end

  private

  def clamp(v)
    v = v.to_f
    v < -255 ? -255.0 : (v > 255 ? 255.0 : v)
  end
end

class Rect
  attr_accessor :x, :y, :width, :height

  def initialize(*args)
    if args.size == 0
      set(0, 0, 0, 0)
    else
      set(*args)
    end
  end

  def set(*args)
    if args.size == 1
      r = args[0]
      @x = r.x; @y = r.y; @width = r.width; @height = r.height
    else
      @x = args[0].to_i; @y = args[1].to_i; @width = args[2].to_i; @height = args[3].to_i
    end
    self
  end

  def empty
    @x = @y = @width = @height = 0
    self
  end

  def ==(o)
    o.is_a?(Rect) && @x == o.x && @y == o.y && @width == o.width && @height == o.height
  end

  def to_s
    "(#{@x}, #{@y}, #{@width}, #{@height})"
  end
  alias inspect to_s

  def _dump(_depth = 0)
    [@x, @y, @width, @height].pack('l4')
  end

  def self._load(s)
    new(*s.unpack('l4'))
  end
end

class Table
  attr_reader :xsize, :ysize, :zsize, :__version

  def initialize(x, y = nil, z = nil)
    @dim = z ? 3 : (y ? 2 : 1)
    @xsize = [x.to_i, 0].max
    @ysize = [(y || 1).to_i, 0].max
    @zsize = [(z || 1).to_i, 0].max
    @data = Array.new(@xsize * @ysize * @zsize, 0)
    @__version = 0
  end

  def resize(x, y = nil, z = nil)
    old = @data
    ox, oy, oz = @xsize, @ysize, @zsize
    @dim = z ? 3 : (y ? 2 : 1)
    @xsize = [x.to_i, 0].max
    @ysize = [(y || 1).to_i, 0].max
    @zsize = [(z || 1).to_i, 0].max
    @data = Array.new(@xsize * @ysize * @zsize, 0)
    [oz, @zsize].min.times do |k|
      [oy, @ysize].min.times do |j|
        [ox, @xsize].min.times do |i|
          @data[i + (j + k * @ysize) * @xsize] = old[i + (j + k * oy) * ox]
        end
      end
    end
    @__version += 1
    self
  end

  def [](x, y = 0, z = 0)
    return nil if x < 0 || y < 0 || z < 0 || x >= @xsize || y >= @ysize || z >= @zsize
    @data[x + (y + z * @ysize) * @xsize]
  end

  def []=(*args)
    v = args.pop
    x = args[0]; y = args[1] || 0; z = args[2] || 0
    return v if x < 0 || y < 0 || z < 0 || x >= @xsize || y >= @ysize || z >= @zsize
    v = v.to_i
    v = ((v + 32768) & 0xFFFF) - 32768 if v > 32767 || v < -32768
    @data[x + (y + z * @ysize) * @xsize] = v
    @__version += 1
    v
  end

  def __data
    @data
  end

  def _dump(_depth = 0)
    [@dim, @xsize, @ysize, @zsize, @data.size].pack('l5') + @data.pack('s*')
  end

  def self._load(s)
    dim, x, y, z, n = s.unpack('l5')
    t = allocate
    t.__init_raw(dim, x, y, z, s[20, n * 2].unpack('s*'))
    t
  end

  def __init_raw(dim, x, y, z, data)
    @dim = dim; @xsize = x; @ysize = y; @zsize = z; @data = data; @__version = 0
    @data.fill(0, @data.size...(x * y * z)) if @data.size < x * y * z
  end

  # Upload to JS (for tilemaps); returns JS-side id.
  def __sync_js
    @__js_id ||= begin
      id = TKRCore.next_uid
      ObjectSpace.define_finalizer(self, Table.__finalizer(id))
      id
    end
    if @__js_version != @__version
      TKRCore.call(:tableUpload, @__js_id, [@data.pack('s*')].pack('m0'), @xsize, @ysize, @zsize)
      @__js_version = @__version
    end
    @__js_id
  end

  def self.__finalizer(id)
    proc { TKRCore.call(:tableFree, id) rescue nil }
  end
end

class Font
  class << self
    attr_accessor :default_name, :default_size, :default_bold, :default_italic,
                  :default_shadow, :default_outline, :default_color, :default_out_color

    # Missing fonts fall back to the system Japanese font, so report every font as present
    # (VX's default Main script exits when "UmePlus Gothic" is not found).
    def exist?(_name)
      true
    end
  end

  if TKRCore::RGSS == 2
    self.default_name = ['UmePlus Gothic', 'MS Gothic', 'Courier New']
    self.default_size = 20
    self.default_shadow = true
    self.default_outline = false
  else
    self.default_name = ['VL Gothic']
    self.default_size = 24
    self.default_shadow = false
    self.default_outline = true
  end
  self.default_bold = false
  self.default_italic = false
  self.default_color = Color.new(255, 255, 255, 255)
  self.default_out_color = Color.new(0, 0, 0, 128)

  attr_accessor :name, :size, :bold, :italic, :shadow, :outline
  attr_reader :color, :out_color

  def initialize(name = Font.default_name, size = Font.default_size)
    @name = name.is_a?(Array) ? name.dup : name
    @size = size
    @bold = Font.default_bold
    @italic = Font.default_italic
    @shadow = Font.default_shadow
    @outline = Font.default_outline
    @color = Color.new(Font.default_color)
    @out_color = Color.new(Font.default_out_color)
  end

  def initialize_copy(o)
    super
    @color = Color.new(o.color)
    @out_color = Color.new(o.out_color)
    @name = @name.dup if @name.is_a?(Array)
  end

  def color=(c)
    @color = c.is_a?(Color) ? c : Color.new(c)
  end

  def out_color=(c)
    @out_color = c.is_a?(Color) ? c : Color.new(c)
  end

  def __spec
    names = @name.is_a?(Array) ? @name.join('|') : @name.to_s
    "#{names};#{@size.to_i};#{@bold ? 1 : 0};#{@italic ? 1 : 0};#{@outline ? 1 : 0};#{@shadow ? 1 : 0};#{@color.__rgba};#{@out_color.__rgba}"
  end
end

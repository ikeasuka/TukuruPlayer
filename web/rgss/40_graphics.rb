# Graphics / Input / Audio modules.

module Graphics
  @frame_rate = 60
  @frame_count = 0
  @brightness = 255
  @width = 544
  @height = 416
  @frozen = false

  class << self
    attr_accessor :frame_count
    attr_reader :frame_rate, :brightness, :width, :height

    def __reset
      @brightness = 255
      @frozen = false
      TKRCore.call(:unfreeze)
    end

    def frame_rate=(v)
      @frame_rate = [[v.to_i, 10].max, 120].min
      TKRCore.call(:setFrameRate, @frame_rate)
    end

    def brightness=(v)
      v = v.to_i
      @brightness = v < 0 ? 0 : (v > 255 ? 255 : v)
    end

    def __list
      a = [@brightness]
      TKRCore.each_viewport { |v| v.__pack(a) }
      TKRCore.each_drawable { |d| d.__pack(a) }
      a.join(',')
    end

    def __wait_frame
      r = TKRCore.call(:frame).await.to_s
      @frame_count += 1
      __memory_check if @frame_count % 15 == 0
      raise RGSSReset if r == 'reset'
    end

    # Bitmaps hold large pixel buffers in JS but look tiny to Ruby's GC, so scripts that
    # create bitmaps without disposing them would exhaust memory before Ruby collects them.
    # Run the GC when JS-side bitmap memory grows past a threshold.
    GC_STEP_MB = 96
    def __memory_check
      mb = TKRCore.int(:bitmapMB)
      @gc_base ||= 0
      if @gc_pending
        # finalizers have run since the last GC: measure the new baseline
        @gc_pending = false
        @gc_base = mb
        return
      end
      return unless mb > @gc_base + GC_STEP_MB
      GC.start
      @gc_pending = true
      @gc_runs = (@gc_runs || 0) + 1
      if @gc_runs <= 5 || @gc_runs % 20 == 0
        TKRCore.call(:stage, "GC ##{@gc_runs}: bitmaps #{mb}MB, count #{TKRCore.int(:bitmapCount)}")
      end
    end

    def update
      TKRCore.call(:render, __list) unless @frozen
      __wait_frame
    end

    def wait(duration)
      duration.to_i.times { update }
    end

    def fadeout(duration)
      d = duration.to_i
      start = @brightness
      if d <= 0
        @brightness = 0
        return
      end
      d.times do |i|
        @brightness = start - (start * (i + 1) / d)
        update
      end
    end

    def fadein(duration)
      d = duration.to_i
      start = @brightness
      if d <= 0
        @brightness = 255
        return
      end
      d.times do |i|
        @brightness = start + ((255 - start) * (i + 1) / d)
        update
      end
    end

    def freeze
      TKRCore.call(:freeze, __list)
      @frozen = true
    end

    def transition(duration = (TKRCore::RGSS == 2 ? 8 : 10), filename = '', vague = 40)
      unless @frozen
        return
      end
      duration = duration.to_i
      mask = nil
      if filename && !filename.to_s.empty?
        mask = Bitmap.new(filename.to_s) rescue nil
      end
      duration.times do |i|
        TKRCore.call(:transitionStep, __list, (i + 1).to_f / duration, mask ? mask.__id : 0, vague.to_i)
        __wait_frame
      end
      @frozen = false
      TKRCore.call(:unfreeze)
      mask.dispose if mask
    end

    def snap_to_bitmap
      Bitmap.__wrap(TKRCore.int(:snap, __list))
    end

    def frame_reset; end

    def resize_screen(w, h)
      w = [[w.to_i, 1].max, 640].min
      h = [[h.to_i, 1].max, 480].min
      return if w == @width && h == @height
      @width = w
      @height = h
      TKRCore.call(:resize, @width, @height)
    end

    def play_movie(_filename); end
  end
end

module Input
  BITS = {
    down: 0, left: 1, right: 2, up: 3, a: 4, b: 5, c: 6, x: 7, y: 8, z: 9, l: 10, r: 11,
    shift: 12, ctrl: 13, alt: 14, f5: 15, f6: 16, f7: 17, f8: 18, f9: 19
  }.freeze
  NUMS = {
    2 => :down, 4 => :left, 6 => :right, 8 => :up, 11 => :a, 12 => :b, 13 => :c, 14 => :x, 15 => :y,
    16 => :z, 17 => :l, 18 => :r, 21 => :shift, 22 => :ctrl, 23 => :alt,
    25 => :f5, 26 => :f6, 27 => :f7, 28 => :f8, 29 => :f9
  }.freeze

  if TKRCore::RGSS == 3
    DOWN = :DOWN; LEFT = :LEFT; RIGHT = :RIGHT; UP = :UP
    A = :A; B = :B; C = :C; X = :X; Y = :Y; Z = :Z; L = :L; R = :R
    SHIFT = :SHIFT; CTRL = :CTRL; ALT = :ALT
    F5 = :F5; F6 = :F6; F7 = :F7; F8 = :F8; F9 = :F9
  else
    DOWN = 2; LEFT = 4; RIGHT = 6; UP = 8
    A = 11; B = 12; C = 13; X = 14; Y = 15; Z = 16; L = 17; R = 18
    SHIFT = 21; CTRL = 22; ALT = 23
    F5 = 25; F6 = 26; F7 = 27; F8 = 28; F9 = 29
  end

  @press = 0
  @trigger = 0
  @repeat = 0
  @dir4 = 0
  @dir8 = 0
  @bit_cache = {}

  class << self
    attr_reader :dir4, :dir8

    def update
      p, t, r, d4, d8 = TKRCore.str(:inputUpdate).split(',').map(&:to_i)
      @press = p
      @trigger = t
      @repeat = r
      @dir4 = d4
      @dir8 = d8
    end

    def __bit(key)
      b = @bit_cache[key]
      return b if b
      sym = key.is_a?(Integer) ? NUMS[key] : key.to_s.downcase.to_sym
      i = BITS[sym]
      return nil unless i
      @bit_cache[key] = 1 << i
    end

    def press?(key)
      b = __bit(key)
      b ? (@press & b) != 0 : false
    end

    def trigger?(key)
      b = __bit(key)
      b ? (@trigger & b) != 0 : false
    end

    def repeat?(key)
      b = __bit(key)
      b ? (@repeat & b) != 0 : false
    end
  end
end

module Audio
  class << self
    def __a(op, *args)
      TKRCore.call(:audio, op, *args)
      nil
    end

    def setup_midi; end

    def bgm_play(name, volume = 100, pitch = 100, pos = 0)
      __a('bgm_play', name.to_s, volume.to_i, pitch.to_i, pos.to_i)
    end

    def bgm_stop; __a('bgm_stop'); end
    def bgm_fade(time); __a('bgm_fade', time.to_i); end

    def bgm_pos
      TKRCore.int(:bgmPos)
    end

    def bgs_play(name, volume = 80, pitch = 100, pos = 0)
      __a('bgs_play', name.to_s, volume.to_i, pitch.to_i, pos.to_i)
    end

    def bgs_stop; __a('bgs_stop'); end
    def bgs_fade(time); __a('bgs_fade', time.to_i); end
    def bgs_pos; 0; end

    def me_play(name, volume = 100, pitch = 100)
      __a('me_play', name.to_s, volume.to_i, pitch.to_i)
    end

    def me_stop; __a('me_stop'); end
    def me_fade(time); __a('me_fade', time.to_i); end

    def se_play(name, volume = 80, pitch = 100)
      __a('se_play', name.to_s, volume.to_i, pitch.to_i)
    end

    def se_stop; __a('se_stop'); end
  end
end

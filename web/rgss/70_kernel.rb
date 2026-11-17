# Global functions (load_data, save_data, rgss_main, msgbox, ...) and file I/O hooks.

module TKRCore
  GAME_PREFIX = '/game/'.freeze

  class << self
    # Path relative to the game folder, or nil if outside of it.
    def game_relative(path)
      s = path.to_s.tr('\\', '/')
      if s.start_with?('/')
        return nil unless s.start_with?(GAME_PREFIX)
        s = s[GAME_PREFIX.size..]
      end
      s = s.sub(%r{\A\./}, '')
      s.empty? ? nil : s
    end

    def sync_file(path)
      rel = game_relative(path)
      call(:syncFile, rel) if rel
    rescue StandardError
      nil
    end

    def delete_file(path)
      rel = game_relative(path)
      call(:deleteFile, rel) if rel
    end

    def marshal_load(data)
      if RGSS == 2
        Marshal.load(data, proc { |o|
          o.force_encoding(Encoding::UTF_8) if o.is_a?(String) && o.encoding == Encoding::ASCII_8BIT && !o.frozen?
          o
        })
      else
        Marshal.load(data)
      end
    end

    # Resolve a path case-insensitively inside the game folder.
    def resolve_ci(path)
      rel = game_relative(path)
      return path unless rel
      r = str(:fsResolve, rel)
      r.empty? ? path : r
    end

    # If the file is a placeholder (not preloaded), fetch it from the host.
    def materialize(path)
      rel = game_relative(path)
      return path unless rel
      real = str(:fsResolve, rel)
      return path if real.empty?
      call(:materialize, real).await if int(:isPlaceholder, real) != 0
      real
    rescue StandardError
      path
    end

    def write_mode?(args, kw)
      m = kw[:mode] || args[1]
      case m
      when String then m.include?('w') || m.include?('a') || m.include?('+')
      when Integer then (m & (File::WRONLY | File::RDWR | File::APPEND)) != 0
      else false
      end
    end
  end
end

class File
  module TKRHook
    def initialize(*args, **kw)
      if args[0].is_a?(String) || args[0].respond_to?(:to_path)
        path = args[0].to_s
        unless TKRCore.write_mode?(args, kw)
          args[0] = TKRCore.materialize(path)
        end
        @__tkr_write = TKRCore.write_mode?(args, kw)
      end
      super(*args, **kw)
    end

    def close
      w = @__tkr_write && !closed?
      pth = (path rescue nil)
      r = super
      TKRCore.sync_file(pth) if w && pth
      r
    end
  end
  prepend TKRHook

  class << self
    alias_method :__tkr_binwrite, :binwrite
    alias_method :__tkr_write, :write
    alias_method :__tkr_delete, :delete
    alias_method :__tkr_rename, :rename
    alias_method :__tkr_read, :read
    alias_method :__tkr_binread, :binread
    alias_method :__tkr_readlines, :readlines
    alias_method :__tkr_exist, :exist?

    def binwrite(name, *args, **kw)
      r = __tkr_binwrite(name, *args, **kw)
      TKRCore.sync_file(name)
      r
    end

    def write(name, *args, **kw)
      r = __tkr_write(name, *args, **kw)
      TKRCore.sync_file(name)
      r
    end

    def read(name, *args, **kw)
      __tkr_read(TKRCore.materialize(name), *args, **kw)
    end

    def binread(name, *args)
      __tkr_binread(TKRCore.materialize(name), *args)
    end

    def readlines(name, *args, **kw)
      __tkr_readlines(TKRCore.materialize(name), *args, **kw)
    end

    def delete(*names)
      names.each do |n|
        __tkr_delete(TKRCore.resolve_ci(n))
        TKRCore.delete_file(TKRCore.resolve_ci(n))
      end
      names.size
    end
    alias_method :unlink, :delete

    def rename(a, b)
      r = __tkr_rename(a, b)
      TKRCore.delete_file(a)
      TKRCore.sync_file(b)
      r
    end

    def exist?(name)
      __tkr_exist(name) || (TKRCore.game_relative(name) && !TKRCore.str(:fsResolve, TKRCore.game_relative(name)).empty?)
    end
    alias_method :exists?, :exist?
  end
end

module FileTest
  class << self
    def exist?(name)
      File.exist?(name)
    end
    alias_method :exists?, :exist?
  end
end

module Kernel
  def load_data(filename)
    path = begin
      TKRCore.call(:loadData, filename.to_s).await.to_s
    rescue StandardError
      raise Errno::ENOENT, filename.to_s
    end
    TKRCore.marshal_load(File.__tkr_binread(path))
  end

  def save_data(obj, filename)
    File.binwrite(filename, Marshal.dump(obj))
    obj
  end

  def msgbox(*args)
    TKRCore.call(:msgbox, args.map(&:to_s).join).await
    args.size <= 1 ? args[0] : args
  end

  def msgbox_p(*args)
    TKRCore.call(:msgbox, args.map(&:inspect).join("\n")).await
    args.size <= 1 ? args[0] : args
  end

  def rgss_main
    loop do
      begin
        yield
        break
      rescue RGSSReset
        TKRCore.reset_all
      end
    end
  end

  def rgss_stop
    loop { Graphics.update }
  end

  private :load_data, :save_data, :msgbox, :msgbox_p, :rgss_main, :rgss_stop
end

# Windows API calls used by some scripts: return harmless defaults.
class Win32API
  def initialize(dll, func, *_args)
    @dll = dll.to_s
    @func = func.to_s
  end

  def call(*args)
    case @func
    when 'GetPrivateProfileString', 'GetPrivateProfileStringA', 'GetPrivateProfileStringW'
      section, key, default, buf = args
      v = TKRBoot.ini_value(section.to_s, key.to_s) || default.to_s
      buf.replace(v.dup.force_encoding(buf.encoding)) if buf.is_a?(String)
      v.bytesize
    when 'FindWindow', 'FindWindowA', 'FindWindowW', 'GetActiveWindow', 'GetForegroundWindow'
      1
    when 'GetSystemMetrics'
      args[0] == 0 ? 1920 : 1080
    when 'GetUserDefaultLangID', 'GetSystemDefaultLangID'
      0x411
    else
      0
    end
  end
  alias Call call
end

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
        # Ruby 1.8 strings carry no encoding. Treat text as UTF-8, but keep binary data
        # (e.g. encrypted payloads that games decrypt themselves) as bytes, otherwise
        # String#size etc. would count characters and corrupt the data.
        Marshal.load(data, proc { |o|
          if o.is_a?(String) && o.encoding == Encoding::ASCII_8BIT && !o.frozen?
            o.force_encoding(Encoding::UTF_8)
            o.force_encoding(Encoding::ASCII_8BIT) unless o.valid_encoding?
          end
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

    def truncate_mode?(args, kw)
      m = kw[:mode] || args[1]
      case m
      when String then m.start_with?('w')
      when Integer then (m & File::TRUNC) != 0
      else false
      end
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
        # Load the real contents first unless the file is being truncated ("w"/"w+"):
        # appending to / updating an empty placeholder would destroy the original data.
        args[0] = TKRCore.materialize(path) unless TKRCore.truncate_mode?(args, kw)
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

# Other ways of reading a file / its size (IO.read, IO.binread, File.size, File.stat ...)
# must also see the real contents rather than an empty placeholder.
module TKRReadHook
  %i[read binread readlines foreach].each do |m|
    define_method(m) do |name, *args, **kw, &blk|
      name = TKRCore.materialize(name) if name.is_a?(String) && !name.start_with?('|')
      super(name, *args, **kw, &blk)
    end
  end
end
IO.singleton_class.prepend(TKRReadHook)

module TKRStatHook
  %i[size size? stat lstat zero? empty?].each do |m|
    define_method(m) do |name, *args|
      name = TKRCore.materialize(name) if name.is_a?(String)
      super(name, *args)
    end
  end
end
File.singleton_class.prepend(TKRStatHook)

module FileTest
  class << self
    def size(name)
      File.size(name)
    end

    def size?(name)
      File.size?(name)
    end

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
# Raised for games that cannot run outside Windows (shown to the player as is).
class TKRUnsupportedGame < StandardError; end

class Win32API
  # DLLs that games use to decrypt their own data/images. They are Windows programs and their
  # protection is the game author's choice, so such games cannot be played here.
  ENCRYPTION_DLLS = /\A(wfPcrypt|wfpcrypt)(\.dll)?\z/i

  def initialize(dll, func, *_args)
    @dll = dll.to_s
    @func = func.to_s
    if @dll =~ ENCRYPTION_DLLS
      raise TKRUnsupportedGame,
            "このゲームは Windows 専用の暗号化 DLL（#{@dll}）でデータや画像を暗号化しているため、" \
            "iPhone では遊べません。（Windows 版でお楽しみください）"
    end
  end

  def call(*args)
    @@logged ||= {}
    key = "#{@dll}:#{@func}"
    unless @@logged[key]
      @@logged[key] = true
      shown = args.map { |a| a.is_a?(String) ? a[0, 40].inspect : a.inspect }.join(', ')
      TKRCore.call(:log, "Win32API #{key}(#{shown}) -> stub") rescue nil
    end
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

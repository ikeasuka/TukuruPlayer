# Game boot: load Scripts.rvdata(2) and run the game scripts.

module TKRBoot
  class << self
    def ini_value(section, key)
      @ini ||= begin
        text = File.exist?('Game.ini') ? (File.read('Game.ini') rescue '') : ''
        text = text.dup.force_encoding('UTF-8')
        text = text.encode('UTF-8', 'Shift_JIS', invalid: :replace, undef: :replace) unless text.valid_encoding?
        h = {}
        cur = ''
        text.each_line do |l|
          l = l.strip
          if l =~ /\A\[(.+)\]\z/
            cur = $1.downcase
          elsif l =~ /\A([^=]+)=(.*)\z/
            h["#{cur}/#{$1.strip.downcase}"] = $2.strip
          end
        end
        h
      end
      @ini["#{section.downcase}/#{key.downcase}"]
    end

    def show_error(e)
      bt = (e.backtrace || []).reject { |l| l.include?('/rgss/') || l.include?('<internal:') }
      if e.is_a?(TKRUnsupportedGame)
        TKRCore.call(:error, 'このゲームには対応していません', e.message)
        return
      end
      title = e.is_a?(SyntaxError) ? 'Script syntax error' : "#{e.class}"
      body = "#{e.message}\n\n#{bt.first(12).join("\n")}"
      cur = defined?(TKRTrace) && TKRTrace.current
      body += "\n\n実行中のイベント: #{cur}" if cur
      TKRCore.call(:error, title, body)
      ctx = source_context(bt)
      TKRCore.call(:log, ctx) if ctx
    rescue StandardError
      nil
    end

    # The game script lines around the error (written to the log for diagnosis).
    def source_context(bt)
      return nil unless $RGSS_SCRIPTS
      bt.each do |l|
        next unless l =~ /\A(.+?):(\d+):in/
        name = $1
        line = $2.to_i
        s = $RGSS_SCRIPTS.find { |sc| sc[1].to_s.dup.force_encoding('UTF-8').scrub('?') == name }
        next unless s && s[3]
        src = s[3].lines
        from = [line - 6, 0].max
        to = [line + 4, src.size - 1].min
        out = (from..to).map do |i|
          text = src[i].to_s.chomp
          text = text[0, 400] + "…(#{text.size} chars)" if text.size > 400
          format('%s%5d| %s', i + 1 == line ? '>' : ' ', i + 1, text)
        end
        return "source of #{name} around line #{line}:\n" + out.join("\n")
      end
      nil
    end

    def run
      Dir.chdir('/game')
      $TEST = false
      $BTEST = false
      script_file = TKRCore::RGSS == 3 ? 'Data/Scripts.rvdata2' : 'Data/Scripts.rvdata'
      begin
        scripts = load_data(script_file)
      rescue StandardError => e
        TKRCore.call(:error, 'Scripts を読み込めません', "#{script_file}\n#{e.message}")
        return
      end
      $RGSS_SCRIPTS = scripts
      scripts.each do |s|
        code = Zlib::Inflate.inflate(s[2])
        code.force_encoding(Encoding::UTF_8)
        code = code.encode('UTF-8', 'Shift_JIS', invalid: :replace, undef: :replace) unless code.valid_encoding?
        s[3] = code
      end
      TKRCore.call(:stage, "scripts loaded: #{scripts.size}")
      TKRCore.call(:ready)
      loop do
        begin
          scripts.each do |s|
            name = s[1].to_s.dup.force_encoding(Encoding::UTF_8)
            name = name.scrub('?')
            TKRCore.call(:stage, "script: #{name}")
            eval(s[3], TOPLEVEL_BINDING, name.empty? ? '(untitled)' : name, 1)
          end
          break
        rescue RGSSReset
          TKRCore.reset_all
          next
        rescue SystemExit
          break
        rescue Exception => e
          show_error(e)
          loop { Graphics.update }
        end
      end
      TKRCore.call(:exit)
    rescue SystemExit
      TKRCore.call(:exit)
    rescue Exception => e
      show_error(e)
    end
  end
end

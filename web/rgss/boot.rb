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
      title = e.is_a?(SyntaxError) ? 'Script syntax error' : "#{e.class}"
      body = "#{e.message}\n\n#{bt.first(12).join("\n")}"
      TKRCore.call(:error, title, body)
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
      TKRCore.call(:ready)
      loop do
        begin
          scripts.each do |s|
            name = s[1].to_s.dup.force_encoding(Encoding::UTF_8)
            name = name.scrub('?')
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

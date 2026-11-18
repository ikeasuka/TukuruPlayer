// Smoke test for the iOS Ruby build: runs a script inside the iOS Simulator (xcrun simctl spawn).
#include <ruby.h>
#include <stdio.h>

static const char *script =
  "puts \"RUBY #{RUBY_VERSION} #{RUBY_PLATFORM}\"\n"
  "require 'zlib'\n"
  "z = Zlib::Deflate.deflate('hello' * 100); raise 'zlib' unless Zlib::Inflate.inflate(z) == 'hello' * 100\n"
  "s = \"\\x83\\x65\\x83\\x58\\x83\\x67\".force_encoding('Shift_JIS').encode('UTF-8'); raise 'sjis' unless s == 'テスト'\n"
  "w = \"\\x82\\xa0\".force_encoding('Windows-31J').encode('UTF-8'); raise 'cp932' unless w == 'あ'\n"
  "m = Marshal.load(Marshal.dump([1, 'a', {b: 2.5}])); raise 'marshal' unless m == [1, 'a', {b: 2.5}]\n"
  "f = Fiber.new { Fiber.yield 1; 2 }; raise 'fiber' unless f.resume == 1 && f.resume == 2\n"
  "def deep(n) n == 0 ? 0 : 1 + deep(n - 1) end; raise 'deep' unless deep(10000) == 10000\n"
  "require 'stringio'; raise 'stringio' unless StringIO.new('ab').read == 'ab'\n"
  "t = Time.now; x = 0; 3_000_000.times { |i| x += i }; puts \"loop 3M: #{((Time.now - t) * 1000).round} ms\"\n"
  "puts 'SMOKE OK'\n";

int main(int argc, char **argv) {
  ruby_sysinit(&argc, &argv);
  RUBY_INIT_STACK;
  ruby_init();
  ruby_init_loadpath();
  int state = 0;
  rb_eval_string_protect(script, &state);
  if (state) {
    VALUE err = rb_errinfo();
    VALUE msg = rb_funcall(err, rb_intern("full_message"), 0);
    fprintf(stderr, "SMOKE NG: %s\n", StringValueCStr(msg));
  }
  return ruby_cleanup(state);
}

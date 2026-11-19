// iOS entry point for the native engine: boots Ruby once per process and runs games on the
// calling (dedicated, large-stack) thread. Ruby cannot be re-initialised, so between games
// the constants defined by the previous game and the RGSS runtime are removed.
#include "tkr_ios.h"
#include "../core/tkr.h"
#include "../core/tkr_engine.h"
#include "../core/tkr_fs.h"
#include "../core/tkr_platform.h"
#include <ruby.h>
#include <stdlib.h>
#include <string.h>

static int g_ruby_ready = 0;

int tkr_platform_resolve(const char *rel, const char *const *exts, char *out, size_t outlen) {
  return tkr_fs_resolve(rel, exts, out, outlen);
}

static void ruby_boot(void) {
  if (g_ruby_ready) return;
  // RGSS games can nest calls deeply (Windows RGSS allows >10000); Ruby defaults to ~1MB.
  setenv("RUBY_THREAD_VM_STACK_SIZE", "4194304", 1);
  setenv("RUBY_FIBER_VM_STACK_SIZE", "1048576", 1);
  setenv("RUBY_FIBER_MACHINE_STACK_SIZE", "1048576", 1);
  int argc = 1;
  char *args[] = {"TukuruPlayer", NULL};
  char **argv = args;
  ruby_sysinit(&argc, &argv);
  ruby_init();
  // ruby_options also loads the builtin .rb definitions (Integer#to_i, Array#each ...)
  char *rargv[] = {"TukuruPlayer", "--disable-gems", "-e", "nil", NULL};
  ruby_options(4, rargv);
  ruby_script("TukuruPlayer");
  rb_eval_string("$__tkr_base_consts = Object.constants");
  g_ruby_ready = 1;
}

// Remove what the previous game defined (constants, globals, bitmaps) before the next one.
static const char *CLEANUP =
  "(Object.constants - $__tkr_base_consts).each { |c| Object.send(:remove_const, c) rescue nil }\n"
  "(global_variables - [:$__tkr_base_consts, :$stdout, :$stderr, :$stdin, :$0, :$PROGRAM_NAME, "
  ":$LOAD_PATH, :$:, :$LOADED_FEATURES, :$\", :$DEBUG, :$VERBOSE, :$-v, :$-w, :$FILENAME, :$*]).each do |g|\n"
  "  next if g.to_s =~ /\\A\\$[0-9~&`'+!@_\\/\\\\;,.<>*]/\n"
  "  eval(\"#{g} = nil\") rescue nil\n"
  "end\n"
  "GC.start\n";

int tkr_ios_run(const char *game_dir, const char *rgss_dir, int engine, const char *const *rtp, int nrtp) {
  int first = !g_ruby_ready;
  RUBY_INIT_STACK;
  ruby_boot();
  if (!first) {
    int state = 0;
    rb_eval_string_protect(CLEANUP, &state);
    if (state) rb_set_errinfo(Qnil);
  }
  tkr_fs_set_roots(game_dir, rtp, nrtp);
  TkrEngineConfig cfg = {game_dir, rgss_dir, engine};
  int r = tkr_engine_run(&cfg);
  tkr_bmp_dispose_all();
  return r;
}

// Ruby binding of the native core: TKRNative.call(name, *args) implements the same API the
// web runtime exposes as window.TKR (see web/src/main.js), so web/rgss/*.rb runs unchanged.
// Also boots the VM and the game (tkr_engine_run).
#include "tkr.h"
#include "tkr_engine.h"
#include "tkr_platform.h"
#include <ruby.h>
#include <ruby/encoding.h>
#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

#define NAMES(X) \
  X(bmpCreate) X(bmpLoad) X(bmpW) X(bmpH) X(bmpDispose) X(bmpDup) X(bmpBlt) X(bmpStretch) X(bmpFill) \
  X(bmpGrad) X(bmpClear) X(bmpClearRect) X(bmpGetPixel) X(bmpSetPixel) X(bmpHue) X(bmpBlur) \
  X(bmpRadialBlur) X(bmpDrawText) X(textSize) X(bitmapMB) X(bitmapCount) X(fontExists) X(tableUpload) \
  X(tableFree) X(render) X(frame) X(setFrameRate) X(freeze) X(unfreeze) X(transitionStep) X(snap) \
  X(resize) X(inputUpdate) X(audio) X(bgmPos) X(loadData) X(syncFile) X(deleteFile) X(fsResolve) \
  X(isPlaceholder) X(materialize) X(log) X(msgbox) X(exit) X(error) X(ready) X(stage) X(title)

#define DECL_ID(n) static ID id_##n;
NAMES(DECL_ID)

static int argi(int argc, VALUE *argv, int i) { return i < argc ? NUM2INT(rb_Integer(argv[i])) : 0; }
static double argd(int argc, VALUE *argv, int i) { return i < argc ? NUM2DBL(rb_Float(argv[i])) : 0; }
static const char *args_(int argc, VALUE *argv, int i) {
  if (i >= argc) return "";
  VALUE s = rb_obj_as_string(argv[i]);
  argv[i] = s;  // keep it alive for the duration of the call
  return StringValueCStr(argv[i]);
}

// Display list: Array of numbers (native) or the comma-joined string (web format).
static double *g_list = NULL;
static long g_listcap = 0;
static double *to_list(VALUE v, int *n) {
  long len;
  if (RB_TYPE_P(v, T_ARRAY)) {
    len = RARRAY_LEN(v);
    if (len > g_listcap) { g_listcap = len * 2; g_list = realloc(g_list, sizeof(double) * (size_t)g_listcap); }
    const VALUE *p = RARRAY_CONST_PTR(v);
    for (long i = 0; i < len; i++) {
      VALUE e = p[i];
      g_list[i] = FIXNUM_P(e) ? (double)FIX2LONG(e) : (RB_FLOAT_TYPE_P(e) ? RFLOAT_VALUE(e) : NUM2DBL(rb_Float(e)));
    }
  } else {
    VALUE s = rb_obj_as_string(v);
    const char *c = RSTRING_PTR(s);
    long slen = RSTRING_LEN(s);
    len = 1;
    for (long i = 0; i < slen; i++) if (c[i] == ',') len++;
    if (len > g_listcap) { g_listcap = len * 2; g_list = realloc(g_list, sizeof(double) * (size_t)g_listcap); }
    char *end;
    const char *q = c;
    for (long i = 0; i < len; i++) {
      g_list[i] = strtod(q, &end);
      q = end;
      if (*q == ',') q++;
    }
    if (slen == 0) len = 0;
  }
  *n = (int)len;
  return g_list;
}

static VALUE str_or_empty(const char *s) { return rb_utf8_str_new_cstr(s ? s : ""); }

static const char *const NO_EXTS[] = {NULL};

static int b64val(int c) {
  if (c >= 'A' && c <= 'Z') return c - 'A';
  if (c >= 'a' && c <= 'z') return c - 'a' + 26;
  if (c >= '0' && c <= '9') return c - '0' + 52;
  if (c == '+') return 62;
  if (c == '/') return 63;
  return -1;
}

static VALUE native_call(int argc, VALUE *argv, VALUE self) {
  (void)self;
  if (argc < 1) rb_raise(rb_eArgError, "name required");
  ID name = SYMBOL_P(argv[0]) ? SYM2ID(argv[0]) : rb_intern_str(rb_obj_as_string(argv[0]));
  argc--;
  argv++;
  char buf[2048];

  if (name == id_bmpBlt) {
    tkr_bmp_blt(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3), argi(argc, argv, 4),
                argi(argc, argv, 5), argi(argc, argv, 6), argi(argc, argv, 7), argi(argc, argv, 8));
    return Qnil;
  }
  if (name == id_bmpDrawText) {
    const char *text = args_(argc, argv, 5);
    const char *spec = args_(argc, argv, 7);
    tkr_bmp_draw_text(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3),
                      argi(argc, argv, 4), text, argi(argc, argv, 6), spec);
    return Qnil;
  }
  if (name == id_render) {
    int n;
    double *l = to_list(argc > 0 ? argv[0] : rb_ary_new(), &n);
    tkr_render(l, n);
    return Qnil;
  }
  if (name == id_frame) return rb_str_new_cstr(tkr_platform_frame() ? "reset" : "");
  if (name == id_inputUpdate) {
    int o[5];
    tkr_input_update(o);
    snprintf(buf, sizeof(buf), "%d,%d,%d,%d,%d", o[0], o[1], o[2], o[3], o[4]);
    return rb_str_new_cstr(buf);
  }
  if (name == id_bmpGetPixel) {
    int o[4];
    tkr_bmp_get_pixel(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), o);
    snprintf(buf, sizeof(buf), "%d,%d,%d,%d", o[0], o[1], o[2], o[3]);
    return rb_str_new_cstr(buf);
  }
  if (name == id_textSize) return INT2NUM(tkr_text_width(args_(argc, argv, 0), args_(argc, argv, 1)));
  if (name == id_bmpCreate) return INT2NUM(tkr_bmp_create(argi(argc, argv, 0), argi(argc, argv, 1)));
  if (name == id_bmpLoad) {
    const char *path = args_(argc, argv, 0);
    int id = tkr_bmp_load(path);
    if (!id) rb_raise(rb_eRuntimeError, "Unable to find file: %s", path);
    return INT2NUM(id);
  }
  if (name == id_bmpW || name == id_bmpH) {
    TkrBitmap *b = tkr_bmp_get(argi(argc, argv, 0));
    return INT2NUM(b ? (name == id_bmpW ? b->w : b->h) : 0);
  }
  if (name == id_bmpDispose) { tkr_bmp_dispose(argi(argc, argv, 0)); return Qnil; }
  if (name == id_bmpDup) return INT2NUM(tkr_bmp_dup(argi(argc, argv, 0)));
  if (name == id_bmpStretch) {
    tkr_bmp_stretch(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3), argi(argc, argv, 4),
                    argi(argc, argv, 5), argi(argc, argv, 6), argi(argc, argv, 7), argi(argc, argv, 8), argi(argc, argv, 9),
                    argi(argc, argv, 10));
    return Qnil;
  }
  if (name == id_bmpFill) {
    tkr_bmp_fill(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3), argi(argc, argv, 4),
                 argi(argc, argv, 5), argi(argc, argv, 6), argi(argc, argv, 7), argi(argc, argv, 8));
    return Qnil;
  }
  if (name == id_bmpGrad) {
    int c1[4] = {argi(argc, argv, 5), argi(argc, argv, 6), argi(argc, argv, 7), argi(argc, argv, 8)};
    int c2[4] = {argi(argc, argv, 9), argi(argc, argv, 10), argi(argc, argv, 11), argi(argc, argv, 12)};
    tkr_bmp_gradient(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3),
                     argi(argc, argv, 4), c1, c2, argi(argc, argv, 13));
    return Qnil;
  }
  if (name == id_bmpClear) {
    TkrBitmap *b = tkr_bmp_get(argi(argc, argv, 0));
    if (b) tkr_bmp_clear_rect(argi(argc, argv, 0), 0, 0, b->w, b->h);
    return Qnil;
  }
  if (name == id_bmpClearRect) {
    tkr_bmp_clear_rect(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3), argi(argc, argv, 4));
    return Qnil;
  }
  if (name == id_bmpSetPixel) {
    tkr_bmp_set_pixel(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2), argi(argc, argv, 3),
                      argi(argc, argv, 4), argi(argc, argv, 5), argi(argc, argv, 6));
    return Qnil;
  }
  if (name == id_bmpHue) { tkr_bmp_hue(argi(argc, argv, 0), argi(argc, argv, 1)); return Qnil; }
  if (name == id_bmpBlur) { tkr_bmp_blur(argi(argc, argv, 0)); return Qnil; }
  if (name == id_bmpRadialBlur) { tkr_bmp_radial_blur(argi(argc, argv, 0), argi(argc, argv, 1), argi(argc, argv, 2)); return Qnil; }
  if (name == id_bitmapMB) return INT2NUM((int)(tkr_bmp_memory() / 1048576));
  if (name == id_bitmapCount) return INT2NUM(tkr_bmp_count());
  if (name == id_fontExists) return INT2NUM(1);
  if (name == id_tableUpload) {
    // (id, base64 of int16 little-endian data, xs, ys, zs) or (id, raw packed string, ...)
    int id = argi(argc, argv, 0);
    VALUE s = argc > 1 ? rb_obj_as_string(argv[1]) : rb_str_new_cstr("");
    const unsigned char *p = (const unsigned char *)RSTRING_PTR(s);
    long len = RSTRING_LEN(s);
    int xs = argi(argc, argv, 2), ys = argi(argc, argv, 3), zs = argi(argc, argv, 4);
    size_t cnt = (size_t)(xs > 0 ? xs : 0) * (ys > 0 ? ys : 0) * (zs > 0 ? zs : 0);
    int16_t *data = calloc(cnt ? cnt : 1, sizeof(int16_t));
    if (!data) return Qnil;
    uint8_t *bytes = (uint8_t *)data;
    size_t nb = cnt * 2, o = 0;
    if ((size_t)len == nb && rb_enc_get_index(s) == rb_ascii8bit_encindex()) {
      memcpy(bytes, p, nb);
    } else {
      int acc = 0, bits = 0;
      for (long i = 0; i < len && o < nb; i++) {
        int v = b64val(p[i]);
        if (v < 0) continue;
        acc = (acc << 6) | v;
        bits += 6;
        if (bits >= 8) { bits -= 8; bytes[o++] = (uint8_t)((acc >> bits) & 0xff); }
      }
    }
    // data is little-endian (pack('s*') on the little-endian hosts we target)
    tkr_table_set(id, data, xs, ys, zs);
    free(data);
    return Qnil;
  }
  if (name == id_tableFree) { tkr_table_free(argi(argc, argv, 0)); return Qnil; }
  if (name == id_setFrameRate) { tkr_platform_set_frame_rate(argi(argc, argv, 0)); return Qnil; }
  if (name == id_freeze) {
    int n;
    double *l = to_list(argc > 0 ? argv[0] : rb_ary_new(), &n);
    tkr_render_freeze(l, n);
    return Qnil;
  }
  if (name == id_unfreeze) { tkr_render_unfreeze(); return Qnil; }
  if (name == id_transitionStep) {
    int n;
    double *l = to_list(argc > 0 ? argv[0] : rb_ary_new(), &n);
    tkr_render_transition(l, n, argd(argc, argv, 1), argi(argc, argv, 2), argd(argc, argv, 3) / 255.0);
    return Qnil;
  }
  if (name == id_snap) {
    int n;
    double *l = to_list(argc > 0 ? argv[0] : rb_ary_new(), &n);
    return INT2NUM(tkr_render_snap(l, n));
  }
  if (name == id_resize) {
    tkr_render_resize(argi(argc, argv, 0), argi(argc, argv, 1));
    snprintf(buf, sizeof(buf), "%dx%d", argi(argc, argv, 0), argi(argc, argv, 1));
    tkr_platform_event("resolution", buf);
    return Qnil;
  }
  if (name == id_audio) {
    const char *op = args_(argc, argv, 0);
    const char *sargs[5] = {0};
    long iargs[5] = {0};
    int n = 0;
    for (int i = 1; i < argc && n < 5; i++, n++) {
      if (RB_INTEGER_TYPE_P(argv[i]) || RB_FLOAT_TYPE_P(argv[i])) iargs[n] = NUM2LONG(rb_Integer(argv[i]));
      else sargs[n] = args_(argc, argv, i);
    }
    tkr_platform_audio(op, n, sargs, iargs);
    return Qnil;
  }
  if (name == id_bgmPos) return LONG2NUM(tkr_platform_bgm_pos());
  if (name == id_fsResolve) {
    char out[2048];
    return str_or_empty(tkr_platform_resolve(args_(argc, argv, 0), NO_EXTS, out, sizeof(out)) ? out : "");
  }
  if (name == id_loadData) {
    char out[2048];
    const char *rel = args_(argc, argv, 0);
    if (!tkr_platform_resolve(rel, NO_EXTS, out, sizeof(out))) rb_raise(rb_eRuntimeError, "not found: %s", rel);
    return str_or_empty(out);
  }
  if (name == id_isPlaceholder) return INT2NUM(0);
  if (name == id_materialize || name == id_syncFile || name == id_deleteFile) return Qnil;
  if (name == id_msgbox) { tkr_platform_msgbox(args_(argc, argv, 0)); return Qnil; }
  if (name == id_log) {
    if (argc >= 2) tkr_platform_log(args_(argc, argv, 0), args_(argc, argv, 1));
    else tkr_platform_log("info", args_(argc, argv, 0));
    return Qnil;
  }
  if (name == id_error) {
    snprintf(buf, sizeof(buf), "%s\n%s", args_(argc, argv, 0), args_(argc, argv, 1));
    tkr_platform_event("error", buf);
    return Qnil;
  }
  if (name == id_stage) { tkr_platform_event("stage", args_(argc, argv, 0)); return Qnil; }
  if (name == id_ready) { tkr_platform_event("ready", ""); return Qnil; }
  if (name == id_exit) { tkr_platform_event("exit", ""); return Qnil; }
  if (name == id_title) { tkr_platform_event("title", args_(argc, argv, 0)); return Qnil; }
  rb_raise(rb_eNotImpError, "TKRNative.call: unknown function %s", rb_id2name(name));
  return Qnil;
}

void tkr_engine_install(void) {
#define INIT_ID(n) id_##n = rb_intern(#n);
  NAMES(INIT_ID)
  VALUE m = rb_define_module("TKRNative");
  rb_define_module_function(m, "call", native_call, -1);
}

// ---- boot --------------------------------------------------------------------------
static int cmp_str(const void *a, const void *b) { return strcmp(*(char *const *)a, *(char *const *)b); }

static VALUE eval_file(VALUE arg) {
  const char *path = (const char *)arg;
  FILE *f = fopen(path, "rb");
  if (!f) rb_raise(rb_eLoadError, "cannot open %s", path);
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  VALUE src = rb_str_buf_new(n);
  rb_str_set_len(src, n);
  if (n > 0 && fread(RSTRING_PTR(src), 1, (size_t)n, f) != (size_t)n) { fclose(f); rb_raise(rb_eIOError, "read %s", path); }
  fclose(f);
  rb_enc_associate(src, rb_utf8_encoding());
  const char *base = strrchr(path, '/');
  VALUE fname = rb_sprintf("/rgss/%s", base ? base + 1 : path);
  return rb_funcall(rb_mKernel, rb_intern("eval"), 4, src, rb_eval_string("TOPLEVEL_BINDING"), fname, INT2FIX(1));
}

static void report_exception(const char *where) {
  VALUE err = rb_errinfo();
  rb_set_errinfo(Qnil);
  if (NIL_P(err)) return;
  VALUE msg = rb_funcall(err, rb_intern("full_message"), 0);
  char buf[4096];
  snprintf(buf, sizeof(buf), "%s\n%s", where, StringValueCStr(msg));
  tkr_platform_event("error", buf);
}

static const char *PRELUDE =
  "module JS; class Error < StandardError; end; end\n"
  "class Object; def await; self; end; end\n";

int tkr_engine_run(const TkrEngineConfig *cfg) {
  tkr_render_init(544, 416);
  if (chdir(cfg->game_dir) != 0) {
    tkr_platform_event("error", "Cannot open the game folder");
    return 1;
  }
  tkr_engine_install();
  int state = 0;
  char buf[256];
  snprintf(buf, sizeof(buf), "$TKR_ENGINE = %d; $TKR_NATIVE = true", cfg->engine);
  rb_eval_string_protect(buf, &state);
  rb_eval_string_protect(PRELUDE, &state);
  if (state) { report_exception("prelude"); return 1; }

  // RGSS runtime sources: web/rgss/*.rb in name order (rpg2 / rpg3 by engine), boot.rb last
  DIR *d = opendir(cfg->rgss_dir);
  if (!d) { tkr_platform_event("error", "RGSS runtime sources not found"); return 1; }
  char *names[64];
  int n = 0;
  struct dirent *e;
  while ((e = readdir(d)) && n < 64) {
    size_t l = strlen(e->d_name);
    if (l < 4 || strcmp(e->d_name + l - 3, ".rb") != 0) continue;
    if (cfg->engine == 3 && strncmp(e->d_name, "rpg2", 4) == 0) continue;
    if (cfg->engine == 2 && strncmp(e->d_name, "rpg3", 4) == 0) continue;
    names[n++] = strdup(e->d_name);
  }
  closedir(d);
  qsort(names, (size_t)n, sizeof(char *), cmp_str);
  char path[2048];
  for (int i = 0; i < n; i++) {
    if (!state) {
      snprintf(path, sizeof(path), "%s/%s", cfg->rgss_dir, names[i]);
      tkr_platform_event("stage", names[i]);
      rb_protect(eval_file, (VALUE)path, &state);
      if (state) {
        snprintf(buf, sizeof(buf), "runtime load error: %s", names[i]);
        report_exception(buf);
      }
    }
    free(names[i]);
  }
  if (state) return 1;
  tkr_platform_event("stage", "runtime loaded (native)");
  rb_eval_string_protect("TKRBoot.run", &state);
  if (state) { report_exception("fatal"); return 1; }
  return 0;
}

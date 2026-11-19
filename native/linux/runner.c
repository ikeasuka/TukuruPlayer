// Headless Linux runner for the native engine (development / CI test).
//   runner <game-dir> <rgss-dir> [--engine 2|3] [--frames N] [--shots out-prefix] [--every N]
//          [--input "frame:BUTTON[:len],..."] [--font path.ttf]
// Prints events to stdout; saves PNG screenshots of the composed frame.
#include "../core/tkr.h"
#include "../core/tkr_engine.h"
#include "../core/tkr_platform.h"
#include "../core/tkr_fs.h"
#include <ruby.h>
#include <ctype.h>
#include <dirent.h>
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>
#include <time.h>

#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "../core/third_party/stb_image_write.h"
#define STB_TRUETYPE_IMPLEMENTATION
#include "../core/third_party/stb_truetype.h"

static char g_game[4096];
static int g_frames = 600, g_every = 0, g_frame = 0;
static const char *g_shots = NULL;
static const char *g_input = "";
static double g_t0;

static double now(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec + ts.tv_nsec / 1e9;
}

// ---- files ----------------------------------------------------------------------------
int tkr_platform_resolve(const char *rel, const char *const *exts, char *out, size_t outlen) {
  return tkr_fs_resolve(rel, exts, out, outlen);
}

// ---- text (stb_truetype) ----------------------------------------------------------------
static stbtt_fontinfo g_font;
static unsigned char *g_fontdata = NULL;

static void load_font(const char *path) {
  FILE *f = fopen(path, "rb");
  if (!f) { fprintf(stderr, "font not found: %s\n", path); exit(1); }
  fseek(f, 0, SEEK_END);
  long n = ftell(f);
  fseek(f, 0, SEEK_SET);
  g_fontdata = malloc((size_t)n);
  if (fread(g_fontdata, 1, (size_t)n, f) != (size_t)n) exit(1);
  fclose(f);
  stbtt_InitFont(&g_font, g_fontdata, stbtt_GetFontOffsetForIndex(g_fontdata, 0));
}

static int utf8_next(const char **s) {
  const unsigned char *p = (const unsigned char *)*s;
  int c = *p;
  int n = c < 0x80 ? 1 : c < 0xe0 ? 2 : c < 0xf0 ? 3 : 4;
  int cp = n == 1 ? c : n == 2 ? (c & 0x1f) : n == 3 ? (c & 0x0f) : (c & 0x07);
  for (int i = 1; i < n; i++) { if (!p[i]) { n = i; break; } cp = (cp << 6) | (p[i] & 0x3f); }
  *s += n;
  return cp;
}

double tkr_platform_text(const TkrFont *f, const char *utf8, uint8_t *mask, int mw, int mh,
                         double origin, double baseline, double *ascent, double *descent) {
  float scale = stbtt_ScaleForMappingEmToPixels(&g_font, (float)f->px);
  int asc, desc, gap;
  stbtt_GetFontVMetrics(&g_font, &asc, &desc, &gap);
  *ascent = asc * scale;
  *descent = -desc * scale;
  double x = 0;
  const char *s = utf8;
  while (*s) {
    int cp = utf8_next(&s);
    int adv, lsb;
    stbtt_GetCodepointHMetrics(&g_font, cp, &adv, &lsb);
    if (mask) {
      int x0, y0, x1, y1;
      float sx = (float)(origin + x - floor(origin + x));
      stbtt_GetCodepointBitmapBoxSubpixel(&g_font, cp, scale, scale, sx, 0, &x0, &y0, &x1, &y1);
      int gw = x1 - x0, gh = y1 - y0;
      if (gw > 0 && gh > 0) {
        unsigned char *g = calloc((size_t)gw * gh, 1);
        stbtt_MakeCodepointBitmapSubpixel(&g_font, g, gw, gh, gw, scale, scale, sx, 0, cp);
        int bx = (int)floor(origin + x) + x0, by = (int)lround(baseline) + y0;
        for (int j = 0; j < gh; j++) {
          int yy = by + j;
          if (yy < 0 || yy >= mh) continue;
          for (int i = 0; i < gw; i++) {
            int xx = bx + i;
            if (xx < 0 || xx >= mw) continue;
            int v = mask[yy * mw + xx] + g[j * gw + i];
            mask[yy * mw + xx] = (uint8_t)(v > 255 ? 255 : v);
          }
        }
        free(g);
      }
    }
    x += adv * scale;
  }
  return x;
}

// ---- events ---------------------------------------------------------------------------
void tkr_platform_log(const char *level, const char *msg) { printf("[%s] %s\n", level, msg); }

void tkr_platform_event(const char *name, const char *text) {
  if (strcmp(name, "error") == 0) printf("ERROR %s\n", text);
  else printf("[%s] %s\n", name, text);
}

void tkr_platform_msgbox(const char *text) { printf("[msgbox] %s\n", text); }
void tkr_platform_set_frame_rate(int fps) { printf("[frame_rate] %d\n", fps); }
long tkr_platform_bgm_pos(void) { return 0; }

void tkr_platform_audio(const char *op, int argc, const char *const *s, const long *v) {
  printf("[audio] %s", op);
  for (int i = 0; i < argc; i++) {
    if (s[i]) printf(" %s", s[i]);
    else printf(" %ld", v[i]);
  }
  printf("\n");
}

// input script: "frame:BUTTON[:len],..."
static const char *BTN_NAMES[] = {"DOWN", "LEFT", "RIGHT", "UP", "A", "B", "C", "X", "Y", "Z", "L", "R",
                                  "SHIFT", "CTRL", "ALT", "F5", "F6", "F7", "F8", "F9", NULL};
static uint32_t input_for_frame(int frame) {
  uint32_t mask = 0;
  const char *p = g_input;
  while (*p) {
    int f = atoi(p);
    const char *c = strchr(p, ':');
    if (!c) break;
    c++;
    char name[16] = {0};
    int k = 0;
    while (*c && *c != ',' && *c != ':' && k < 15) name[k++] = *c++;
    int len = 1;
    if (*c == ':') { c++; len = atoi(c); while (*c && *c != ',') c++; }
    if (frame >= f && frame < f + len) {
      for (int b = 0; BTN_NAMES[b]; b++) if (strcasecmp(BTN_NAMES[b], name) == 0) mask |= 1u << b;
    }
    p = *c == ',' ? c + 1 : c;
  }
  return mask;
}

static void shot(const char *tag) {
  if (!g_shots) return;
  char path[1024];
  snprintf(path, sizeof(path), "%s-%s.png", g_shots, tag);
  stbi_write_png(path, tkr_render_width(), tkr_render_height(), 4, tkr_render_output(), tkr_render_width() * 4);
  printf("[shot] %s\n", path);
}

int tkr_platform_frame(void) {
  g_frame++;
  if (g_every && g_frame % g_every == 0) {
    char tag[32];
    snprintf(tag, sizeof(tag), "%05d", g_frame);
    shot(tag);
  }
  if (g_frame % 300 == 0) {
    printf("[perf] frame %d: %.1f fps (headless, unthrottled), bitmaps %d (%zu MB)\n", g_frame,
           g_frame / (now() - g_t0), tkr_bmp_count(), tkr_bmp_memory() >> 20);
  }
  tkr_input_set_mask(input_for_frame(g_frame));
  if (g_frame >= g_frames) {
    shot("final");
    printf("RUN DONE %d frames in %.2fs\n", g_frame, now() - g_t0);
    fflush(stdout);
    exit(0);
  }
  return 0;
}

int main(int argc, char **argv) {
  if (argc < 3) { fprintf(stderr, "usage: runner <game-dir> <rgss-dir> [options]\n"); return 2; }
  realpath(argv[1], g_game);
  char rgss[4096];
  realpath(argv[2], rgss);
  int engine = 3;
  const char *font = "/usr/share/fonts/truetype/fonts-japanese-gothic.ttf";
  for (int i = 3; i + 1 < argc; i += 2) {
    if (!strcmp(argv[i], "--engine")) engine = atoi(argv[i + 1]);
    else if (!strcmp(argv[i], "--frames")) g_frames = atoi(argv[i + 1]);
    else if (!strcmp(argv[i], "--shots")) g_shots = argv[i + 1];
    else if (!strcmp(argv[i], "--every")) g_every = atoi(argv[i + 1]);
    else if (!strcmp(argv[i], "--input")) g_input = argv[i + 1];
    else if (!strcmp(argv[i], "--font")) font = argv[i + 1];
  }
  setvbuf(stdout, NULL, _IOLBF, 0);
  load_font(font);
  tkr_fs_set_roots(g_game, NULL, 0);
  g_t0 = now();
  // RGSS games may nest deeply (Windows RGSS allows >10000 calls); Ruby's default is ~1MB.
  setenv("RUBY_THREAD_VM_STACK_SIZE", "4194304", 1);
  setenv("RUBY_FIBER_VM_STACK_SIZE", "1048576", 1);
  ruby_sysinit(&argc, &argv);
  {
    RUBY_INIT_STACK;
    ruby_init();
    // ruby_options also loads the builtin .rb definitions (Integer#to_i, Array#each ...);
    // ruby_init alone does not.
    char *rargv[] = {"tkr", "--disable-gems", "-e", "nil", NULL};
    ruby_options(4, rargv);
    ruby_script("tkr");
    TkrEngineConfig cfg = {g_game, rgss, engine, getenv("TKR_LOG_STDOUT") != NULL};
    int r = tkr_engine_run(&cfg);
    printf("ENGINE EXIT %d after %d frames\n", r, g_frame);
    return r;
  }
}

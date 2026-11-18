// Software compositor for the RGSS display list (C port of web/src/scene.js, gl.js and
// tilemap.js). Draws into an RGBA screen buffer at game resolution; the host scales it to
// the device screen. All math mirrors the WebGL shaders so both runtimes look the same.
#include "tkr.h"
#include "tkr_platform.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

enum { T_SPRITE = 1, T_PLANE = 2, T_WINDOW = 3, T_TILEMAP = 4, T_VIEWPORT = 5 };
static const int REC_LEN[6] = {0, 32, 19, 31, 17, 22};

typedef struct { int x, y, w, h; } Rect;

static int W = 544, H = 416;
static uint8_t *g_screen = NULL;   // scene being drawn
static uint8_t *g_out = NULL;      // final output (brightness / freeze / transition applied)
static uint8_t *g_frozen = NULL;   // frozen frame
static int g_is_frozen = 0;
static double g_brightness = 255;

// ---- tables ---------------------------------------------------------------------------
typedef struct { int16_t *data; int xs, ys, zs; } Table;
static Table *g_tables = NULL;
static int g_tcap = 0;

void tkr_table_set(int id, const int16_t *data, int xs, int ys, int zs) {
  if (id <= 0) return;
  if (id >= g_tcap) {
    int n = g_tcap ? g_tcap : 64;
    while (n <= id) n *= 2;
    Table *t = realloc(g_tables, sizeof(Table) * (size_t)n);
    if (!t) return;
    memset(t + g_tcap, 0, sizeof(Table) * (size_t)(n - g_tcap));
    g_tables = t;
    g_tcap = n;
  }
  Table *t = &g_tables[id];
  size_t cnt = (size_t)(xs > 0 ? xs : 0) * (ys > 0 ? ys : 0) * (zs > 0 ? zs : 0);
  free(t->data);
  t->data = cnt ? malloc(cnt * sizeof(int16_t)) : NULL;
  if (t->data) memcpy(t->data, data, cnt * sizeof(int16_t));
  t->xs = xs; t->ys = ys; t->zs = zs;
}

void tkr_table_free(int id) {
  if (id <= 0 || id >= g_tcap) return;
  free(g_tables[id].data);
  memset(&g_tables[id], 0, sizeof(Table));
}

static Table *table_get(int id) {
  if (id <= 0 || id >= g_tcap || !g_tables[id].data) return NULL;
  return &g_tables[id];
}

// ---- buffers ----------------------------------------------------------------------------
static void alloc_buffers(void) {
  size_t n = (size_t)W * H * 4;
  free(g_screen); free(g_out); free(g_frozen);
  g_screen = calloc(n, 1);
  g_out = calloc(n, 1);
  g_frozen = calloc(n, 1);
  for (size_t i = 3; i < n; i += 4) g_out[i] = g_frozen[i] = g_screen[i] = 255;
}

void tkr_render_init(int w, int h) { W = w; H = h; alloc_buffers(); g_is_frozen = 0; }
void tkr_render_resize(int w, int h) {
  if (w == W && h == H && g_screen) return;
  W = w; H = h; alloc_buffers();
}
int tkr_render_width(void) { return W; }
int tkr_render_height(void) { return H; }
const uint8_t *tkr_render_output(void) { return g_out; }

static Rect rect_isect(Rect a, Rect b) {
  int x = a.x > b.x ? a.x : b.x, y = a.y > b.y ? a.y : b.y;
  int x2 = (a.x + a.w < b.x + b.w) ? a.x + a.w : b.x + b.w;
  int y2 = (a.y + a.h < b.y + b.h) ? a.y + a.h : b.y + b.h;
  Rect r = {x, y, x2 > x ? x2 - x : 0, y2 > y ? y2 - y : 0};
  return r;
}

// ---- pixel shading (same as FS_SPRITE) ---------------------------------------------
typedef struct {
  int opacity;          // 0..255
  int blend;            // 0 normal, 1 add, 2 subtract
  int color[4];         // blend color (0..255)
  int tone[4];          // -255..255 rgb, 0..255 gray
  int plain;            // no tone / color: fast path
} Shade;

static void shade_init(Shade *s, double opacity, const double *color, const double *tone, int blend) {
  memset(s, 0, sizeof(*s));
  int o = (int)lround(opacity * 255);
  s->opacity = o < 0 ? 0 : (o > 255 ? 255 : o);
  s->blend = blend;
  if (color) for (int i = 0; i < 4; i++) s->color[i] = (int)color[i];
  if (tone) for (int i = 0; i < 4; i++) s->tone[i] = (int)tone[i];
  s->plain = s->color[3] <= 0 && !s->tone[0] && !s->tone[1] && !s->tone[2] && s->tone[3] <= 0;
}

static inline int clamp255(int v) { return v < 0 ? 0 : (v > 255 ? 255 : v); }

// Shade texel p (straight RGBA) into rgb out; returns alpha 0..255 (before opacity).
static inline void shade_rgb(const Shade *s, const uint8_t *p, int *r, int *g, int *b) {
  int R = p[0], G = p[1], B = p[2];
  if (!s->plain) {
    if (s->tone[3] > 0) {
      int l = (R * 299 + G * 587 + B * 114) / 1000;
      int k = s->tone[3];
      R += (l - R) * k / 255; G += (l - G) * k / 255; B += (l - B) * k / 255;
    }
    R += s->tone[0]; G += s->tone[1]; B += s->tone[2];
    if (s->color[3] > 0) {
      int k = s->color[3];
      R += (s->color[0] - R) * k / 255; G += (s->color[1] - G) * k / 255; B += (s->color[2] - B) * k / 255;
    }
    R = clamp255(R); G = clamp255(G); B = clamp255(B);
  }
  *r = R; *g = G; *b = B;
}

static inline void put_px(uint8_t *d, int blend, int r, int g, int b, int a) {
  if (a <= 0) return;
  if (blend == 0) {
    if (a >= 255) { d[0] = (uint8_t)r; d[1] = (uint8_t)g; d[2] = (uint8_t)b; return; }
    d[0] = (uint8_t)(d[0] + ((r - d[0]) * a + 127) / 255);
    d[1] = (uint8_t)(d[1] + ((g - d[1]) * a + 127) / 255);
    d[2] = (uint8_t)(d[2] + ((b - d[2]) * a + 127) / 255);
  } else if (blend == 1) {
    d[0] = (uint8_t)clamp255(d[0] + (r * a + 127) / 255);
    d[1] = (uint8_t)clamp255(d[1] + (g * a + 127) / 255);
    d[2] = (uint8_t)clamp255(d[2] + (b * a + 127) / 255);
  } else {
    d[0] = (uint8_t)clamp255(d[0] - (r * a + 127) / 255);
    d[1] = (uint8_t)clamp255(d[1] - (g * a + 127) / 255);
    d[2] = (uint8_t)clamp255(d[2] - (b * a + 127) / 255);
  }
}

// Draw bitmap region (sx,sy,sw,sh) scaled into dest rect (dx,dy,dw,dh), nearest sampling.
static void draw_scaled(TkrBitmap *b, double sx, double sy, double sw, double sh,
                        double dx, double dy, double dw, double dh, const Shade *s, Rect clip) {
  if (!b || dw <= 0 || dh <= 0 || sw <= 0 || sh <= 0 || s->opacity <= 0) return;
  int x0 = (int)ceil(dx - 0.5), x1 = (int)ceil(dx + dw - 0.5);
  int y0 = (int)ceil(dy - 0.5), y1 = (int)ceil(dy + dh - 0.5);
  if (x0 < clip.x) x0 = clip.x;
  if (y0 < clip.y) y0 = clip.y;
  if (x1 > clip.x + clip.w) x1 = clip.x + clip.w;
  if (y1 > clip.y + clip.h) y1 = clip.y + clip.h;
  if (x0 >= x1 || y0 >= y1) return;
  double fx = sw / dw, fy = sh / dh;
  for (int y = y0; y < y1; y++) {
    int ty = (int)floor(sy + (y + 0.5 - dy) * fy);
    if (ty < 0 || ty >= b->h) continue;
    const uint8_t *srow = b->px + (size_t)ty * b->w * 4;
    uint8_t *drow = g_screen + (size_t)y * W * 4;
    for (int x = x0; x < x1; x++) {
      int tx = (int)floor(sx + (x + 0.5 - dx) * fx);
      if (tx < 0 || tx >= b->w) continue;
      const uint8_t *p = srow + tx * 4;
      if (!p[3]) continue;
      int r, g, bb;
      shade_rgb(s, p, &r, &g, &bb);
      put_px(drow + x * 4, s->blend, r, g, bb, (p[3] * s->opacity + 127) / 255);
    }
  }
}

static void fill_rect(int x, int y, int w, int h, int r, int g, int b, int a, Rect clip) {
  Rect rr = rect_isect((Rect){x, y, w, h}, clip);
  for (int j = rr.y; j < rr.y + rr.h; j++) {
    uint8_t *row = g_screen + ((size_t)j * W + rr.x) * 4;
    for (int i = 0; i < rr.w; i++) put_px(row + i * 4, 0, r, g, b, a);
  }
}

// ---- sprite --------------------------------------------------------------------------
static void draw_sprite(const double *a, double offX, double offY, Rect clip) {
  TkrBitmap *b = tkr_bmp_get((int)a[4]);
  if (!b) return;
  double x = a[5] + offX, y = a[6] + offY, ox = a[7], oy = a[8];
  double zx = a[9], zy = a[10], angle = a[11];
  int mirror = a[12] != 0;
  int rx = (int)a[13], ry = (int)a[14], rw = (int)a[15], rh = (int)a[16];
  double opacity = a[17] / 255.0;
  int blend = (int)a[18];
  int bush = (int)a[19];
  int bushOp = (int)a[20];
  double color[4] = {a[21], a[22], a[23], a[24]};
  double tone[4] = {a[25], a[26], a[27], a[28]};
  double waveAmp = a[29], waveLen = a[30], wavePhase = a[31];
  if (opacity <= 0 || zx == 0 || zy == 0 || rw <= 0 || rh <= 0) return;
  Shade s;
  shade_init(&s, opacity, color, tone, blend);
  int bushRow = bush > 0 ? ry + rh - bush : 1 << 30;
  double rad = -angle * M_PI / 180.0, c = cos(rad), sn = sin(rad);
  // bounding box of the transformed rect
  double cx[4], cy[4];
  double L[4][2] = {{-ox * zx, -oy * zy}, {(rw - ox) * zx, -oy * zy}, {-ox * zx, (rh - oy) * zy}, {(rw - ox) * zx, (rh - oy) * zy}};
  double minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
  for (int i = 0; i < 4; i++) {
    cx[i] = x + L[i][0] * c - L[i][1] * sn;
    cy[i] = y + L[i][0] * sn + L[i][1] * c;
    if (cx[i] < minx) minx = cx[i];
    if (cx[i] > maxx) maxx = cx[i];
    if (cy[i] < miny) miny = cy[i];
    if (cy[i] > maxy) maxy = cy[i];
  }
  int wave = waveAmp > 0 && angle == 0;
  if (wave) { minx -= fabs(waveAmp * zx); maxx += fabs(waveAmp * zx); }
  int x0 = (int)floor(minx), x1 = (int)ceil(maxx), y0 = (int)floor(miny), y1 = (int)ceil(maxy);
  if (x0 < clip.x) x0 = clip.x;
  if (y0 < clip.y) y0 = clip.y;
  if (x1 > clip.x + clip.w) x1 = clip.x + clip.w;
  if (y1 > clip.y + clip.h) y1 = clip.y + clip.h;
  if (x0 >= x1 || y0 >= y1) return;
  int axis = angle == 0;
  for (int py = y0; py < y1; py++) {
    uint8_t *drow = g_screen + (size_t)py * W * 4;
    double dyc = py + 0.5 - y;
    double off = 0;
    if (wave) {
      double lv = dyc / zy + oy;
      int strip = (int)floor(lv / 2) * 2;
      double ph = (wavePhase + (strip * 360.0) / (waveLen > 1 ? waveLen : 1)) * M_PI / 180.0;
      off = waveAmp * sin(ph);
    }
    for (int px = x0; px < x1; px++) {
      double dxc = px + 0.5 - x;
      double lu, lv;
      if (axis) { lu = dxc / zx + ox - off; lv = dyc / zy + oy; }
      else {
        double qx = dxc * c + dyc * sn, qy = -dxc * sn + dyc * c;
        lu = qx / zx + ox; lv = qy / zy + oy;
      }
      if (lu < 0 || lv < 0 || lu >= rw || lv >= rh) continue;
      int iu = (int)lu, iv = (int)lv;
      int tx = rx + (mirror ? rw - 1 - iu : iu), ty = ry + iv;
      if (tx < 0 || ty < 0 || tx >= b->w || ty >= b->h) continue;
      const uint8_t *p = b->px + ((size_t)ty * b->w + tx) * 4;
      if (!p[3]) continue;
      int al = (p[3] * s.opacity + 127) / 255;
      if (ty >= bushRow) al = (al * bushOp + 127) / 255;
      int r, g, bb;
      shade_rgb(&s, p, &r, &g, &bb);
      put_px(drow + px * 4, s.blend, r, g, bb, al);
    }
  }
}

// ---- plane ---------------------------------------------------------------------------
static void draw_plane(const double *a, Rect area, Rect clip) {
  TkrBitmap *b = tkr_bmp_get((int)a[4]);
  if (!b) return;
  double ox = a[5], oy = a[6], zx = a[7] ? a[7] : 1, zy = a[8] ? a[8] : 1;
  double opacity = a[9] / 255.0;
  int blend = (int)a[10];
  double color[4] = {a[11], a[12], a[13], a[14]};
  double tone[4] = {a[15], a[16], a[17], a[18]};
  if (opacity <= 0) return;
  Shade s;
  shade_init(&s, opacity, color, tone, blend);
  for (int py = clip.y; py < clip.y + clip.h; py++) {
    double v = (py + 0.5 - area.y + oy) / zy;
    int ty = (int)floor(fmod(floor(v), b->h));
    if (ty < 0) ty += b->h;
    const uint8_t *srow = b->px + (size_t)ty * b->w * 4;
    uint8_t *drow = g_screen + (size_t)py * W * 4;
    for (int px = clip.x; px < clip.x + clip.w; px++) {
      double u = (px + 0.5 - area.x + ox) / zx;
      int tx = (int)fmod(floor(u), b->w);
      if (tx < 0) tx += b->w;
      const uint8_t *p = srow + tx * 4;
      if (!p[3]) continue;
      int r, g, bb;
      shade_rgb(&s, p, &r, &g, &bb);
      put_px(drow + px * 4, s.blend, r, g, bb, (p[3] * s.opacity + 127) / 255);
    }
  }
}

// ---- window (RGSS2/RGSS3 skin layout) ----------------------------------------------------
static void S_(TkrBitmap *skin, double sx, double sy, double sw, double sh, double dx, double dy, double dw, double dh,
               const Shade *s, Rect clip) {
  draw_scaled(skin, sx, sy, sw, sh, dx, dy, dw, dh, s, clip);
}

static void draw_window(const double *a, double offX, double offY, Rect clip) {
  TkrBitmap *skin = tkr_bmp_get((int)a[4]);
  TkrBitmap *contents = tkr_bmp_get((int)a[5]);
  double x = a[6] + offX, y = a[7] + offY;
  int w = (int)a[8], h = (int)a[9];
  double ox = a[10], oy = a[11];
  int pad = (int)a[12], padB = (int)a[13];
  double opacity = a[14] / 255.0, backOp = a[15] / 255.0, contOp = a[16] / 255.0;
  int openness = (int)a[17];
  int cx = (int)a[18], cy = (int)a[19], cw = (int)a[20], ch = (int)a[21];
  int active = a[22] != 0, pause = a[23] != 0, arrows = a[24] != 0;
  double tone[4] = {a[25], a[26], a[27], a[28]};
  int anim = (int)a[29];
  int cursorRel = a[30] != 0;
  if (w <= 0 || h <= 0 || openness <= 0) return;
  int hh = (int)lround((double)h * openness / 255);
  double yy = y + lround((h - hh) / 2.0);
  Shade s;
  if (skin && hh > 0) {
    double bx = x + 2, by = yy + 2, bw = w - 4, bh = hh - 4;
    if (bw > 0 && bh > 0 && backOp * opacity > 0) {
      shade_init(&s, backOp * opacity, NULL, tone, 0);
      S_(skin, 0, 0, 64, 64, bx, by, bw, bh, &s, clip);
      for (int ty = 0; ty < bh; ty += 64) {
        int th2 = bh - ty < 64 ? (int)bh - ty : 64;
        for (int tx = 0; tx < bw; tx += 64) {
          int tw2 = bw - tx < 64 ? (int)bw - tx : 64;
          S_(skin, 0, 64, tw2, th2, bx + tx, by + ty, tw2, th2, &s, clip);
        }
      }
    }
    if (opacity > 0) {
      shade_init(&s, opacity, NULL, NULL, 0);
      int c = 16;
      int fh = c < hh / 2 ? c : hh / 2, fw = c < w / 2 ? c : w / 2;
      S_(skin, 64, 0, fw, fh, x, yy, fw, fh, &s, clip);
      S_(skin, 128 - fw, 0, fw, fh, x + w - fw, yy, fw, fh, &s, clip);
      S_(skin, 64, 64 - fh, fw, fh, x, yy + hh - fh, fw, fh, &s, clip);
      S_(skin, 128 - fw, 64 - fh, fw, fh, x + w - fw, yy + hh - fh, fw, fh, &s, clip);
      S_(skin, 64 + c, 0, 32, fh, x + fw, yy, w - fw * 2, fh, &s, clip);
      S_(skin, 64 + c, 64 - fh, 32, fh, x + fw, yy + hh - fh, w - fw * 2, fh, &s, clip);
      S_(skin, 64, c, fw, 32, x, yy + fh, fw, hh - fh * 2, &s, clip);
      S_(skin, 128 - fw, c, fw, 32, x + w - fw, yy + fh, fw, hh - fh * 2, &s, clip);
    }
  }
  if (openness < 255) return;
  Rect inner = {(int)x + pad, (int)y + pad, w - pad * 2, h - pad - padB};
  Rect innerClip = rect_isect(inner, clip);
  if (skin && cw > 0 && ch > 0 && innerClip.w > 0 && innerClip.h > 0) {
    double alpha;
    if (active) {
      int t = anim % 40;
      alpha = (255 - (t < 20 ? t : 40 - t) * 6) / 255.0;
    } else {
      alpha = 0.6;
    }
    double dx = x + pad + cx - (cursorRel ? ox : 0);
    double dy = y + pad + cy - (cursorRel ? oy : 0);
    shade_init(&s, alpha * contOp, NULL, NULL, 0);
    int b = 4;
    int bw = b < cw / 2 ? b : cw / 2, bh = b < ch / 2 ? b : ch / 2;
    S_(skin, 64, 64, bw, bh, dx, dy, bw, bh, &s, innerClip);
    S_(skin, 96 - bw, 64, bw, bh, dx + cw - bw, dy, bw, bh, &s, innerClip);
    S_(skin, 64, 96 - bh, bw, bh, dx, dy + ch - bh, bw, bh, &s, innerClip);
    S_(skin, 96 - bw, 96 - bh, bw, bh, dx + cw - bw, dy + ch - bh, bw, bh, &s, innerClip);
    S_(skin, 64 + b, 64, 32 - b * 2, bh, dx + bw, dy, cw - bw * 2, bh, &s, innerClip);
    S_(skin, 64 + b, 96 - bh, 32 - b * 2, bh, dx + bw, dy + ch - bh, cw - bw * 2, bh, &s, innerClip);
    S_(skin, 64, 64 + b, bw, 32 - b * 2, dx, dy + bh, bw, ch - bh * 2, &s, innerClip);
    S_(skin, 96 - bw, 64 + b, bw, 32 - b * 2, dx + cw - bw, dy + bh, bw, ch - bh * 2, &s, innerClip);
    S_(skin, 64 + b, 64 + b, 32 - b * 2, 32 - b * 2, dx + bw, dy + bh, cw - bw * 2, ch - bh * 2, &s, innerClip);
  }
  if (contents && contOp > 0 && innerClip.w > 0 && innerClip.h > 0) {
    shade_init(&s, contOp, NULL, NULL, 0);
    draw_scaled(contents, 0, 0, contents->w, contents->h, x + pad - ox, y + pad - oy, contents->w, contents->h, &s, innerClip);
  }
  if (!skin) return;
  shade_init(&s, 1, NULL, NULL, 0);
  if (arrows && contents) {
    int iw = w - pad * 2, ih = h - pad - padB;
    if (oy > 0) S_(skin, 88, 16, 16, 8, x + w / 2.0 - 8, y + 4, 16, 8, &s, clip);
    if (contents->h - oy > ih) S_(skin, 88, 40, 16, 8, x + w / 2.0 - 8, y + h - 12, 16, 8, &s, clip);
    if (ox > 0) S_(skin, 80, 24, 8, 16, x + 4, y + h / 2.0 - 8, 8, 16, &s, clip);
    if (contents->w - ox > iw) S_(skin, 104, 24, 8, 16, x + w - 12, y + h / 2.0 - 8, 8, 16, &s, clip);
  }
  if (pause) {
    int f = (anim / 8) % 4;
    S_(skin, 96 + (f % 2) * 16, 64 + (f / 2) * 16, 16, 16, x + w / 2.0 - 8, y + h - 16, 16, 16, &s, clip);
  }
}

// ---- tilemap (VX / VX Ace autotiles) -----------------------------------------------------
#define A1 2048
#define A2 2816
#define A3 4352
#define A4 5888
#define A5 1536
#define TMAX 8192

static const unsigned char FLOOR[48][4][2] = {
  {{2,4},{1,4},{2,3},{1,3}},{{2,0},{1,4},{2,3},{1,3}},{{2,4},{3,0},{2,3},{1,3}},{{2,0},{3,0},{2,3},{1,3}},
  {{2,4},{1,4},{2,3},{3,1}},{{2,0},{1,4},{2,3},{3,1}},{{2,4},{3,0},{2,3},{3,1}},{{2,0},{3,0},{2,3},{3,1}},
  {{2,4},{1,4},{2,1},{1,3}},{{2,0},{1,4},{2,1},{1,3}},{{2,4},{3,0},{2,1},{1,3}},{{2,0},{3,0},{2,1},{1,3}},
  {{2,4},{1,4},{2,1},{3,1}},{{2,0},{1,4},{2,1},{3,1}},{{2,4},{3,0},{2,1},{3,1}},{{2,0},{3,0},{2,1},{3,1}},
  {{0,4},{1,4},{0,3},{1,3}},{{0,4},{3,0},{0,3},{1,3}},{{0,4},{1,4},{0,3},{3,1}},{{0,4},{3,0},{0,3},{3,1}},
  {{2,2},{1,2},{2,3},{1,3}},{{2,2},{1,2},{2,3},{3,1}},{{2,2},{1,2},{2,1},{1,3}},{{2,2},{1,2},{2,1},{3,1}},
  {{2,4},{3,4},{2,3},{3,3}},{{2,4},{3,4},{2,1},{3,3}},{{2,0},{3,4},{2,3},{3,3}},{{2,0},{3,4},{2,1},{3,3}},
  {{2,4},{1,4},{2,5},{1,5}},{{2,0},{1,4},{2,5},{1,5}},{{2,4},{3,0},{2,5},{1,5}},{{2,0},{3,0},{2,5},{1,5}},
  {{0,4},{3,4},{0,3},{3,3}},{{2,2},{1,2},{2,5},{1,5}},{{0,2},{1,2},{0,3},{1,3}},{{0,2},{1,2},{0,3},{3,1}},
  {{2,2},{3,2},{2,3},{3,3}},{{2,2},{3,2},{2,1},{3,3}},{{2,4},{3,4},{2,5},{3,5}},{{2,0},{3,4},{2,5},{3,5}},
  {{0,4},{1,4},{0,5},{1,5}},{{0,4},{3,0},{0,5},{1,5}},{{0,2},{3,2},{0,3},{3,3}},{{0,2},{1,2},{0,5},{1,5}},
  {{0,4},{3,4},{0,5},{3,5}},{{2,2},{3,2},{2,5},{3,5}},{{0,2},{3,2},{0,5},{3,5}},{{0,0},{1,0},{0,1},{1,1}},
};
static const unsigned char WALL[16][4][2] = {
  {{2,2},{1,2},{2,1},{1,1}},{{0,2},{1,2},{0,1},{1,1}},{{2,0},{1,0},{2,1},{1,1}},{{0,0},{1,0},{0,1},{1,1}},
  {{2,2},{3,2},{2,1},{3,1}},{{0,2},{3,2},{0,1},{3,1}},{{2,0},{3,0},{2,1},{3,1}},{{0,0},{3,0},{0,1},{3,1}},
  {{2,2},{1,2},{2,3},{1,3}},{{0,2},{1,2},{0,3},{1,3}},{{2,0},{1,0},{2,3},{1,3}},{{0,0},{1,0},{0,3},{1,3}},
  {{2,2},{3,2},{2,3},{3,3}},{{0,2},{3,2},{0,3},{3,3}},{{2,0},{3,0},{2,3},{3,3}},{{0,0},{3,0},{0,3},{3,3}},
};
static const unsigned char WATERFALL[4][4][2] = {
  {{2,0},{1,0},{2,1},{1,1}},{{0,0},{1,0},{0,1},{1,1}},{{2,0},{3,0},{2,1},{3,1}},{{0,0},{3,0},{0,1},{3,1}},
};

// A tile quad, drawn in the order emitted.
typedef struct { short set; short sx, sy, sw, sh; short dx, dy, dw, dh; } Quad;
typedef struct { Quad *q; int n, cap; } QList;
typedef struct { int dx, dy, bits; } ShadowQ;

static void ql_push(QList *l, int set, int sx, int sy, int sw, int sh, int dx, int dy, int dw, int dh) {
  if (l->n >= l->cap) {
    int nc = l->cap ? l->cap * 2 : 256;
    Quad *q = realloc(l->q, sizeof(Quad) * (size_t)nc);
    if (!q) return;
    l->q = q; l->cap = nc;
  }
  l->q[l->n++] = (Quad){(short)set, (short)sx, (short)sy, (short)sw, (short)sh, (short)dx, (short)dy, (short)dw, (short)dh};
}

static void draw_normal_tile(QList *l, int id, int dx, int dy) {
  int set;
  if (id >= A5 && id < A5 + 128) set = 4;
  else if (id < 1024) set = 5 + id / 256;
  else return;
  int sx = (((id / 128) % 2) * 8 + (id % 8)) * 32;
  int sy = (((id % 256) / 8) % 16) * 32;
  ql_push(l, set, sx, sy, 32, 32, dx, dy, 32, 32);
}

static void draw_autotile(QList *l, int id, int dx, int dy, int frame, const Table *flags) {
  const unsigned char (*table)[4][2] = FLOOR;
  int ntable = 48;
  int kind = (id - A1) / 48, shape = (id - A1) % 48;
  int tx = kind % 8, ty = kind / 8;
  int bx = 0, by = 0, set = 0, isTable = 0;
  if (id < A2) {
    static const int WI[4] = {0, 1, 2, 1};
    int wi = WI[frame % 4];
    set = 0;
    if (kind == 0) { bx = wi * 2; by = 0; }
    else if (kind == 1) { bx = wi * 2; by = 3; }
    else if (kind == 2) { bx = 6; by = 0; }
    else if (kind == 3) { bx = 6; by = 3; }
    else {
      bx = (tx / 4) * 8;
      by = ty * 6 + ((tx / 2) % 2) * 3;
      if (kind % 2 == 0) bx += wi * 2;
      else { bx += 6; table = WATERFALL; ntable = 4; by += frame % 3; }
    }
  } else if (id < A3) {
    set = 1; bx = tx * 2; by = (ty - 2) * 3;
    isTable = flags && id < flags->xs ? (flags->data[id] & 0x80) != 0 : 0;
  } else if (id < A4) {
    set = 2; bx = tx * 2; by = (ty - 6) * 2; table = WALL; ntable = 16;
  } else {
    set = 3; bx = tx * 2;
    by = (int)floor((ty - 10) * 2.5 + (ty % 2 == 1 ? 0.5 : 0));
    if (ty % 2 == 1) { table = WALL; ntable = 16; }
  }
  if (shape >= ntable) return;
  const unsigned char (*t)[2] = table[shape];
  for (int i = 0; i < 4; i++) {
    int qsx = t[i][0], qsy = t[i][1];
    int sx1 = (bx * 2 + qsx) * 16, sy1 = (by * 2 + qsy) * 16;
    int dx1 = dx + (i % 2) * 16, dy1 = dy + (i / 2) * 16;
    if (isTable && (qsy == 1 || qsy == 5)) {
      int qsx2 = qsx;
      if (qsy == 1) { static const int M[4] = {0, 3, 2, 1}; qsx2 = M[qsx]; }
      ql_push(l, set, (bx * 2 + qsx2) * 16, (by * 2 + 3) * 16, 16, 16, dx1, dy1, 16, 16);
      dy1 += 8;
      ql_push(l, set, sx1, sy1, 16, 8, dx1, dy1, 16, 8);
    } else {
      ql_push(l, set, sx1, sy1, 16, 16, dx1, dy1, 16, 16);
    }
  }
}

static void draw_table_edge(QList *l, int id, int dx, int dy) {
  if (!(id >= A2 && id < A3)) return;
  int kind = (id - A1) / 48, shape = (id - A1) % 48;
  int tx = kind % 8, ty = kind / 8;
  int bx = tx * 2, by = (ty - 2) * 3;
  for (int i = 0; i < 2; i++) {
    int qsx = FLOOR[shape][2 + i][0], qsy = FLOOR[shape][2 + i][1];
    ql_push(l, 1, (bx * 2 + qsx) * 16, (by * 2 + qsy) * 16 + 8, 16, 8, dx + i * 16, dy, 16, 8);
  }
}

static void draw_tile(QList *l, int id, int dx, int dy, int frame, const Table *flags) {
  if (id <= 0 || id >= TMAX) return;
  if (id >= A1) draw_autotile(l, id, dx, dy, frame, flags);
  else draw_normal_tile(l, id, dx, dy);
}

typedef struct {
  const double *rec;
  QList lower[3], upper;   // L0, L1, L2
  ShadowQ *sh; int nsh, capsh;
} TileBuild;

static void tile_build(TileBuild *tb, Table *map, Table *flags, int ox, int oy, int vw, int vh, int anim) {
  for (int i = 0; i < 3; i++) tb->lower[i].n = 0;
  tb->upper.n = 0;
  tb->nsh = 0;
  if (!map || map->xs <= 0 || map->ys <= 0) return;
  int xs = map->xs, ys = map->ys, zs = map->zs;
  int frame = anim / 30;
  int tx0 = (int)floor(ox / 32.0), ty0 = (int)floor(oy / 32.0);
  int tx1 = (int)floor((ox + vw - 1) / 32.0), ty1 = (int)floor((oy + vh - 1) / 32.0);
  int plane = xs * ys;
  int nflags = flags ? flags->xs : 0;
#define HIGHER(id) (flags && (id) > 0 && (id) < nflags && (flags->data[(id)] & 0x10))
#define ISTABLE(id) ((id) >= A2 && (id) < A3 && flags && (id) < nflags && (flags->data[(id)] & 0x80))
  for (int ty = ty0; ty <= ty1; ty++) {
    int my = ((ty % ys) + ys) % ys;
    int myUp = (((ty - 1) % ys) + ys) % ys;
    int dy = ty * 32 - oy;
    for (int tx = tx0; tx <= tx1; tx++) {
      int mx = ((tx % xs) + xs) % xs;
      int dx = tx * 32 - ox;
      int base = my * xs + mx;
      int t0 = map->data[base];
      int t1 = zs > 1 ? map->data[base + plane] : 0;
      int t2 = zs > 2 ? map->data[base + plane * 2] : 0;
      int t3 = zs > 3 ? map->data[base + plane * 3] : 0;
      if (t0 > 0) draw_tile(HIGHER(t0) ? &tb->upper : &tb->lower[0], t0, dx, dy, frame, flags);
      if (t1 > 0) draw_tile(HIGHER(t1) ? &tb->upper : &tb->lower[1], t1, dx, dy, frame, flags);
      int shadow = t3 & 0x0f;
      if (shadow) {
        if (tb->nsh >= tb->capsh) {
          int nc = tb->capsh ? tb->capsh * 2 : 64;
          ShadowQ *s = realloc(tb->sh, sizeof(ShadowQ) * (size_t)nc);
          if (s) { tb->sh = s; tb->capsh = nc; }
        }
        if (tb->nsh < tb->capsh) tb->sh[tb->nsh++] = (ShadowQ){dx, dy, shadow};
      }
      if (zs > 1) {
        int up1 = map->data[myUp * xs + mx + plane];
        if (ISTABLE(up1) && !ISTABLE(t1) && !(t0 >= A3 && t0 < TMAX)) draw_table_edge(&tb->lower[1], up1, dx, dy);
      }
      if (t2 > 0) draw_tile(HIGHER(t2) ? &tb->upper : &tb->lower[2], t2, dx, dy, frame, flags);
    }
  }
#undef HIGHER
#undef ISTABLE
}

static void draw_quads(const QList *l, TkrBitmap *const bmps[9], int bx, int by, Rect clip) {
  Shade s;
  shade_init(&s, 1, NULL, NULL, 0);
  for (int i = 0; i < l->n; i++) {
    const Quad *q = &l->q[i];
    TkrBitmap *b = q->set >= 0 && q->set < 9 ? bmps[q->set] : NULL;
    if (!b) continue;
    draw_scaled(b, q->sx, q->sy, q->sw, q->sh, bx + q->dx, by + q->dy, q->dw, q->dh, &s, clip);
  }
}

#define MAX_TILEMAPS 8
static TileBuild g_tb[MAX_TILEMAPS];
static int g_ntb = 0;

static void draw_tilemap(const double *a, int layer, double offX, double offY, Rect area, Rect clip) {
  TileBuild *tb = NULL;
  for (int i = 0; i < g_ntb; i++) if (g_tb[i].rec == a) { tb = &g_tb[i]; break; }
  if (!tb) {
    if (g_ntb >= MAX_TILEMAPS) return;
    tb = &g_tb[g_ntb++];
    tb->rec = a;
    int ox = (int)a[3], oy = (int)a[4], anim = (int)a[5];
    Table *map = table_get((int)a[15]);
    Table *flags = table_get((int)a[16]);
    tile_build(tb, map, flags, (int)(ox + area.x - offX), (int)(oy + area.y - offY), area.w, area.h, anim);
  }
  TkrBitmap *bmps[9];
  for (int i = 0; i < 9; i++) bmps[i] = tkr_bmp_get((int)a[6 + i]);
  int bx = area.x, by = area.y;
  if (layer == 0) {
    draw_quads(&tb->lower[0], bmps, bx, by, clip);
    draw_quads(&tb->lower[1], bmps, bx, by, clip);
    for (int i = 0; i < tb->nsh; i++) {
      ShadowQ *q = &tb->sh[i];
      for (int k = 0; k < 4; k++) {
        if (q->bits & (1 << k)) fill_rect(bx + q->dx + (k % 2) * 16, by + q->dy + (k / 2) * 16, 16, 16, 0, 0, 0, 128, clip);
      }
    }
    draw_quads(&tb->lower[2], bmps, bx, by, clip);
  } else {
    draw_quads(&tb->upper, bmps, bx, by, clip);
  }
}

// ---- viewport effects ------------------------------------------------------------------
static void apply_effect(Rect r, const double *color, const double *tone) {
  Shade s;
  shade_init(&s, 1, color, tone, 0);
  if (s.plain) return;
  for (int y = r.y; y < r.y + r.h; y++) {
    uint8_t *row = g_screen + ((size_t)y * W + r.x) * 4;
    for (int x = 0; x < r.w; x++) {
      int rr, g, b;
      shade_rgb(&s, row + x * 4, &rr, &g, &b);
      row[x * 4] = (uint8_t)rr; row[x * 4 + 1] = (uint8_t)g; row[x * 4 + 2] = (uint8_t)b;
    }
  }
}

// ---- scene ------------------------------------------------------------------------------
typedef struct Item {
  int z, uid;
  const double *rec;   // record start (type at rec[0])
  int layer;           // tilemap layer
  int vp;              // index into viewports, -1 for top-level drawables
  int is_vp;
} Item;

typedef struct Vp {
  int uid, z, visible;
  Rect rect;
  int ox, oy;
  double color[4], tone[4], flash[4];
  int first, count;    // children in g_children
} Vp;

static Item *g_items = NULL; static int g_nitems = 0, g_capitems = 0;
static Item *g_children = NULL; static int g_nchildren = 0, g_capchildren = 0;
static Vp *g_vps = NULL; static int g_nvps = 0, g_capvps = 0;

static int item_cmp(const void *pa, const void *pb) {
  const Item *a = pa, *b = pb;
  if (a->z != b->z) return a->z < b->z ? -1 : 1;
  if (a->uid != b->uid) return a->uid < b->uid ? -1 : 1;
  return a->layer - b->layer;
}

static void push_item(Item **arr, int *n, int *cap, Item it) {
  if (*n >= *cap) {
    int nc = *cap ? *cap * 2 : 256;
    Item *a = realloc(*arr, sizeof(Item) * (size_t)nc);
    if (!a) return;
    *arr = a; *cap = nc;
  }
  (*arr)[(*n)++] = it;
}

static int find_vp(int uid) {
  for (int i = 0; i < g_nvps; i++) if (g_vps[i].uid == uid) return i;
  return -1;
}

static void draw_item(const Item *it, double offX, double offY, Rect area, Rect clip) {
  const double *a = it->rec;
  switch ((int)a[0]) {
    case T_SPRITE: draw_sprite(a, offX, offY, clip); break;
    case T_PLANE: draw_plane(a, area, clip); break;
    case T_WINDOW: draw_window(a, offX, offY, clip); break;
    case T_TILEMAP: draw_tilemap(a, it->layer, offX, offY, area, clip); break;
  }
}

static void draw_scene(const double *a, int n) {
  g_brightness = n > 0 ? a[0] : 255;
  // clear to black
  for (size_t i = 0; i < (size_t)W * H; i++) {
    g_screen[i * 4] = g_screen[i * 4 + 1] = g_screen[i * 4 + 2] = 0;
    g_screen[i * 4 + 3] = 255;
  }
  g_nitems = g_nchildren = g_nvps = 0;
  g_ntb = 0;
  // pass 1: viewports
  int i = 1;
  while (i < n) {
    int t = (int)a[i];
    if (t < 1 || t > 5 || i + REC_LEN[t] > n) break;
    if (t == T_VIEWPORT) {
      if (g_nvps >= g_capvps) {
        int nc = g_capvps ? g_capvps * 2 : 32;
        Vp *v = realloc(g_vps, sizeof(Vp) * (size_t)nc);
        if (!v) return;
        g_vps = v; g_capvps = nc;
      }
      Vp *v = &g_vps[g_nvps++];
      v->uid = (int)a[i + 1]; v->z = (int)a[i + 2]; v->visible = a[i + 3] != 0;
      v->rect = (Rect){(int)a[i + 4], (int)a[i + 5], (int)a[i + 6], (int)a[i + 7]};
      v->ox = (int)a[i + 8]; v->oy = (int)a[i + 9];
      for (int k = 0; k < 4; k++) {
        v->color[k] = a[i + 10 + k]; v->tone[k] = a[i + 14 + k]; v->flash[k] = a[i + 18 + k];
      }
      v->first = v->count = 0;
      push_item(&g_items, &g_nitems, &g_capitems, (Item){v->z, v->uid, a + i, 0, g_nvps - 1, 1});
    }
    i += REC_LEN[t];
  }
  // pass 2: drawables (top-level or into their viewport)
  Item *tmp = NULL; int ntmp = 0, captmp = 0;
  i = 1;
  while (i < n) {
    int t = (int)a[i];
    if (t < 1 || t > 5 || i + REC_LEN[t] > n) break;
    if (t != T_VIEWPORT) {
      int vpid = (int)a[i + 2];
      int vi = vpid ? find_vp(vpid) : -1;
      if (!(vpid && vi < 0)) {
        int uid = (int)a[i + 1];
        if (t == T_TILEMAP) {
          Item i0 = {0, uid, a + i, 0, vi, 0}, i1 = {200, uid, a + i, 1, vi, 0};
          if (vi >= 0) { push_item(&tmp, &ntmp, &captmp, i0); push_item(&tmp, &ntmp, &captmp, i1); }
          else { push_item(&g_items, &g_nitems, &g_capitems, i0); push_item(&g_items, &g_nitems, &g_capitems, i1); }
        } else {
          Item it = {(int)a[i + 3], uid, a + i, 0, vi, 0};
          if (vi >= 0) push_item(&tmp, &ntmp, &captmp, it);
          else push_item(&g_items, &g_nitems, &g_capitems, it);
        }
      }
    }
    i += REC_LEN[t];
  }
  // group children by viewport (stable order, then sort each group)
  for (int v = 0; v < g_nvps; v++) {
    g_vps[v].first = g_nchildren;
    for (int k = 0; k < ntmp; k++) if (tmp[k].vp == v) push_item(&g_children, &g_nchildren, &g_capchildren, tmp[k]);
    g_vps[v].count = g_nchildren - g_vps[v].first;
    qsort(g_children + g_vps[v].first, (size_t)g_vps[v].count, sizeof(Item), item_cmp);
  }
  free(tmp);
  qsort(g_items, (size_t)g_nitems, sizeof(Item), item_cmp);
  Rect screen = {0, 0, W, H};
  for (int k = 0; k < g_nitems; k++) {
    Item *it = &g_items[k];
    if (it->is_vp) {
      Vp *v = &g_vps[it->vp];
      if (!v->visible) continue;
      Rect clip = rect_isect(v->rect, screen);
      if (clip.w <= 0 || clip.h <= 0) continue;
      double offX = v->rect.x - v->ox, offY = v->rect.y - v->oy;
      for (int c = 0; c < v->count; c++) draw_item(&g_children[v->first + c], offX, offY, v->rect, clip);
      const double *fx = v->flash[3] > 0 ? v->flash : v->color;
      if (fx[3] > 0 || v->tone[0] || v->tone[1] || v->tone[2] || v->tone[3]) apply_effect(clip, fx, v->tone);
    } else {
      draw_item(it, 0, 0, screen, screen);
    }
  }
}

// screen -> dst with brightness
static void compose(uint8_t *dst) {
  size_t n = (size_t)W * H * 4;
  int b = (int)lround(g_brightness);
  if (b >= 255) { memcpy(dst, g_screen, n); return; }
  if (b < 0) b = 0;
  for (size_t i = 0; i < n; i += 4) {
    dst[i] = (uint8_t)(g_screen[i] * b / 255);
    dst[i + 1] = (uint8_t)(g_screen[i + 1] * b / 255);
    dst[i + 2] = (uint8_t)(g_screen[i + 2] * b / 255);
    dst[i + 3] = 255;
  }
}

void tkr_render(const double *list, int n) {
  if (!g_screen) alloc_buffers();
  draw_scene(list, n);
  if (g_is_frozen) return;   // the frozen frame stays on screen until transition
  compose(g_out);
}

void tkr_render_freeze(const double *list, int n) {
  if (!g_screen) alloc_buffers();
  draw_scene(list, n);
  compose(g_frozen);
  memcpy(g_out, g_frozen, (size_t)W * H * 4);
  g_is_frozen = 1;
}

void tkr_render_unfreeze(void) { g_is_frozen = 0; }

void tkr_render_transition(const double *list, int n, double prog, int mask_id, double vague) {
  if (!g_screen) alloc_buffers();
  draw_scene(list, n);
  compose(g_out);   // current scene
  TkrBitmap *mask = tkr_bmp_get(mask_id);
  double v = vague > 0.004 ? vague : 0.004;
  for (int y = 0; y < H; y++) {
    for (int x = 0; x < W; x++) {
      size_t i = ((size_t)y * W + x) * 4;
      double a;
      if (mask) {
        int mx = x * mask->w / W, my = y * mask->h / H;
        double t = mask->px[((size_t)my * mask->w + mx) * 4] / 255.0;
        double c = t < prog ? prog : (t > prog + v ? prog + v : t);
        a = (c - prog) / v;
      } else {
        a = 1.0 - prog;
      }
      if (a <= 0) continue;
      if (a > 1) a = 1;
      int ai = (int)(a * 255 + 0.5);
      for (int k = 0; k < 3; k++) g_out[i + k] = (uint8_t)(g_out[i + k] + ((g_frozen[i + k] - g_out[i + k]) * ai + 127) / 255);
    }
  }
}

int tkr_render_snap(const double *list, int n) {
  if (!g_screen) alloc_buffers();
  draw_scene(list, n);
  uint8_t *tmp = malloc((size_t)W * H * 4);
  if (!tmp) return 0;
  compose(tmp);
  int id = tkr_bmp_from_pixels(W, H, tmp);
  free(tmp);
  return id;
}

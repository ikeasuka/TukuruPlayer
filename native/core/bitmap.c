// Bitmaps: straight RGBA8 pixel buffers addressed by integer ids (as in the web runtime).
// Compositing follows the HTML canvas semantics the web runtime used (source-over with a
// global alpha, nearest-neighbour scaling) so both runtimes draw identically.
#include "tkr.h"
#include "tkr_platform.h"
#include <math.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define STBI_ONLY_PNG
#define STBI_ONLY_JPEG
#define STBI_ONLY_BMP
#define STB_IMAGE_IMPLEMENTATION
#include "third_party/stb_image.h"

static TkrBitmap **g_bmps = NULL;
static int g_cap = 0;
static int g_next = 1;
static size_t g_bytes = 0;
static int g_count = 0;

static int clampi(int v, int lo, int hi) { return v < lo ? lo : (v > hi ? hi : v); }
static inline uint8_t u8(int v) { return (uint8_t)(v < 0 ? 0 : (v > 255 ? 255 : v)); }

TkrBitmap *tkr_bmp_get(int id) {
  if (id <= 0 || id >= g_cap) return NULL;
  return g_bmps[id];
}

static int add_bitmap(TkrBitmap *b) {
  if (g_next >= g_cap) {
    int ncap = g_cap ? g_cap * 2 : 1024;
    while (ncap <= g_next) ncap *= 2;
    TkrBitmap **n = realloc(g_bmps, sizeof(*n) * (size_t)ncap);
    if (!n) return 0;
    memset(n + g_cap, 0, sizeof(*n) * (size_t)(ncap - g_cap));
    g_bmps = n;
    g_cap = ncap;
  }
  int id = g_next++;
  g_bmps[id] = b;
  g_bytes += (size_t)b->w * b->h * 4;
  g_count++;
  return id;
}

static TkrBitmap *new_bitmap(int w, int h) {
  if (w <= 0 || h <= 0 || (long long)w * h > 64LL * 1024 * 1024) return NULL;
  TkrBitmap *b = calloc(1, sizeof(*b));
  if (!b) return NULL;
  b->px = calloc((size_t)w * h, 4);
  if (!b->px) { free(b); return NULL; }
  b->w = w;
  b->h = h;
  b->version = 1;
  return b;
}

int tkr_bmp_create(int w, int h) {
  TkrBitmap *b = new_bitmap(w, h);
  return b ? add_bitmap(b) : 0;
}

int tkr_bmp_from_pixels(int w, int h, const uint8_t *rgba) {
  TkrBitmap *b = new_bitmap(w, h);
  if (!b) return 0;
  memcpy(b->px, rgba, (size_t)w * h * 4);
  return add_bitmap(b);
}

// ---- image decoding with a small LRU cache of decoded files ---------------------------
typedef struct ImgCache {
  char path[1024];
  int w, h;
  uint8_t *px;
  uint64_t used;
} ImgCache;
#define IMG_CACHE_N 48
static ImgCache g_img[IMG_CACHE_N];
static uint64_t g_img_tick = 0;
static const size_t IMG_CACHE_BYTES = 40u * 1024 * 1024;

static void img_cache_trim(void) {
  for (;;) {
    size_t total = 0;
    int oldest = -1;
    for (int i = 0; i < IMG_CACHE_N; i++) {
      if (!g_img[i].px) continue;
      total += (size_t)g_img[i].w * g_img[i].h * 4;
      if (oldest < 0 || g_img[i].used < g_img[oldest].used) oldest = i;
    }
    if (total <= IMG_CACHE_BYTES || oldest < 0) return;
    free(g_img[oldest].px);
    memset(&g_img[oldest], 0, sizeof(g_img[oldest]));
  }
}

static const char *const IMG_EXTS[] = {".png", ".jpg", ".jpeg", ".bmp", NULL};

int tkr_bmp_load(const char *rel) {
  char path[1024];
  if (!tkr_platform_resolve(rel, IMG_EXTS, path, sizeof(path))) return 0;
  ImgCache *hit = NULL;
  for (int i = 0; i < IMG_CACHE_N; i++) {
    if (g_img[i].px && strcmp(g_img[i].path, path) == 0) { hit = &g_img[i]; break; }
  }
  if (!hit) {
    int w, h, n;
    uint8_t *px = stbi_load(path, &w, &h, &n, 4);
    if (!px) {
      char msg[1200];
      snprintf(msg, sizeof(msg), "image decode failed: %s (%s)", path, stbi_failure_reason());
      tkr_platform_log("error", msg);
      return 0;
    }
    // Fully transparent pixels: normalize color to 0 like canvas does (premultiplied storage).
    for (size_t i = 0; i < (size_t)w * h; i++) {
      if (px[i * 4 + 3] == 0) { px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = 0; }
    }
    int slot = 0;
    for (int i = 0; i < IMG_CACHE_N; i++) {
      if (!g_img[i].px) { slot = i; break; }
      if (g_img[i].used < g_img[slot].used) slot = i;
    }
    if (g_img[slot].px) free(g_img[slot].px);
    hit = &g_img[slot];
    snprintf(hit->path, sizeof(hit->path), "%s", path);
    hit->w = w;
    hit->h = h;
    hit->px = px;
  }
  hit->used = ++g_img_tick;
  int id = tkr_bmp_from_pixels(hit->w, hit->h, hit->px);
  img_cache_trim();
  return id;
}

int tkr_bmp_dup(int id) {
  TkrBitmap *s = tkr_bmp_get(id);
  return s ? tkr_bmp_from_pixels(s->w, s->h, s->px) : 0;
}

void tkr_bmp_dispose(int id) {
  TkrBitmap *b = tkr_bmp_get(id);
  if (!b) return;
  g_bytes -= (size_t)b->w * b->h * 4;
  g_count--;
  free(b->px);
  free(b);
  g_bmps[id] = NULL;
}

size_t tkr_bmp_memory(void) { return g_bytes; }
int tkr_bmp_count(void) { return g_count; }

// ---- compositing ------------------------------------------------------------------
// source-over of straight-alpha color (r,g,b,a) onto pixel d.
static inline void blend_px(uint8_t *d, int r, int g, int b, int a) {
  if (a <= 0) return;
  if (a >= 255) { d[0] = (uint8_t)r; d[1] = (uint8_t)g; d[2] = (uint8_t)b; d[3] = 255; return; }
  int da = d[3];
  if (da == 0) { d[0] = (uint8_t)r; d[1] = (uint8_t)g; d[2] = (uint8_t)b; d[3] = (uint8_t)a; return; }
  int dk = da * (255 - a);            // dest weight * 255
  int oa255 = a * 255 + dk;           // out alpha * 255
  d[0] = (uint8_t)((r * a * 255 + d[0] * dk + oa255 / 2) / oa255);
  d[1] = (uint8_t)((g * a * 255 + d[1] * dk + oa255 / 2) / oa255);
  d[2] = (uint8_t)((b * a * 255 + d[2] * dk + oa255 / 2) / oa255);
  d[3] = (uint8_t)((oa255 + 127) / 255);
}

void tkr_bmp_blt(int dst, int x, int y, int src, int sx, int sy, int sw, int sh, int opacity) {
  TkrBitmap *d = tkr_bmp_get(dst), *s = tkr_bmp_get(src);
  if (!d || !s || opacity <= 0) return;
  if (opacity > 255) opacity = 255;
  // clip to source
  if (sx < 0) { x -= sx; sw += sx; sx = 0; }
  if (sy < 0) { y -= sy; sh += sy; sy = 0; }
  if (sx + sw > s->w) sw = s->w - sx;
  if (sy + sh > s->h) sh = s->h - sy;
  // clip to destination
  if (x < 0) { sx -= x; sw += x; x = 0; }
  if (y < 0) { sy -= y; sh += y; y = 0; }
  if (x + sw > d->w) sw = d->w - x;
  if (y + sh > d->h) sh = d->h - y;
  if (sw <= 0 || sh <= 0) return;
  int same = (d == s);
  uint8_t *tmp = NULL;
  const uint8_t *sp = s->px;
  int spitch = s->w * 4;
  if (same) {  // overlapping self-copy: work from a copy of the source rect
    tmp = malloc((size_t)sw * sh * 4);
    if (!tmp) return;
    for (int j = 0; j < sh; j++) memcpy(tmp + (size_t)j * sw * 4, s->px + ((size_t)(sy + j) * s->w + sx) * 4, (size_t)sw * 4);
    sp = tmp;
    spitch = sw * 4;
    sx = sy = 0;
  }
  for (int j = 0; j < sh; j++) {
    const uint8_t *srow = sp + (size_t)(sy + j) * spitch + (size_t)sx * 4;
    uint8_t *drow = d->px + ((size_t)(y + j) * d->w + x) * 4;
    for (int i = 0; i < sw; i++) {
      int a = srow[i * 4 + 3];
      if (!a) continue;
      if (opacity != 255) a = (a * opacity + 127) / 255;
      blend_px(drow + i * 4, srow[i * 4], srow[i * 4 + 1], srow[i * 4 + 2], a);
    }
  }
  free(tmp);
  d->version++;
}

void tkr_bmp_stretch(int dst, int dx, int dy, int dw, int dh, int src, int sx, int sy, int sw, int sh, int opacity) {
  TkrBitmap *d = tkr_bmp_get(dst), *s = tkr_bmp_get(src);
  if (!d || !s || sw == 0 || sh == 0 || dw == 0 || dh == 0 || opacity <= 0) return;
  if (opacity > 255) opacity = 255;
  double fx = (double)dw / sw, fy = (double)dh / sh;
  double ddx = dx, ddy = dy, ddw = dw, ddh = dh;
  if (sx < 0) { ddx -= sx * fx; ddw += sx * fx; sw += sx; sx = 0; }
  if (sy < 0) { ddy -= sy * fy; ddh += sy * fy; sh += sy; sy = 0; }
  if (sx + sw > s->w) { int o = sx + sw - s->w; sw -= o; ddw -= o * fx; }
  if (sy + sh > s->h) { int o = sy + sh - s->h; sh -= o; ddh -= o * fy; }
  if (sw <= 0 || sh <= 0 || ddw <= 0 || ddh <= 0) return;
  uint8_t *copy = NULL;
  const uint8_t *spx = s->px;
  if (d == s) {
    copy = malloc((size_t)s->w * s->h * 4);
    if (!copy) return;
    memcpy(copy, s->px, (size_t)s->w * s->h * 4);
    spx = copy;
  }
  int x0 = clampi((int)ceil(ddx - 0.5), 0, d->w), x1 = clampi((int)ceil(ddx + ddw - 0.5), 0, d->w);
  int y0 = clampi((int)ceil(ddy - 0.5), 0, d->h), y1 = clampi((int)ceil(ddy + ddh - 0.5), 0, d->h);
  for (int y = y0; y < y1; y++) {
    int syy = sy + (int)floor((y + 0.5 - ddy) * sh / ddh);
    if (syy < sy) syy = sy;
    if (syy >= sy + sh) syy = sy + sh - 1;
    uint8_t *drow = d->px + (size_t)y * d->w * 4;
    const uint8_t *srow = spx + (size_t)syy * s->w * 4;
    for (int x = x0; x < x1; x++) {
      int sxx = sx + (int)floor((x + 0.5 - ddx) * sw / ddw);
      if (sxx < sx) sxx = sx;
      if (sxx >= sx + sw) sxx = sx + sw - 1;
      const uint8_t *p = srow + sxx * 4;
      int a = p[3];
      if (!a) continue;
      if (opacity != 255) a = (a * opacity + 127) / 255;
      blend_px(drow + x * 4, p[0], p[1], p[2], a);
    }
  }
  free(copy);
  d->version++;
}

static int clip_rect(TkrBitmap *b, int *x, int *y, int *w, int *h) {
  if (*w < 0) { *x += *w; *w = -*w; }
  if (*h < 0) { *y += *h; *h = -*h; }
  int x0 = clampi(*x, 0, b->w), y0 = clampi(*y, 0, b->h);
  int x1 = clampi(*x + *w, 0, b->w), y1 = clampi(*y + *h, 0, b->h);
  *x = x0; *y = y0; *w = x1 - x0; *h = y1 - y0;
  return *w > 0 && *h > 0;
}

void tkr_bmp_fill(int id, int x, int y, int w, int h, int r, int g, int b, int a) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d || !clip_rect(d, &x, &y, &w, &h)) return;
  uint8_t c[4] = {u8(r), u8(g), u8(b), u8(a)};
  if (c[3] == 0) c[0] = c[1] = c[2] = 0;
  for (int j = 0; j < h; j++) {
    uint8_t *p = d->px + ((size_t)(y + j) * d->w + x) * 4;
    for (int i = 0; i < w; i++) memcpy(p + i * 4, c, 4);
  }
  d->version++;
}

void tkr_bmp_clear_rect(int id, int x, int y, int w, int h) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d || !clip_rect(d, &x, &y, &w, &h)) return;
  for (int j = 0; j < h; j++) memset(d->px + ((size_t)(y + j) * d->w + x) * 4, 0, (size_t)w * 4);
  d->version++;
}

void tkr_bmp_gradient(int id, int x, int y, int w, int h, const int c1[4], const int c2[4], int vertical) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d || w == 0 || h == 0) return;
  int gx = x, gy = y, gw = w, gh = h;  // gradient geometry before clipping
  if (gw < 0) { gx += gw; gw = -gw; }
  if (gh < 0) { gy += gh; gh = -gh; }
  if (!clip_rect(d, &x, &y, &w, &h)) return;
  // interpolate in premultiplied space (canvas behaviour)
  double p1[4], p2[4];
  for (int k = 0; k < 3; k++) { p1[k] = c1[k] * c1[3] / 255.0; p2[k] = c2[k] * c2[3] / 255.0; }
  p1[3] = c1[3]; p2[3] = c2[3];
  for (int j = 0; j < h; j++) {
    uint8_t *row = d->px + ((size_t)(y + j) * d->w + x) * 4;
    for (int i = 0; i < w; i++) {
      double t = vertical ? (y + j + 0.5 - gy) / gh : (x + i + 0.5 - gx) / gw;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      double a = p1[3] + (p2[3] - p1[3]) * t;
      uint8_t *p = row + i * 4;
      if (a < 0.5) { p[0] = p[1] = p[2] = p[3] = 0; continue; }
      for (int k = 0; k < 3; k++) p[k] = u8((int)lround((p1[k] + (p2[k] - p1[k]) * t) * 255.0 / a));
      p[3] = u8((int)lround(a));
    }
  }
  d->version++;
}

void tkr_bmp_get_pixel(int id, int x, int y, int out[4]) {
  TkrBitmap *d = tkr_bmp_get(id);
  out[0] = out[1] = out[2] = out[3] = 0;
  if (!d || x < 0 || y < 0 || x >= d->w || y >= d->h) return;
  const uint8_t *p = d->px + ((size_t)y * d->w + x) * 4;
  for (int k = 0; k < 4; k++) out[k] = p[k];
}

void tkr_bmp_set_pixel(int id, int x, int y, int r, int g, int b, int a) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d || x < 0 || y < 0 || x >= d->w || y >= d->h) return;
  uint8_t *p = d->px + ((size_t)y * d->w + x) * 4;
  p[3] = u8(a);
  if (p[3] == 0) { p[0] = p[1] = p[2] = 0; } else { p[0] = u8(r); p[1] = u8(g); p[2] = u8(b); }
  d->version++;
}

void tkr_bmp_hue(int id, int hue) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d) return;
  double rad = hue * M_PI / 180.0, c = cos(rad), s = sin(rad);
  double m[9] = {
    0.299 + 0.701 * c + 0.168 * s, 0.587 - 0.587 * c + 0.330 * s, 0.114 - 0.114 * c - 0.497 * s,
    0.299 - 0.299 * c - 0.328 * s, 0.587 + 0.413 * c + 0.035 * s, 0.114 - 0.114 * c + 0.292 * s,
    0.299 - 0.300 * c + 1.250 * s, 0.587 - 0.588 * c - 1.050 * s, 0.114 + 0.886 * c - 0.203 * s,
  };
  size_t n = (size_t)d->w * d->h;
  for (size_t i = 0; i < n; i++) {
    uint8_t *p = d->px + i * 4;
    if (!p[3]) continue;
    double r = p[0], g = p[1], b = p[2];
    p[0] = u8((int)(m[0] * r + m[1] * g + m[2] * b));
    p[1] = u8((int)(m[3] * r + m[4] * g + m[5] * b));
    p[2] = u8((int)(m[6] * r + m[7] * g + m[8] * b));
  }
  d->version++;
}

void tkr_bmp_blur(int id) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d) return;
  int w = d->w, h = d->h;
  uint8_t *out = malloc((size_t)w * h * 4);
  if (!out) return;
  for (int y = 0; y < h; y++) {
    for (int x = 0; x < w; x++) {
      int s[4] = {0, 0, 0, 0}, n = 0;
      for (int yy = y - 1; yy <= y + 1; yy++) {
        if (yy < 0 || yy >= h) continue;
        for (int xx = x - 1; xx <= x + 1; xx++) {
          if (xx < 0 || xx >= w) continue;
          const uint8_t *p = d->px + ((size_t)yy * w + xx) * 4;
          s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3] += p[3];
          n++;
        }
      }
      uint8_t *o = out + ((size_t)y * w + x) * 4;
      for (int k = 0; k < 4; k++) o[k] = (uint8_t)(s[k] / n);
    }
  }
  free(d->px);
  d->px = out;
  d->version++;
}

void tkr_bmp_radial_blur(int id, int angle, int division) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d) return;
  division = clampi(division, 2, 100);
  int w = d->w, h = d->h;
  uint8_t *copy = malloc((size_t)w * h * 4);
  if (!copy) return;
  memcpy(copy, d->px, (size_t)w * h * 4);
  memset(d->px, 0, (size_t)w * h * 4);
  double cx = w / 2.0, cy = h / 2.0;
  for (int i = 0; i < division; i++) {
    double a = ((double)i / (division - 1) - 0.5) * angle * M_PI / 180.0;
    double ca = cos(a), sa = sin(a);
    int alpha = (int)(255.0 / (i + 1) + 0.5);
    for (int y = 0; y < h; y++) {
      for (int x = 0; x < w; x++) {
        // inverse rotation around the center
        double rx = x + 0.5 - cx, ry = y + 0.5 - cy;
        int sx = (int)floor(ca * rx + sa * ry + cx), sy = (int)floor(-sa * rx + ca * ry + cy);
        if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
        const uint8_t *p = copy + ((size_t)sy * w + sx) * 4;
        if (!p[3]) continue;
        blend_px(d->px + ((size_t)y * w + x) * 4, p[0], p[1], p[2], (p[3] * alpha + 127) / 255);
      }
    }
  }
  free(copy);
  d->version++;
}

// ---- text ---------------------------------------------------------------------------
typedef struct FontSpec {
  TkrFont f;
  char namebuf[512];
  int size;
  int outline, shadow;
  int color[4], out[4];
} FontSpec;

static void parse_rgba(const char *s, int out[4]) {
  out[0] = out[1] = out[2] = 0;
  out[3] = 255;
  if (s) sscanf(s, "%d,%d,%d,%d", &out[0], &out[1], &out[2], &out[3]);
}

static void parse_spec(const char *spec, FontSpec *fs) {
  memset(fs, 0, sizeof(*fs));
  char buf[1024];
  snprintf(buf, sizeof(buf), "%s", spec ? spec : "");
  char *fields[8] = {0};
  int n = 0;
  char *p = buf;
  while (n < 8) {
    fields[n++] = p;
    char *semi = strchr(p, ';');
    if (!semi) break;
    *semi = 0;
    p = semi + 1;
  }
  snprintf(fs->namebuf, sizeof(fs->namebuf), "%s", fields[0] ? fields[0] : "");
  char *q = fs->namebuf;
  while (*q && fs->f.count < 8) {
    char *bar = strchr(q, '|');
    if (bar) *bar = 0;
    if (*q) fs->f.names[fs->f.count++] = q;
    if (!bar) break;
    q = bar + 1;
  }
  fs->size = n > 1 && fields[1] ? atoi(fields[1]) : 24;
  if (fs->size <= 0) fs->size = 24;
  fs->f.bold = n > 2 && fields[2] && fields[2][0] == '1';
  fs->f.italic = n > 3 && fields[3] && fields[3][0] == '1';
  fs->outline = n > 4 && fields[4] && fields[4][0] == '1';
  fs->shadow = n > 5 && fields[5] && fields[5][0] == '1';
  parse_rgba(n > 6 ? fields[6] : NULL, fs->color);
  parse_rgba(n > 7 ? fields[7] : NULL, fs->out);
  // RGSS (GDI) renders "size N" smaller than an N px font; 0.9 matches Windows (as mkxp).
  fs->f.px = round(fs->size * 0.9 * 10) / 10;
}

int tkr_text_width(const char *spec, const char *utf8) {
  FontSpec fs;
  parse_spec(spec, &fs);
  double asc, desc;
  return (int)ceil(tkr_platform_text(&fs.f, utf8, NULL, 0, 0, 0, 0, &asc, &desc));
}

// Composite a coverage mask (horizontally scaled by sx) with color c onto bitmap d.
static void draw_mask(TkrBitmap *d, const uint8_t *mask, int mw, int mh, double tx, int ty,
                      double sx, const int c[4]) {
  if (c[3] <= 0) return;
  int x0 = (int)floor(tx), x1 = (int)ceil(tx + mw * sx);
  for (int j = 0; j < mh; j++) {
    int y = ty + j;
    if (y < 0 || y >= d->h) continue;
    const uint8_t *mrow = mask + (size_t)j * mw;
    uint8_t *drow = d->px + (size_t)y * d->w * 4;
    for (int x = x0; x < x1; x++) {
      if (x < 0 || x >= d->w) continue;
      int mx;
      int cov;
      if (sx == 1.0) {
        mx = x - x0;
        if (mx < 0 || mx >= mw) continue;
        cov = mrow[mx];
      } else {
        // box filter over the source columns covered by this destination pixel
        double s0 = (x - tx) / sx, s1 = (x + 1 - tx) / sx;
        int a = (int)floor(s0), b = (int)ceil(s1);
        double sum = 0, wsum = 0;
        for (int k = a; k < b; k++) {
          double lo = k < s0 ? s0 : k, hi = k + 1 > s1 ? s1 : k + 1;
          double wgt = hi - lo;
          if (wgt <= 0) continue;
          if (k >= 0 && k < mw) sum += mrow[k] * wgt;
          wsum += wgt;
        }
        cov = wsum > 0 ? (int)(sum / wsum + 0.5) : 0;
      }
      if (!cov) continue;
      blend_px(drow + x * 4, c[0], c[1], c[2], (cov * c[3] + 127) / 255);
    }
  }
}

void tkr_bmp_draw_text(int id, int x, int y, int w, int h, const char *utf8, int align, const char *spec) {
  TkrBitmap *d = tkr_bmp_get(id);
  if (!d || !utf8 || !*utf8) return;
  FontSpec fs;
  parse_spec(spec, &fs);
  double asc = 0, desc = 0;
  double tw = tkr_platform_text(&fs.f, utf8, NULL, 0, 0, 0, 0, &asc, &desc);
  if (tw <= 0) return;
  const int M = 2;  // margin for outline / shadow / glyph overhang
  int mw = (int)ceil(tw) + M * 2 + 2, mh = (int)ceil(asc + desc) + M * 2;
  uint8_t *mask = calloc((size_t)mw * mh, 1);
  if (!mask) return;
  tkr_platform_text(&fs.f, utf8, mask, mw, mh, M, asc + M, &asc, &desc);

  double sx = 1.0;
  if (w > 0 && tw > w) { sx = w / tw; if (sx < 0.4) sx = 0.4; }
  double drawn = tw * sx;
  double tx = x;
  if (align == 1) tx = x + (w - drawn) / 2;
  else if (align == 2) tx = x + w - drawn;
  int by = (int)lround(y + (h - (asc + desc)) / 2 + asc);  // baseline
  int top = by - (int)lround(asc) - M;
  double left = tx - M * sx;

  if (fs.shadow) {
    int sc[4] = {0, 0, 0, fs.color[3]};
    draw_mask(d, mask, mw, mh, left + 1, top + 1, sx, sc);
  }
  if (fs.outline) {
    // 2px stroke centred on the glyph edge: dilate the coverage by one pixel
    uint8_t *dil = malloc((size_t)mw * mh);
    if (dil) {
      for (int j = 0; j < mh; j++) {
        for (int i = 0; i < mw; i++) {
          int m = 0;
          for (int jj = j - 1; jj <= j + 1; jj++) {
            if (jj < 0 || jj >= mh) continue;
            for (int ii = i - 1; ii <= i + 1; ii++) {
              if (ii < 0 || ii >= mw) continue;
              int v = mask[(size_t)jj * mw + ii];
              if (ii != i && jj != j) v = v * 3 / 4;  // rounder corners
              if (v > m) m = v;
            }
          }
          dil[(size_t)j * mw + i] = (uint8_t)m;
        }
      }
      draw_mask(d, dil, mw, mh, left, top, sx, fs.out);
      free(dil);
    }
  }
  draw_mask(d, mask, mw, mh, left, top, sx, fs.color);
  free(mask);
  d->version++;
}

// TukuruPlayer native engine: RGSS2/RGSS3 runtime core (portable C).
// The Ruby side (web/rgss/*.rb) is shared with the web runtime; this core replaces the JS
// bridge (bitmaps, text, compositing, input) with native code. Platform specifics (files,
// fonts, audio, presenting frames) go through tkr_platform.h.
#ifndef TKR_H
#define TKR_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// ---- bitmaps (straight / non-premultiplied RGBA8, row-major, top-down) ------------------
typedef struct TkrBitmap {
  int w, h;
  uint8_t *px;        // w*h*4
  uint32_t version;   // bumped on every change
} TkrBitmap;

int tkr_bmp_create(int w, int h);                  // returns id (>0) or 0
int tkr_bmp_load(const char *path);                // game-relative path, no extension needed
int tkr_bmp_from_pixels(int w, int h, const uint8_t *rgba);
int tkr_bmp_dup(int id);
void tkr_bmp_dispose(int id);
TkrBitmap *tkr_bmp_get(int id);                    // NULL if unknown
size_t tkr_bmp_memory(void);                       // bytes held by live bitmaps
int tkr_bmp_count(void);

void tkr_bmp_blt(int dst, int x, int y, int src, int sx, int sy, int sw, int sh, int opacity);
void tkr_bmp_stretch(int dst, int dx, int dy, int dw, int dh, int src, int sx, int sy, int sw, int sh, int opacity);
void tkr_bmp_fill(int id, int x, int y, int w, int h, int r, int g, int b, int a);
void tkr_bmp_gradient(int id, int x, int y, int w, int h, const int c1[4], const int c2[4], int vertical);
void tkr_bmp_clear_rect(int id, int x, int y, int w, int h);
void tkr_bmp_get_pixel(int id, int x, int y, int out[4]);
void tkr_bmp_set_pixel(int id, int x, int y, int r, int g, int b, int a);
void tkr_bmp_hue(int id, int hue);
void tkr_bmp_blur(int id);
void tkr_bmp_radial_blur(int id, int angle, int division);

// ---- text --------------------------------------------------------------------------
// spec: "name1|name2;size;bold;italic;outline;shadow;r,g,b,a;r,g,b,a" (Font#__spec)
void tkr_bmp_draw_text(int id, int x, int y, int w, int h, const char *utf8, int align, const char *spec);
int tkr_text_width(const char *spec, const char *utf8);

// ---- tables (map data / flags) -------------------------------------------------------
void tkr_table_set(int id, const int16_t *data, int xs, int ys, int zs);
void tkr_table_free(int id);

// ---- frame composition -------------------------------------------------------------
// The display list is the flat number array built by Graphics#__list (see scene.js for the
// record layout): [brightness, (type, fields...)*]
void tkr_render_init(int w, int h);
void tkr_render_resize(int w, int h);
int tkr_render_width(void);
int tkr_render_height(void);
void tkr_render(const double *list, int n);        // draw the scene into the screen buffer
void tkr_render_freeze(const double *list, int n); // capture the current scene as frozen
void tkr_render_unfreeze(void);
void tkr_render_transition(const double *list, int n, double prog, int mask_bmp, double vague);
int tkr_render_snap(const double *list, int n);    // returns a new bitmap id
const uint8_t *tkr_render_output(void);            // final RGBA frame (w*h*4), opaque

// ---- input ---------------------------------------------------------------------------
void tkr_input_set_mask(uint32_t mask);            // from controllers / touch pad (any thread)
void tkr_input_update(int out[5]);                 // press, trigger, repeat, dir4, dir8

#ifdef __cplusplus
}
#endif
#endif

// Functions the host (iOS app / Linux test runner) provides to the native core.
#ifndef TKR_PLATFORM_H
#define TKR_PLATFORM_H

#include <stdint.h>
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// Resolve a game-relative path (case-insensitive, any image/audio extension when `exts` is
// given, falling back to the RTP) to a readable file. Returns 1 and writes the absolute path.
// exts: NULL for an exact name, or a NULL-terminated list like {".png", ".jpg", NULL}.
int tkr_platform_resolve(const char *rel, const char *const *exts, char *out, size_t outlen);

// Text: rasterize `utf8` with the given font into an 8-bit coverage buffer.
// Returns the advance width in pixels; if `mask` is non-NULL it is mw*mh bytes and the
// text is drawn with its baseline at y = `baseline` and its pen starting at x = `origin`.
// ascent/descent (pixels) are returned for vertical centering.
typedef struct TkrFont {
  const char *names[8];  // requested family names, most preferred first (may be empty)
  int count;
  double px;             // pixel size
  int bold, italic;
} TkrFont;
double tkr_platform_text(const TkrFont *f, const char *utf8, uint8_t *mask, int mw, int mh,
                         double origin, double baseline, double *ascent, double *descent);

// Messages from the core (logging / diagnostics).
void tkr_platform_log(const char *level, const char *msg);

#ifdef __cplusplus
}
#endif
#endif

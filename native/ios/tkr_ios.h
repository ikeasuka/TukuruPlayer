// Swift-facing API of the native engine (see NativeEngine.swift).
#ifndef TKR_IOS_H
#define TKR_IOS_H
#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

// Runs a game on the calling thread (which needs a large stack) until it exits.
int tkr_ios_run(const char *game_dir, const char *rgss_dir, int engine, const char *const *rtp, int nrtp);

// Pieces of the core used from Swift.
void tkr_input_set_mask(uint32_t mask);
const uint8_t *tkr_render_output(void);
int tkr_render_width(void);
int tkr_render_height(void);
void tkr_text_set_scale(double scale);

#ifdef __cplusplus
}
#endif
#endif

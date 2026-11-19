// Case-insensitive game file lookup (shared by the iOS app and the Linux runner).
#ifndef TKR_FS_H
#define TKR_FS_H
#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

// First root is the game folder, the others are RTP folders (media fallback).
void tkr_fs_set_roots(const char *game, const char *const *rtp, int nrtp);
// See tkr_platform_resolve.
int tkr_fs_resolve(const char *rel, const char *const *exts, char *out, size_t outlen);

#ifdef __cplusplus
}
#endif
#endif

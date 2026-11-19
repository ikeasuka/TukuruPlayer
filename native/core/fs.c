// Game file lookup: Windows-like case-insensitive paths, implicit extensions and RTP fallback.
// Directory listings are cached and rescanned once when a name is not found (new saves etc.).
#include "tkr_fs.h"
#include <dirent.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include <sys/stat.h>

#define MAX_ROOTS 4
static char g_roots[MAX_ROOTS][1024];
static int g_nroots = 0;

typedef struct DirCache {
  char path[2048];
  char **names;
  int n;
  struct DirCache *next;
} DirCache;
static DirCache *g_dirs = NULL;

void tkr_fs_set_roots(const char *game, const char *const *rtp, int nrtp) {
  g_nroots = 0;
  snprintf(g_roots[g_nroots++], sizeof(g_roots[0]), "%s", game);
  for (int i = 0; i < nrtp && g_nroots < MAX_ROOTS; i++) snprintf(g_roots[g_nroots++], sizeof(g_roots[0]), "%s", rtp[i]);
  while (g_dirs) {
    DirCache *d = g_dirs;
    g_dirs = d->next;
    for (int i = 0; i < d->n; i++) free(d->names[i]);
    free(d->names);
    free(d);
  }
}

static DirCache *scan(DirCache *d) {
  for (int i = 0; i < d->n; i++) free(d->names[i]);
  free(d->names);
  d->names = NULL;
  d->n = 0;
  DIR *dir = opendir(d->path);
  if (!dir) return d;
  int cap = 0;
  struct dirent *e;
  while ((e = readdir(dir))) {
    if (e->d_name[0] == '.') continue;
    if (d->n >= cap) {
      cap = cap ? cap * 2 : 64;
      char **nn = realloc(d->names, sizeof(char *) * (size_t)cap);
      if (!nn) break;
      d->names = nn;
    }
    d->names[d->n++] = strdup(e->d_name);
  }
  closedir(dir);
  return d;
}

static DirCache *dir_get(const char *path) {
  for (DirCache *d = g_dirs; d; d = d->next) if (strcmp(d->path, path) == 0) return d;
  DirCache *d = calloc(1, sizeof(*d));
  if (!d) return NULL;
  snprintf(d->path, sizeof(d->path), "%s", path);
  d->next = g_dirs;
  g_dirs = d;
  return scan(d);
}

static const char *dir_find(const char *dirpath, const char *name, int allow_rescan) {
  DirCache *d = dir_get(dirpath);
  if (!d) return NULL;
  for (int pass = 0; pass < 2; pass++) {
    for (int i = 0; i < d->n; i++) if (strcasecmp(d->names[i], name) == 0) return d->names[i];
    if (!allow_rescan || pass) break;
    scan(d);
  }
  return NULL;
}

// Resolve `rel` under `root`; returns 1 with the real path in out.
static int resolve_in(const char *root, const char *rel, char *out, size_t outlen) {
  char cur[2048], buf[2048];
  snprintf(cur, sizeof(cur), "%s", root);
  snprintf(buf, sizeof(buf), "%s", rel);
  for (char *p = buf; *p; p++) if (*p == '\\') *p = '/';
  char *save = NULL;
  for (char *tok = strtok_r(buf, "/", &save); tok; tok = strtok_r(NULL, "/", &save)) {
    if (!*tok || strcmp(tok, ".") == 0) continue;
    size_t l = strlen(cur);
    // Exact name first: the file system itself matches it, including Unicode normalization
    // differences (APFS treats NFC "ブ" and NFD "フ+゛" as the same name; byte-wise
    // comparison below would not).
    char exact[4096];
    snprintf(exact, sizeof(exact), "%s/%s", cur, tok);
    struct stat est;
    if (stat(exact, &est) == 0) {
      snprintf(cur + l, sizeof(cur) - l, "/%s", tok);
      continue;
    }
    const char *real = dir_find(cur, tok, 1);
    if (!real) return 0;
    snprintf(cur + l, sizeof(cur) - l, "/%s", real);
  }
  struct stat st;
  if (stat(cur, &st) != 0 || !S_ISREG(st.st_mode)) return 0;
  snprintf(out, outlen, "%s", cur);
  return 1;
}

int tkr_fs_resolve(const char *rel, const char *const *exts, char *out, size_t outlen) {
  if (!rel || !*rel) return 0;
  if (rel[0] == '/') {
    struct stat st;
    if (stat(rel, &st) == 0 && S_ISREG(st.st_mode)) { snprintf(out, outlen, "%s", rel); return 1; }
    // absolute path inside the game folder with different case
    size_t gl = strlen(g_roots[0]);
    if (g_nroots && strncmp(rel, g_roots[0], gl) == 0 && rel[gl] == '/') rel += gl + 1;
    else return 0;
  }
  while (rel[0] == '.' && rel[1] == '/') rel += 2;
  for (int r = 0; r < g_nroots; r++) {
    if (resolve_in(g_roots[r], rel, out, outlen)) return 1;
    for (int i = 0; exts && exts[i]; i++) {
      char with[2048];
      snprintf(with, sizeof(with), "%s%s", rel, exts[i]);
      if (resolve_in(g_roots[r], with, out, outlen)) return 1;
    }
    if (!exts) break;  // exact data files are only looked up in the game folder
  }
  return 0;
}

// Diagnostics for a failed lookup: log names in the same folder that look similar (same first
// character or same last 6 bytes), to tell missing files from naming differences.
void tkr_fs_log_similar(const char *rel, void (*logf)(const char *, const char *)) {
  if (!rel || g_nroots == 0) return;
  char dir[2048], base[1024];
  const char *slash = strrchr(rel, '/');
  if (!slash) return;
  snprintf(dir, sizeof(dir), "%.*s", (int)(slash - rel), rel);
  snprintf(base, sizeof(base), "%s", slash + 1);
  char real[4096];
  // resolve the folder (case-insensitive)
  char cur[4096];
  snprintf(cur, sizeof(cur), "%s", g_roots[0]);
  char buf[2048];
  snprintf(buf, sizeof(buf), "%s", dir);
  char *save = NULL;
  for (char *tok = strtok_r(buf, "/", &save); tok; tok = strtok_r(NULL, "/", &save)) {
    const char *r = dir_find(cur, tok, 0);
    if (!r) return;
    size_t l = strlen(cur);
    snprintf(cur + l, sizeof(cur) - l, "/%s", r);
  }
  DirCache *d = dir_get(cur);
  if (!d) return;
  size_t bl = strlen(base);
  int n = 0;
  for (int i = 0; i < d->n && n < 12; i++) {
    const char *nm = d->names[i];
    size_t nl = strlen(nm);
    int same_first = strncmp(nm, base, 3) == 0;
    const char *dot = strrchr(nm, '.');
    size_t stem = dot ? (size_t)(dot - nm) : nl;
    int same_last = bl >= 6 && stem >= 6 && memcmp(nm + stem - 6, base + bl - 6, 6) == 0;
    if (same_first || same_last) {
      char hex[64] = {0};
      for (int k = 0; k < 9 && nm[k]; k++) snprintf(hex + k * 3, 4, "%02x ", (unsigned char)nm[k]);
      snprintf(real, sizeof(real), "similar file in %s: %s [%s]", dir, nm, hex);
      logf("info", real);
      n++;
    }
  }
  if (!n) {
    snprintf(real, sizeof(real), "no similar file in %s (%d files)", dir, d->n);
    logf("info", real);
  }
}

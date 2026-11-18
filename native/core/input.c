// RGSS input state (C port of web/src/input.js): press / trigger / repeat (24, then every
// 6 frames) and dir4 / dir8 with "latest pressed direction wins".
#include "tkr.h"
#include <stdatomic.h>

#define NBTN 20
enum { B_DOWN = 0, B_LEFT = 1, B_RIGHT = 2, B_UP = 3 };

static _Atomic uint32_t g_mask = 0;     // current buttons from the host
static _Atomic uint32_t g_latched = 0;  // pressed since the last update (short taps count)
static uint32_t g_prev = 0;
static int g_counts[NBTN];
static int g_order[4];                  // most recent last
static int g_norder = 0;

void tkr_input_set_mask(uint32_t mask) {
  uint32_t old = atomic_exchange(&g_mask, mask);
  atomic_fetch_or(&g_latched, mask & ~old);
}

static void order_remove(int d) {
  for (int i = 0; i < g_norder; i++) {
    if (g_order[i] == d) {
      for (int j = i; j < g_norder - 1; j++) g_order[j] = g_order[j + 1];
      g_norder--;
      return;
    }
  }
}

static int order_has(int d) {
  for (int i = 0; i < g_norder; i++) if (g_order[i] == d) return 1;
  return 0;
}

void tkr_input_update(int out[5]) {
  uint32_t cur = atomic_load(&g_mask) | (atomic_exchange(&g_latched, 0) & ~g_prev);
  uint32_t trigger = cur & ~g_prev;
  uint32_t repeat = 0;
  for (int b = 0; b < NBTN; b++) {
    if (cur & (1u << b)) {
      int c = ++g_counts[b];
      if (c == 1 || (c >= 24 && (c - 24) % 6 == 0)) repeat |= 1u << b;
    } else {
      g_counts[b] = 0;
    }
  }
  static const int dirs[4][2] = {{B_DOWN, 2}, {B_LEFT, 4}, {B_RIGHT, 6}, {B_UP, 8}};
  for (int i = 0; i < 4; i++) {
    int b = dirs[i][0], d = dirs[i][1];
    if (cur & (1u << b)) { if (!order_has(d) && g_norder < 4) g_order[g_norder++] = d; }
    else order_remove(d);
  }
  int down = (cur >> B_DOWN) & 1, up = (cur >> B_UP) & 1, left = (cur >> B_LEFT) & 1, right = (cur >> B_RIGHT) & 1;
  int vy = down && !up ? 2 : (up && !down ? 8 : 0);
  int vx = left && !right ? 4 : (right && !left ? 6 : 0);
  int dir4 = 0;
  for (int i = g_norder - 1; i >= 0; i--) {
    if (g_order[i] == vy || g_order[i] == vx) { dir4 = g_order[i]; break; }
  }
  int dir8;
  if (vx && vy) dir8 = vy == 2 ? (vx == 4 ? 1 : 3) : (vx == 4 ? 7 : 9);
  else dir8 = vx ? vx : vy;
  g_prev = cur;
  out[0] = (int)cur; out[1] = (int)trigger; out[2] = (int)repeat; out[3] = dir4; out[4] = dir8;
}

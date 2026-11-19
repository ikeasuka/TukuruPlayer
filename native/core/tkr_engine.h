// Engine entry point: boots the game on an already initialized Ruby VM.
#ifndef TKR_ENGINE_H
#define TKR_ENGINE_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct TkrEngineConfig {
  const char *game_dir;   // game folder (becomes the current directory)
  const char *rgss_dir;   // folder with the RGSS runtime sources (web/rgss)
  int engine;             // 2 = VX (RGSS2), 3 = VX Ace (RGSS3)
  int log_stdout;         // send $stdout / $stderr to tkr_platform_log
} TkrEngineConfig;

// Call on the Ruby thread after ruby_init(). Returns when the game exits (0) or fails (1).
int tkr_engine_run(const TkrEngineConfig *cfg);
void tkr_engine_install(void);

#ifdef __cplusplus
}
#endif
#endif

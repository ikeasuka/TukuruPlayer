// Thin wrapper over stb_vorbis (public domain) used by the Swift audio engine.
#include <stdlib.h>
#include <string.h>
#include <strings.h>
#include "tkr_vorbis.h"

#define STB_VORBIS_HEADER_ONLY
#include "stb_vorbis.c"

static long tkr_comment_value(stb_vorbis_comment *c, const char *key) {
    size_t klen = strlen(key);
    for (int i = 0; i < c->comment_list_length; i++) {
        const char *s = c->comment_list[i];
        if (strncasecmp(s, key, klen) == 0 && s[klen] == '=') {
            return atol(s + klen + 1);
        }
    }
    return -1;
}

int tkr_vorbis_decode(const unsigned char *data, int length, TKRDecodedAudio *out) {
    memset(out, 0, sizeof(*out));
    out->loop_start = -1;
    out->loop_length = -1;
    int err = 0;
    stb_vorbis *v = stb_vorbis_open_memory(data, length, &err, NULL);
    if (!v) return err ? err : -1;
    stb_vorbis_info info = stb_vorbis_get_info(v);
    stb_vorbis_comment comment = stb_vorbis_get_comment(v);
    out->loop_start = tkr_comment_value(&comment, "LOOPSTART");
    out->loop_length = tkr_comment_value(&comment, "LOOPLENGTH");
    out->channels = info.channels;
    out->sample_rate = (int)info.sample_rate;
    long total = (long)stb_vorbis_stream_length_in_samples(v);
    long capacity = total > 0 ? total : info.sample_rate * 60;
    float *buf = (float *)malloc(sizeof(float) * capacity * info.channels);
    if (!buf) { stb_vorbis_close(v); return -2; }
    long frames = 0;
    for (;;) {
        if (frames + 4096 > capacity) {
            capacity = capacity * 2 + 4096;
            float *n = (float *)realloc(buf, sizeof(float) * capacity * info.channels);
            if (!n) { free(buf); stb_vorbis_close(v); return -2; }
            buf = n;
        }
        int got = stb_vorbis_get_samples_float_interleaved(v, info.channels, buf + frames * info.channels, 4096 * info.channels);
        if (got <= 0) break;
        frames += got;
    }
    stb_vorbis_close(v);
    out->samples = buf;
    out->frames = frames;
    return frames > 0 ? 0 : -3;
}

void tkr_vorbis_free(TKRDecodedAudio *audio) {
    if (audio && audio->samples) {
        free(audio->samples);
        audio->samples = NULL;
    }
}

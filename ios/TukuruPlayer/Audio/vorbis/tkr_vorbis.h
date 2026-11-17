#ifndef TKR_VORBIS_H
#define TKR_VORBIS_H

/// Decoded PCM audio (interleaved float samples).
typedef struct {
    int channels;
    int sample_rate;
    long frames;
    float *samples;      // interleaved, frames * channels
    long loop_start;     // -1 if not set (LOOPSTART comment)
    long loop_length;    // -1 if not set (LOOPLENGTH comment)
} TKRDecodedAudio;

/// Decode an Ogg Vorbis file from memory. Returns 0 on success.
int tkr_vorbis_decode(const unsigned char *data, int length, TKRDecodedAudio *out);

/// Free samples allocated by tkr_vorbis_decode.
void tkr_vorbis_free(TKRDecodedAudio *audio);

#endif

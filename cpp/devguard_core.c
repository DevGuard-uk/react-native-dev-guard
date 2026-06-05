#include "devguard_core.h"
#include <string.h>
#include <stdio.h>

// --- SHA256 Implementation ---
#define SHA256_BLOCK_SIZE 64

typedef struct {
    uint8_t data[64];
    uint32_t datalen;
    unsigned long long bitlen;
    uint32_t state[8];
} SHA256_CTX;

#define ROTLEFT(a,b) (((a) << (b)) | ((a) >> (32-(b))))
#define ROTRIGHT(a,b) (((a) >> (b)) | ((a) << (32-(b))))
#define CH(x,y,z) (((x) & (y)) ^ (~(x) & (z)))
#define MAJ(x,y,z) (((x) & (y)) ^ ((x) & (z)) ^ ((y) & (z)))
#define EP0(x) (ROTRIGHT(x,2) ^ ROTRIGHT(x,13) ^ ROTRIGHT(x,22))
#define EP1(x) (ROTRIGHT(x,6) ^ ROTRIGHT(x,11) ^ ROTRIGHT(x,25))
#define SIG0(x) (ROTRIGHT(x,7) ^ ROTRIGHT(x,18) ^ ((x) >> 3))
#define SIG1(x) (ROTRIGHT(x,17) ^ ROTRIGHT(x,19) ^ ((x) >> 10))

static const uint32_t k[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
};

static void sha256_transform(SHA256_CTX *ctx, const uint8_t data[]) {
    uint32_t a, b, c, d, e, f, g, h, i, j, t1, t2, m[64];
    for (i = 0, j = 0; i < 16; ++i, j += 4)
        m[i] = (data[j] << 24) | (data[j + 1] << 16) | (data[j + 2] << 8) | (data[j + 3]);
    for ( ; i < 64; ++i)
        m[i] = SIG1(m[i - 2]) + m[i - 7] + SIG0(m[i - 15]) + m[i - 16];
    a = ctx->state[0]; b = ctx->state[1]; c = ctx->state[2]; d = ctx->state[3];
    e = ctx->state[4]; f = ctx->state[5]; g = ctx->state[6]; h = ctx->state[7];
    for (i = 0; i < 64; ++i) {
        t1 = h + EP1(e) + CH(e,f,g) + k[i] + m[i];
        t2 = EP0(a) + MAJ(a,b,c);
        h = g; g = f; f = e; e = d + t1;
        d = c; c = b; b = a; a = t1 + t2;
    }
    ctx->state[0] += a; ctx->state[1] += b; ctx->state[2] += c; ctx->state[3] += d;
    ctx->state[4] += e; ctx->state[5] += f; ctx->state[6] += g; ctx->state[7] += h;
}

static void sha256_init(SHA256_CTX *ctx) {
    ctx->datalen = 0;
    ctx->bitlen = 0;
    ctx->state[0] = 0x6a09e667; ctx->state[1] = 0xbb67ae85;
    ctx->state[2] = 0x3c6ef372; ctx->state[3] = 0xa54ff53a;
    ctx->state[4] = 0x510e527f; ctx->state[5] = 0x9b05688c;
    ctx->state[6] = 0x1f83d9ab; ctx->state[7] = 0x5be0cd19;
}

static void sha256_update(SHA256_CTX *ctx, const uint8_t data[], size_t len) {
    uint32_t i;
    for (i = 0; i < len; ++i) {
        ctx->data[ctx->datalen] = data[i];
        ctx->datalen++;
        if (ctx->datalen == 64) {
            sha256_transform(ctx, ctx->data);
            ctx->bitlen += 512;
            ctx->datalen = 0;
        }
    }
}

static void sha256_final(SHA256_CTX *ctx, uint8_t hash[]) {
    uint32_t i;
    i = ctx->datalen;
    if (ctx->datalen < 56) {
        ctx->data[i++] = 0x80;
        while (i < 56) ctx->data[i++] = 0x00;
    } else {
        ctx->data[i++] = 0x80;
        while (i < 64) ctx->data[i++] = 0x00;
        sha256_transform(ctx, ctx->data);
        memset(ctx->data, 0, 56);
    }
    ctx->bitlen += ctx->datalen * 8;
    ctx->data[63] = ctx->bitlen; ctx->data[62] = ctx->bitlen >> 8;
    ctx->data[61] = ctx->bitlen >> 16; ctx->data[60] = ctx->bitlen >> 24;
    ctx->data[59] = ctx->bitlen >> 32; ctx->data[58] = ctx->bitlen >> 40;
    ctx->data[57] = ctx->bitlen >> 48; ctx->data[56] = ctx->bitlen >> 56;
    sha256_transform(ctx, ctx->data);
    for (i = 0; i < 4; ++i) {
        hash[i]      = (ctx->state[0] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 4]  = (ctx->state[1] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 8]  = (ctx->state[2] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 12] = (ctx->state[3] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 16] = (ctx->state[4] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 20] = (ctx->state[5] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 24] = (ctx->state[6] >> (24 - i * 8)) & 0x000000ff;
        hash[i + 28] = (ctx->state[7] >> (24 - i * 8)) & 0x000000ff;
    }
}

// --- HMAC-SHA256 Implementation ---
static void hmac_sha256(const uint8_t *key, size_t keylen, const uint8_t *data, size_t datalen, uint8_t *mac) {
    SHA256_CTX ctx;
    uint8_t k_ipad[64];
    uint8_t k_opad[64];
    uint8_t tk[32];
    int i;
    
    if (keylen > 64) {
        sha256_init(&ctx);
        sha256_update(&ctx, key, keylen);
        sha256_final(&ctx, tk);
        key = tk;
        keylen = 32;
    }
    
    memset(k_ipad, 0, sizeof(k_ipad));
    memset(k_opad, 0, sizeof(k_opad));
    memcpy(k_ipad, key, keylen);
    memcpy(k_opad, key, keylen);
    
    for (i = 0; i < 64; i++) {
        k_ipad[i] ^= 0x36;
        k_opad[i] ^= 0x5c;
    }
    
    sha256_init(&ctx);
    sha256_update(&ctx, k_ipad, 64);
    sha256_update(&ctx, data, datalen);
    sha256_final(&ctx, mac);
    
    sha256_init(&ctx);
    sha256_update(&ctx, k_opad, 64);
    sha256_update(&ctx, mac, 32);
    sha256_final(&ctx, mac);
}

// --- FFI Export ---

// Multi-layer key reconstruction: secret split into multiple segments,
// each XOR'd with a different binary mask. No plaintext strings in binary.
static void _reconstruct_key(char* out) {
    // Segment 1 (8 bytes)
    static const uint8_t _k1[] = {0xe7, 0x1a, 0x6d, 0xa5, 0xe1, 0x37, 0xaa, 0x58};
    static const uint8_t _m1[] = {0xa3, 0x7f, 0x1b, 0xe2, 0x94, 0x56, 0xd8, 0x3c};
    // Segment 2 (8 bytes)
    static const uint8_t _k2[] = {0x02, 0x92, 0xef, 0x54, 0x83, 0x5c, 0xd0, 0x16};
    static const uint8_t _m2[] = {0x5d, 0xc1, 0x8a, 0x37, 0xf6, 0x2e, 0xb5, 0x49};
    // Segment 3 (8 bytes)
    static const uint8_t _k3[] = {0x27, 0xd9, 0x12, 0xcc, 0x16, 0xda, 0x2f, 0xa0};
    static const uint8_t _m3[] = {0x71, 0xe8, 0x4d, 0x9f, 0x63, 0xaa, 0x1c, 0xd2};
    // Segment 4 (7 bytes) - Total 31 bytes so far
    static const uint8_t _k4[] = {0xdb, 0x08, 0x97, 0x65, 0xfa, 0x1a, 0x80};
    static const uint8_t _m4[] = {0x88, 0x3b, 0xf4, 0x17, 0xc9, 0x6e, 0xa1};

    // NOTE: For 55-character secrets, add segments 5-7 here.
    // Current fallback uses the 31-character master secret.

    int pos = 0;
    for (int i = 0; i < 8; i++) out[pos++] = (char)(_k1[i] ^ _m1[i]);
    for (int i = 0; i < 8; i++) out[pos++] = (char)(_k2[i] ^ _m2[i]);
    for (int i = 0; i < 8; i++) out[pos++] = (char)(_k3[i] ^ _m3[i]);
    for (int i = 0; i < 7; i++) out[pos++] = (char)(_k4[i] ^ _m4[i]);
    out[pos] = '\0';
}

// Token scrambling uses a different multi-byte mask (not the HMAC key)
static void _token_scramble(const char* input, char* output, size_t len) {
    // Binary-only mask for token XOR (16 bytes, no plaintext)
    static const uint8_t TM[] = {
        0xF1, 0x3A, 0xC7, 0x82, 0x5E, 0xD9, 0x44, 0xAB,
        0x67, 0x1D, 0xB8, 0x93, 0x4F, 0xE6, 0x2C, 0x70
    };
    for (size_t i = 0; i < len; i++) {
        output[i] = input[i] ^ TM[i % 16];
    }
}

DEVGUARD_EXPORT void generate_signature(const char* project_id, long long timestamp, char* output) {
    // Validate project_id length to prevent buffer truncation
    size_t pid_len = strlen(project_id);
    if (pid_len == 0 || pid_len > 200) {
        output[0] = '\0';
        return;
    }

    char secret_key[64];
    _reconstruct_key(secret_key);

    char payload[512];
    snprintf(payload, sizeof(payload), "%lld:%s", timestamp, project_id);

    uint8_t mac[32];
    hmac_sha256((const uint8_t*)secret_key, strlen(secret_key), (const uint8_t*)payload, strlen(payload), mac);

    // Scrub key from stack immediately
    memset(secret_key, 0, sizeof(secret_key));

    for (int i = 0; i < 32; i++) {
        sprintf(output + (i * 2), "%02x", mac[i]);
    }
    output[64] = '\0';
}

DEVGUARD_EXPORT int verify_response(const char* response_body, const char* signature) {
    char secret_key[64];
    _reconstruct_key(secret_key);

    uint8_t mac[32];
    hmac_sha256((const uint8_t*)secret_key, strlen(secret_key), (const uint8_t*)response_body, strlen(response_body), mac);

    // Scrub key from stack immediately
    memset(secret_key, 0, sizeof(secret_key));

    char expected_sig[65];
    for (int i = 0; i < 32; i++) {
        sprintf(expected_sig + (i * 2), "%02x", mac[i]);
    }
    expected_sig[64] = '\0';

    return strcmp(expected_sig, signature) == 0;
}

// Secure token scrambling for in-memory protection
DEVGUARD_EXPORT void secure_save_token(const char* token, char* output) {
    size_t len = strlen(token);
    _token_scramble(token, output, len);
    output[len] = '\0';
}

DEVGUARD_EXPORT void secure_get_token(const char* scrambled, char* output) {
    size_t len = strlen(scrambled);
    _token_scramble(scrambled, output, len);
    output[len] = '\0';
}

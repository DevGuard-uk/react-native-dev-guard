#ifndef DEVGUARD_CORE_H
#define DEVGUARD_CORE_H

#include <stdint.h>
#include <stddef.h>

#if _WIN32
#define DEVGUARD_EXPORT __declspec(dllexport)
#else
#define DEVGUARD_EXPORT __attribute__((visibility("default"))) __attribute__((used))
#endif

#ifdef __cplusplus
extern "C" {
#endif

// Generates an HMAC-SHA256 signature for a given project ID and timestamp.
// The secret key is embedded inside the compiled binary.
// output must be a buffer of at least 65 bytes (64 hex characters + null terminator).
DEVGUARD_EXPORT void generate_signature(const char* project_id, long long timestamp, char* output);

// Verifies a server response signature against the response body.
// Returns 1 if valid, 0 if invalid.
DEVGUARD_EXPORT int verify_response(const char* response_body, const char* signature);

// Secure token scrambling for in-memory protection.
// output must be a buffer of at least the length of token + 1.
DEVGUARD_EXPORT void secure_save_token(const char* token, char* output);
DEVGUARD_EXPORT void secure_get_token(const char* scrambled, char* output);

#ifdef __cplusplus
}
#endif

#endif // DEVGUARD_CORE_H

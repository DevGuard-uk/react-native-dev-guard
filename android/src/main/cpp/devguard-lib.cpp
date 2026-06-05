#include <jni.h>
#include <string>
#include "devguard_core.h"

extern "C" JNIEXPORT jstring JNICALL
Java_com_devguard_DevGuardModule_generateSignatureNative(
        JNIEnv* env,
        jobject /* this */,
        jstring projectId,
        jlong timestamp) {
    
    const char *project_id_c = env->GetStringUTFChars(projectId, 0);
    char output[65];
    
    generate_signature(project_id_c, (long long)timestamp, output);
    
    env->ReleaseStringUTFChars(projectId, project_id_c);
    
    return env->NewStringUTF(output);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_devguard_DevGuardModule_verifyResponseNative(
        JNIEnv* env,
        jobject /* this */,
        jstring responseBody,
        jstring signature) {
    
    const char *response_body_c = env->GetStringUTFChars(responseBody, 0);
    const char *signature_c = env->GetStringUTFChars(signature, 0);
    
    int result = verify_response(response_body_c, signature_c);
    
    env->ReleaseStringUTFChars(responseBody, response_body_c);
    env->ReleaseStringUTFChars(signature, signature_c);
    
    return result == 1 ? JNI_TRUE : JNI_FALSE;
}

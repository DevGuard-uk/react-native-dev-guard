package com.devguard

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactMethod

class DevGuardModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    init {
        System.loadLibrary("devguard")
    }

    override fun getName(): String {
        return "DevGuard"
    }

    private external fun generateSignatureNative(projectId: String, timestamp: Long): String
    private external fun verifyResponseNative(responseBody: String, signature: String): Boolean
    private external fun evaluatePolicyNative(blockEmulators: Int, isPhysical: Int, isCompromised: Int): Int

    @ReactMethod
    fun generateSignature(projectId: String, timestamp: Double, promise: Promise) {
        try {
            val sig = generateSignatureNative(projectId, timestamp.toLong())
            promise.resolve(sig)
        } catch (e: Exception) {
            promise.reject("DEVGUARD_ERROR", "Failed to generate signature", e)
        }
    }

    @ReactMethod
    fun verifyResponse(responseBody: String, signature: String, promise: Promise) {
        try {
            val isValid = verifyResponseNative(responseBody, signature)
            promise.resolve(isValid)
        } catch (e: Exception) {
            promise.reject("DEVGUARD_ERROR", "Failed to verify response", e)
        }
    }

    @ReactMethod
    fun evaluatePolicy(blockEmulators: Boolean, isPhysical: Boolean, isCompromised: Boolean, promise: Promise) {
        try {
            val code = evaluatePolicyNative(
                if (blockEmulators) 1 else 0,
                if (isPhysical) 1 else 0,
                if (isCompromised) 1 else 0,
            )
            promise.resolve(code)
        } catch (e: Exception) {
            promise.reject("DEVGUARD_ERROR", "Failed to evaluate policy", e)
        }
    }
}

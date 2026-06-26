"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginCrashReporter = void 0;
const react_native_1 = require("react-native");
const obf_1 = require("../internal/obf");
const sdkIdentity_1 = require("../constants/sdkIdentity");
const statusUrlResolver_1 = require("../utils/statusUrlResolver");
const secureDevGuardRequest_1 = require("../utils/secureDevGuardRequest");
const { DevGuard: DevGuardNative } = require('react-native').NativeModules;
class PluginCrashReporter {
    static projectId = null;
    static secret = null;
    static baseUrl = obf_1.Obf.defaultApiUrl;
    static metadataProvider = null;
    static configure(input) {
        this.projectId = input.projectId;
        this.secret = input.secret ?? null;
        this.baseUrl = (0, statusUrlResolver_1.resolveStatusUrl)(input.baseUrl);
        this.metadataProvider = input.metadataProvider ?? null;
    }
    static async report(input) {
        if (!this.projectId || !DevGuardNative?.generateSignature)
            return;
        try {
            const metadata = (await this.metadataProvider?.()) ?? {};
            const deviceId = metadata.deviceId;
            if (!deviceId)
                return;
            const timestamp = Date.now();
            const signature = await DevGuardNative.generateSignature(this.projectId, timestamp);
            const stackTrace = input.error instanceof Error ? input.error.stack : undefined;
            const body = {
                projectId: this.projectId,
                deviceId,
                errorMessage: input.error instanceof Error ? input.error.message : String(input.error),
                stackTrace,
                errorName: input.error instanceof Error ? input.error.name : 'Error',
                crashType: input.crashType || 'sdk_internal',
                isFatal: Boolean(input.isFatal),
                sdkRuntime: metadata.sdkRuntime || sdkIdentity_1.SDK_RUNTIME,
                sdkVersion: metadata.sdkVersion || sdkIdentity_1.SDK_VERSION,
                hostPlatform: metadata.hostPlatform || react_native_1.Platform.OS,
                hostPlatformVersion: metadata.hostPlatformVersion || String(react_native_1.Platform.Version),
                appVersion: metadata.version,
                occurredAt: new Date().toISOString(),
                clientMeta: input.context ? { context: input.context } : undefined,
            };
            const telemetryUrl = (0, statusUrlResolver_1.resolveStatusUrl)(this.telemetryUrl());
            await fetch(telemetryUrl, {
                method: 'POST',
                headers: (0, secureDevGuardRequest_1.buildDevGuardAuthHeaders)({
                    url: telemetryUrl,
                    secret: this.secret,
                    signature,
                    timestamp,
                }),
                body: JSON.stringify(body),
            });
        }
        catch {
            // Never block app flows on crash telemetry.
        }
    }
    static telemetryUrl() {
        const base = this.baseUrl.replace(/\/+$/, '');
        if (base.endsWith('/devguard')) {
            return base.replace(/\/devguard$/, '/api/v1/telemetry/plugin-crash');
        }
        return `${base}/api/v1/telemetry/plugin-crash`;
    }
}
exports.PluginCrashReporter = PluginCrashReporter;

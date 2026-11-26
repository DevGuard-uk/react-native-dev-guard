"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiagnosticBatchService = void 0;
const react_native_1 = require("react-native");
const crypto_js_1 = __importDefault(require("crypto-js"));
const obf_1 = require("../internal/obf");
const secureDevGuardRequest_1 = require("../utils/secureDevGuardRequest");
const statusUrlResolver_1 = require("../utils/statusUrlResolver");
const DiagnosticOutbox_1 = require("./DiagnosticOutbox");
const { DevGuard: DevGuardNative } = react_native_1.NativeModules;
class DiagnosticBatchService {
    static projectId;
    static secret;
    static baseUrl = obf_1.Obf.defaultApiUrl;
    static deviceIdProvider;
    static rateLimitUntilMs = 0;
    static configure(options) {
        this.projectId = options.projectId;
        this.secret = options.secret;
        this.baseUrl = options.baseUrl;
        this.deviceIdProvider = options.deviceIdProvider;
    }
    static isRateLimited() {
        return Date.now() < this.rateLimitUntilMs;
    }
    static getRateLimitRemainingSeconds() {
        const diff = this.rateLimitUntilMs - Date.now();
        return diff > 0 ? Math.ceil(diff / 1000) : 0;
    }
    static async flush(options = {}) {
        const maxRecords = options.maxRecords ?? 100;
        const maxBytes = options.maxBytes ?? 262144; // 256 KiB
        if (!this.projectId) {
            return {
                success: false,
                flushedCount: 0,
                ackedCount: 0,
                error: 'Not configured (missing projectId)',
            };
        }
        if (this.isRateLimited()) {
            return {
                success: false,
                flushedCount: 0,
                ackedCount: 0,
                error: 'Rate limited (Retry-After active)',
                retryAfterSeconds: this.getRateLimitRemainingSeconds(),
            };
        }
        const outbox = DiagnosticOutbox_1.DiagnosticOutbox.getInstance();
        const unacked = await outbox.getUnackedRecords(undefined, maxRecords);
        if (!unacked || unacked.length === 0) {
            return { success: true, flushedCount: 0, ackedCount: 0 };
        }
        let deviceId = 'unknown_device';
        if (this.deviceIdProvider) {
            try {
                const id = await this.deviceIdProvider();
                if (id)
                    deviceId = id;
            }
            catch (_) { }
        }
        // Pack batch up to maxBytes
        const batchRecords = [];
        let currentBytes = 0;
        for (const r of unacked) {
            const jsonStr = JSON.stringify(r);
            const recordBytes = new Blob([jsonStr]).size || jsonStr.length;
            if (batchRecords.length > 0 && currentBytes + recordBytes > maxBytes) {
                break;
            }
            batchRecords.push(r);
            currentBytes += recordBytes;
        }
        if (batchRecords.length === 0) {
            return { success: true, flushedCount: 0, ackedCount: 0 };
        }
        const batchPayloadStr = JSON.stringify(batchRecords);
        const shaDigest = crypto_js_1.default.SHA256(batchPayloadStr).toString();
        const kinds = Array.from(new Set(batchRecords.map((r) => r.kind)));
        const timestamp = Date.now().toString();
        const signature = await DevGuardNative.generateSignature(this.projectId, parseInt(timestamp, 10));
        try {
            // 1. Begin batch
            const beginUrl = (0, statusUrlResolver_1.resolveStatusUrl)(this.routeUrl('/api/v1/telemetry/diagnostic-batch/begin'));
            const beginHeaders = (0, secureDevGuardRequest_1.buildDevGuardAuthHeaders)({
                url: beginUrl,
                secret: this.secret,
                signature,
                timestamp,
                includeTunnel: true,
            });
            const beginResp = await fetch(beginUrl, {
                method: 'POST',
                headers: beginHeaders,
                body: JSON.stringify({
                    [obf_1.Obf.projectId]: this.projectId,
                    deviceId,
                    recordCount: batchRecords.length,
                    sha256: shaDigest,
                    kinds,
                    byteSize: currentBytes,
                }),
            });
            if (beginResp.status === 429) {
                this.applyRateLimit(beginResp);
                return {
                    success: false,
                    flushedCount: 0,
                    ackedCount: 0,
                    error: 'Rate limit 429 on begin',
                    retryAfterSeconds: this.getRateLimitRemainingSeconds(),
                };
            }
            if (!beginResp.ok) {
                return {
                    success: false,
                    flushedCount: 0,
                    ackedCount: 0,
                    error: `Begin returned HTTP ${beginResp.status}`,
                };
            }
            const beginJson = await beginResp.json();
            const batchId = beginJson.batchId;
            const mode = beginJson.mode || 'inline';
            if (!batchId) {
                return {
                    success: false,
                    flushedCount: 0,
                    ackedCount: 0,
                    error: 'Missing batchId in begin response',
                };
            }
            // 2. Commit batch (mode == 'inline')
            if (mode === 'inline') {
                const commitUrl = (0, statusUrlResolver_1.resolveStatusUrl)(this.routeUrl('/api/v1/telemetry/diagnostic-batch/commit'));
                const commitHeaders = (0, secureDevGuardRequest_1.buildDevGuardAuthHeaders)({
                    url: commitUrl,
                    secret: this.secret,
                    signature,
                    timestamp,
                    includeTunnel: true,
                });
                const commitResp = await fetch(commitUrl, {
                    method: 'POST',
                    headers: commitHeaders,
                    body: JSON.stringify({
                        [obf_1.Obf.projectId]: this.projectId,
                        deviceId,
                        batchId,
                        clientRecordIds: batchRecords.map((r) => r.clientRecordId),
                        records: batchRecords,
                    }),
                });
                if (commitResp.status === 429) {
                    this.applyRateLimit(commitResp);
                    return {
                        success: false,
                        batchId,
                        flushedCount: 0,
                        ackedCount: 0,
                        error: 'Rate limit 429 on commit',
                        retryAfterSeconds: this.getRateLimitRemainingSeconds(),
                    };
                }
                if (!commitResp.ok) {
                    return {
                        success: false,
                        batchId,
                        flushedCount: 0,
                        ackedCount: 0,
                        error: `Commit returned HTTP ${commitResp.status}`,
                    };
                }
                const commitJson = await commitResp.json();
                const acceptedIds = Array.isArray(commitJson.acceptedIds)
                    ? commitJson.acceptedIds
                    : [];
                if (acceptedIds.length > 0) {
                    await outbox.markAcked(acceptedIds, batchId);
                    await outbox.purgeExpiredAcked(48);
                }
                return {
                    success: true,
                    batchId,
                    flushedCount: batchRecords.length,
                    ackedCount: acceptedIds.length,
                };
            }
            return {
                success: true,
                batchId,
                flushedCount: batchRecords.length,
                ackedCount: 0,
            };
        }
        catch (e) {
            return {
                success: false,
                flushedCount: 0,
                ackedCount: 0,
                error: e?.message || String(e),
            };
        }
    }
    static applyRateLimit(resp) {
        let seconds = 60;
        const retryHeader = resp.headers.get('retry-after');
        if (retryHeader) {
            const parsed = parseInt(retryHeader, 10);
            if (!isNaN(parsed) && parsed > 0)
                seconds = parsed;
        }
        this.rateLimitUntilMs = Date.now() + seconds * 1000;
    }
    static routeUrl(endpointPath) {
        const base = this.baseUrl.replace(/\/+$/, '');
        if (base.endsWith('/devguard')) {
            return base.replace(/\/devguard$/, endpointPath);
        }
        return `${base}${endpointPath}`;
    }
    static resetRateLimitForTesting() {
        this.rateLimitUntilMs = 0;
    }
}
exports.DiagnosticBatchService = DiagnosticBatchService;

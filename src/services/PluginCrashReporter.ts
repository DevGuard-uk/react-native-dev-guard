import { Platform } from 'react-native';

import { Obf } from '../internal/obf';
import { SDK_RUNTIME, SDK_VERSION } from '../constants/sdkIdentity';
import { resolveStatusUrl } from '../utils/statusUrlResolver';
import { buildDevGuardAuthHeaders } from '../utils/secureDevGuardRequest';

const { DevGuard: DevGuardNative } = require('react-native').NativeModules;

type MetadataProvider = () => Promise<Record<string, any> | null>;

export class PluginCrashReporter {
  private static projectId: string | null = null;
  private static secret: string | null = null;
  private static baseUrl = Obf.defaultApiUrl;
  private static metadataProvider: MetadataProvider | null = null;

  static configure(input: {
    projectId: string;
    secret?: string | null;
    baseUrl?: string;
    metadataProvider?: MetadataProvider;
  }) {
    this.projectId = input.projectId;
    this.secret = input.secret ?? null;
    this.baseUrl = resolveStatusUrl(input.baseUrl);
    this.metadataProvider = input.metadataProvider ?? null;
  }

  static async report(input: {
    error: unknown;
    context?: string;
    isFatal?: boolean;
    crashType?: string;
  }) {
    if (!this.projectId || !DevGuardNative?.generateSignature) return;

    try {
      const metadata = (await this.metadataProvider?.()) ?? {};
      const deviceId = metadata.deviceId;
      if (!deviceId) return;

      const timestamp = Date.now();
      const signature = await DevGuardNative.generateSignature(this.projectId, timestamp);
      const stackTrace =
        input.error instanceof Error ? input.error.stack : undefined;

      const body = {
        projectId: this.projectId,
        deviceId,
        errorMessage:
          input.error instanceof Error ? input.error.message : String(input.error),
        stackTrace,
        errorName: input.error instanceof Error ? input.error.name : 'Error',
        crashType: input.crashType || 'sdk_internal',
        isFatal: Boolean(input.isFatal),
        sdkRuntime: metadata.sdkRuntime || SDK_RUNTIME,
        sdkVersion: metadata.sdkVersion || SDK_VERSION,
        hostPlatform: metadata.hostPlatform || Platform.OS,
        hostPlatformVersion: metadata.hostPlatformVersion || String(Platform.Version),
        appVersion: metadata.version,
        occurredAt: new Date().toISOString(),
        clientMeta: input.context ? { context: input.context } : undefined,
      };

      const telemetryUrl = resolveStatusUrl(this.telemetryUrl());
      await fetch(telemetryUrl, {
        method: 'POST',
        headers: buildDevGuardAuthHeaders({
          url: telemetryUrl,
          secret: this.secret,
          signature,
          timestamp,
        }),
        body: JSON.stringify(body),
      });
    } catch {
      // Never block app flows on crash telemetry.
    }
  }

  private static telemetryUrl(): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    if (base.endsWith('/devguard')) {
      return base.replace(/\/devguard$/, '/api/v1/telemetry/plugin-crash');
    }
    return `${base}/api/v1/telemetry/plugin-crash`;
  }
}

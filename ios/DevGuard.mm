#import "DevGuard.h"
#import "../cpp/devguard_core.h"

@implementation DevGuard

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(generateSignature:(NSString *)projectId
                  timestamp:(nonnull NSNumber *)timestamp
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        const char *project_id_c = [projectId UTF8String];
        long long timestamp_val = [timestamp longLongValue];
        char output[65];
        dg_x9(project_id_c, timestamp_val, output);
        NSString *result = [NSString stringWithUTF8String:output];
        resolve(result);
    } @catch (NSException *exception) {
        reject(@"DEVGUARD_ERROR", @"Failed to generate signature", nil);
    }
}

RCT_EXPORT_METHOD(verifyResponse:(NSString *)responseBody
                  signature:(NSString *)signature
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        const char *response_body_c = [responseBody UTF8String];
        const char *signature_c = [signature UTF8String];
        int isValid = dg_v2(response_body_c, signature_c);
        resolve(@(isValid == 1));
    } @catch (NSException *exception) {
        reject(@"DEVGUARD_ERROR", @"Failed to verify response", nil);
    }
}

RCT_EXPORT_METHOD(evaluatePolicy:(nonnull NSNumber *)blockEmulators
                  isPhysical:(nonnull NSNumber *)isPhysical
                  isCompromised:(nonnull NSNumber *)isCompromised
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    @try {
        int code = dg_e1(
            [blockEmulators intValue],
            [isPhysical intValue],
            [isCompromised intValue]
        );
        resolve(@(code));
    } @catch (NSException *exception) {
        reject(@"DEVGUARD_ERROR", @"Failed to evaluate policy", nil);
    }
}

@end

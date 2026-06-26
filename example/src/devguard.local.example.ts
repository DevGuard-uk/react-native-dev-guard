/**
 * Copy to `devguard.local.ts` for local simulator/device testing.
 * That file is gitignored — never commit real secrets.
 *
 * From repo root (requires Firebase service account in dev_guard_api/):
 *   node react-native-dev-guard/example/scripts/generate-devguard-local.js
 */
export const DEVGUARD_PROJECT_ID = 'your_project_id';
export const DEVGUARD_SECRET = 'YOUR_MASTER_SECRET';

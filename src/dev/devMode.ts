/**
 * Local UI development helpers.
 *
 * Fail-closed: ATRIUM_DEV_MODE=1 alone is never enough. Requires
 * NODE_ENV=development as well. Hosting / production never sets both.
 */

export const LOCAL_DEV_CONNECTION = 'local-dev-connection';
export const LOCAL_DEV_ACTOR = 'PER-local-dev';
export const LOCAL_DEV_API_BASE_URL = 'http://127.0.0.1:9';
export const LOCAL_DEV_SIGNING_SECRET = 'local-dev-signing-secret';
export const LOCAL_DEV_ORG_NAME = 'Local Dev Lettings';
export const LOCAL_DEV_PERSON_NAME = 'Alex Manager';
export const LOCAL_DEV_PERSON_EMAIL = 'alex@example.com';
export const LOCAL_DEV_PERSON_GUID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

/** Synthetic atrium_usage JWT claims for inlined /ui bootstrap (never probed). */
export function localDevUsageToken(connectionReference = LOCAL_DEV_CONNECTION): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      token_use: 'atrium_usage',
      personReference: LOCAL_DEV_ACTOR,
      connectionReference,
      organisationReference: 'org-local-dev',
    }),
  ).toString('base64url');
  return `${header}.${payload}.local-dev`;
}

/**
 * True only when both ATRIUM_DEV_MODE=1 and NODE_ENV=development.
 * Explicitly false when NODE_ENV=production even if ATRIUM_DEV_MODE is set.
 */
export function isAtriumDevMode(): boolean {
  if (process.env.ATRIUM_DEV_MODE !== '1') return false;
  if (process.env.NODE_ENV === 'production') return false;
  return process.env.NODE_ENV === 'development';
}

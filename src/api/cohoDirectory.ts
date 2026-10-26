/**
 * Resolve org + opening manager via Public API v1.1 for Tawk visitor login.
 * Capabilities: organisation.read (GET /organisation), users.read (GET /organisation/users).
 */

import {
  LOCAL_DEV_ORG_NAME,
  LOCAL_DEV_PERSON_EMAIL,
  LOCAL_DEV_PERSON_GUID,
  LOCAL_DEV_PERSON_NAME,
  isAtriumDevMode,
} from '../dev/devMode.js';

export interface VisitorIdentity {
  userId: string;
  name: string;
  email: string;
  organisationName: string;
  personName: string;
}

let outboundFetch: typeof fetch = globalThis.fetch.bind(globalThis);

export function setDirectoryFetch(impl: typeof fetch): void {
  outboundFetch = impl;
}

export function resetDirectoryFetch(): void {
  outboundFetch = globalThis.fetch.bind(globalThis);
}

async function getJson(
  apiBaseUrl: string,
  usageToken: string,
  path: string,
): Promise<{ ok: true; body: unknown } | { ok: false; status: number }> {
  const base = apiBaseUrl.replace(/\/+$/, '');
  const response = await outboundFetch(`${base}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${usageToken}`,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    try {
      await response.arrayBuffer();
    } catch {
      /* ignore */
    }
    return { ok: false, status: response.status };
  }
  try {
    return { ok: true, body: await response.json() };
  } catch {
    return { ok: false, status: response.status };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of ['items', 'Items', 'users', 'Users']) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function sameRef(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function personDisplayName(row: Record<string, unknown>): string {
  const forename = String(row.forename ?? row.Forename ?? row.firstName ?? '').trim();
  const surname = String(row.surname ?? row.Surname ?? row.lastName ?? '').trim();
  const combined = `${forename} ${surname}`.trim();
  if (combined) return combined;
  for (const key of ['fullName', 'name', 'displayName']) {
    const value = row[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

/**
 * Resolve the opening manager for Tawk_API.login.
 * userId = OrganisationPerson Guid (lowercased later at hash time).
 * name = "{org} - {person}" matching legacy LAS.
 */
export async function resolveVisitorIdentity(
  apiBaseUrl: string,
  usageToken: string,
  personReference: string,
): Promise<VisitorIdentity | null> {
  if (isAtriumDevMode()) {
    return {
      userId: LOCAL_DEV_PERSON_GUID,
      personName: LOCAL_DEV_PERSON_NAME,
      organisationName: LOCAL_DEV_ORG_NAME,
      email: LOCAL_DEV_PERSON_EMAIL.toLowerCase(),
      name: `${LOCAL_DEV_ORG_NAME} - ${LOCAL_DEV_PERSON_NAME}`,
    };
  }

  if (!apiBaseUrl || !usageToken || !personReference) return null;

  let organisationName = 'Organisation';
  try {
    const orgResult = await getJson(apiBaseUrl, usageToken, '/v1.1/public/organisation');
    if (orgResult.ok) {
      const org = asRecord(orgResult.body);
      const account = org
        ? String(org.accountName ?? org.AccountName ?? org.name ?? '').trim()
        : '';
      if (account) organisationName = account;
    }
  } catch (err) {
    console.warn('[atrium-lettings-advice] organisation lookup failed', err);
  }

  let usersBody: unknown;
  try {
    const usersResult = await getJson(apiBaseUrl, usageToken, '/v1.1/public/organisation/users');
    if (!usersResult.ok) {
      console.warn('[atrium-lettings-advice] users lookup rejected', {
        status: usersResult.status,
      });
      return null;
    }
    usersBody = usersResult.body;
  } catch (err) {
    console.warn('[atrium-lettings-advice] users lookup failed', err);
    return null;
  }

  for (const raw of asArray(usersBody)) {
    const row = asRecord(raw);
    if (!row) continue;
    const ref = String(row.personReference ?? row.PersonReference ?? row.reference ?? '').trim();
    if (!ref || !sameRef(ref, personReference)) continue;

    const guid = String(row.guid ?? row.Guid ?? '').trim();
    if (!guid) continue;

    const personName = personDisplayName(row) || 'Manager';
    const email = String(row.email ?? row.Email ?? '')
      .trim()
      .toLowerCase();

    return {
      userId: guid,
      personName,
      organisationName,
      email,
      name: `${organisationName} - ${personName}`,
    };
  }

  console.warn('[atrium-lettings-advice] opening person not found in organisation users', {
    personReference,
  });
  return null;
}

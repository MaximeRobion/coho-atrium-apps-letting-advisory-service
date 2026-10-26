# Atrium quality-gate status — atrium-lettings-advice

Checked against HouseShare `docs/feature-plans/atrium-quality-gate-checklist.md` (scaffold 2026-10-26). Automated evidence: `npm test`.

Remote: `CompanyForLife/atrium-lettings-advice` (`main`).

## Runtime contract

| Item | Status | Evidence |
|------|--------|----------|
| `GET /health` OK | **Pass** | `runtime.test.ts` |
| Setup stores secrets, 2xx | **Pass** | setup → SQLite `connections` |
| Disconnect clears org-scoped data | **Pass** | Wipe of connection row |
| Event/schedule handlers | **N/A (P0)** | Manifest schedules/events empty |
| Signature vectors + reject tamper | **Pass** | `signature.test.ts` |
| Public API only (no HouseShare DB) | **Pass** | SQLite under `ATRIUM_DATA_DIR` |
| Atrium logs POST | **Pass (code)** | `postAtriumLog` on setup/disconnect |

## Config / UI

| Item | Status | Evidence |
|------|--------|----------|
| Signed schema/get/put | **Pass** | Empty Draft 2020-12 object |
| Quick view iframe + CSP + close | **Pass** | `/ui`, Tawk-widened CSP, `atrium.quickView.close` |
| External configure | **N/A** | Not used |

## Manifest honesty

| Item | Status | Notes |
|------|--------|-------|
| Minimal capabilities | **Pass** | `organisation.read`, `users.read` |
| Event/schedule keys match | **Pass** | Both empty |
| HTTPS browserBaseUrl | **Pending Hosting** | Set on Labs register |

## Product (P0)

| Item | Status | Notes |
|------|--------|-------|
| Tawk chat embed | **Pass (code)** | Needs Hosting env IDs |
| Secure Mode hash | **Pass** | Degrades without `TAWK_API_KEY` |
| Document library | **Deferred** | Waiting on Julie docs URL |
| Billing UI | **Out of scope** | Entitlement = Store install |

## Hosting — remaining steps

1. Register **Hosted** app on Labs pointing at this GitHub repo + Dockerfile (`atrium-apps/lettings-advice`).
2. Inject env: `TAWK_PROPERTY_ID`, `TAWK_WIDGET_ID`, `TAWK_API_KEY` (and confirm Secure Mode enabled in Tawk admin).
3. Set `browserBaseUrl` to the public Hosting URL; keep runtime BaseUrl private.
4. List as **free** seed; connect with a manager who can grant the two read scopes; smoke health, home, chat, disconnect.
5. After internal gate sign-off, short-cut draft → listed for Labs dogfood.

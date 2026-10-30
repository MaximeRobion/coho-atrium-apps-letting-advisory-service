# Atrium quality-gate status — atrium-lettings-advice

Checked against HouseShare `docs/feature-plans/atrium-quality-gate-checklist.md` (updated 2026-10-29 pivot). Automated evidence: `npm test`.

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
| Quick view iframe + CSP + close | **Pass** | `/ui`, Tawk + KB CSP, `atrium.quickView.close` |
| External configure | **N/A** | Not used |

## Manifest honesty

| Item | Status | Notes |
|------|--------|-------|
| Minimal capabilities | **Pass** | `[]` — Secure Mode identity scopes removed |
| Event/schedule keys match | **Pass** | Both empty |
| HTTPS browserBaseUrl | **Pending Hosting** | Set on Labs register |

## Product

| Item | Status | Notes |
|------|--------|-------|
| Tawk chat embed | **Pass (code)** | Property/widget code defaults |
| Secure Mode hash | **Out** | Shared property; no `Tawk_API.login` |
| Document library | **Pass (code)** | Tawk KB `lettingadviceservice.tawk.help` |
| Billing UI | **Out of scope** | Entitlement = Store install (free) |

## Hosting — remaining steps

1. Register **Hosted** app on Labs pointing at this GitHub repo + Dockerfile (`atrium-apps/lettings-advice`).
2. Set public `TAWK_*` IDs via Hosting runtime secrets; do **not** enable Secure Mode.
3. Set `browserBaseUrl` to the public Hosting URL; keep runtime BaseUrl private.
4. List as **free** seed; smoke health, home, document library, chat, disconnect.
5. After internal gate sign-off, short-cut draft → listed for Labs dogfood.

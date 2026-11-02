# Atrium quality-gate status — atrium-lettings-advice

Checked against HouseShare `docs/feature-plans/atrium-quality-gate-checklist.md` and
`docs/feature-plans/atrium-store-listing-pack.md` (origin/master, including DEV-3249
seed-from-nothing). Runtime contract: `docs/atrium-app-developer-spec.md`.
Automated evidence: `npm test`. Icon: `npm run check:icon`.

Remotes (keep at the same SHA):

- `CompanyForLife/atrium-lettings-advice` (`main`)
- Labs fork `MaximeRobion/coho-atrium-apps-letting-advisory-service` (`main`)

## Runtime contract

| Item | Status | Evidence |
|------|--------|----------|
| `GET /health` OK | **Pass** | `runtime.test.ts` |
| Setup stores secrets, 2xx | **Pass** | setup → SQLite `connections` |
| Disconnect clears org-scoped data | **Pass** | Wipe of connection row |
| Event/schedule handlers | **N/A** | Manifest schedules/events empty |
| Signature vectors + reject tamper | **Pass** | `signature.test.ts` |
| Connection API key for background only | **Pass** | No background jobs; interactive uses usage token |
| Interactive Bearer usage token | **Pass** | `/ui`, `/api/tawk/*` |
| Public API only (no HouseShare DB) | **Pass** | SQLite under `ATRIUM_DATA_DIR` |
| Atrium logs POST | **Pass (code)** | `postAtriumLog` on setup/disconnect |

## Config / UI

| Item | Status | Evidence |
|------|--------|----------|
| Signed schema/get/put | **Pass** | Empty Draft 2020-12 object |
| Quick view iframe + CSP + close | **Pass** | `/ui`, Tawk + YouTube CSP, `ATRIUM_FRAME_ANCESTORS` / `ATRIUM_PARENT_ORIGIN` |
| Hosted HTTPS `browserBaseUrl` | **Pass (Labs)** | `manifest.json` → `letting-advi-ce2992b1.labs.coho.software` |
| External configure | **N/A** | Not used |
| Light prefs unused | **Documented** | Empty schema; no product prefs |

## Manifest honesty

| Item | Status | Notes |
|------|--------|-------|
| Repo-root `manifest.json` | **Pass** | Seed script reads it; `manifest.example.json` is paste-only |
| Minimal capabilities | **Pass** | `[]` — Secure Mode identity scopes removed |
| Event/schedule keys match | **Pass** | Both empty |
| HTTPS BaseUrl | **Hosting** | Set after provision; do not invent local BaseUrl in catalogue seed |
| `runtimeEnv` TAWK_* | **Pass** | Property + widget required; API key optional/unused |

## Ops

| Item | Status | Notes |
|------|--------|-------|
| Support ownership | **Pass** | COHO seed (README) |
| No secrets in catalogue copy | **Pass** | Listing pack has no secrets |
| Health degrade / pause | **Platform** | App returns OK/not-OK; Store three-strike is host-owned |

## Store listing pack (COHO seed)

| Item | Status | Notes |
|------|--------|-------|
| `store/listing.md` §20.3 fields | **Pass** | Includes Data location + Permission reasons |
| `store/icon.png` + `icon-brief.md` | **Pass** | `npm run check:icon` |
| `store/screenshot.png` | **Pass** | Documents home (local signed/dev launch) |
| `store/seed.json` | **Pass** | Stable Guid + CFL `githubUrl` |
| `Dockerfile` | **Pass** | `PORT` + `ATRIUM_DATA_DIR=/data`, UID 65532 |
| Price | **Labs set** | Flat GBP 70 via `update-listing` (`store/pricing.md`) |

## Product

| Item | Status | Notes |
|------|--------|-------|
| Tawk floating bubble | **Pass** | Env-only IDs; `autoStart` for Inline; no Secure Mode |
| Documents catalogue | **Pass** | Guides / free templates / YouTube videos |
| Out-of-hours notice | **Pass** | Hard-coded London hours; does not change Julie’s Tawk admin |
| Billing UI | **Out of scope** | Entitlement = Store monthly install |

## Hosting / catalogue (ops)

1. Seed / refresh listing from HouseShare with `scripts/register-atrium-seed-store-packs-labs.sh` when catalogue row or pack copy needs updating (Listed+Public for COHO seeds; no SA approve click).
2. Keep Hosting runtime secrets: `TAWK_PROPERTY_ID`, `TAWK_WIDGET_ID` (required). Do **not** enable Secure Mode.
3. Confirm `/health` on the Labs subdomain after Hosted Update.
4. Publisher disclosures stay on the COHO publisher profile (stock answers).

# atrium-lettings-advice

COHO Atrium seed app for the **Lettings Advice Service** (Julie’s Tawk.to chat + Documents catalogue).

Private product app under `CompanyForLife/atrium-lettings-advice`. It is **not** part of the HouseShare monorepo. Persistent state is **SQLite** under `ATRIUM_DATA_DIR` (Hosting: `/data` on EFS) and holds **connection secrets only**. Support ownership: **COHO** (internal seed).

Linear: [DEV-2840](https://linear.app/teamcoho/issue/DEV-2840/lettings-advice-service-integration).

## Scope

- **Web app** quick view (`/ui`, `openPresentation: modal`): Documents page with a floating Tawk bubble (same pattern as [Julie’s livechat page](https://lettingsadviceservice.co.uk/livechat); shell X closes — no footer Back/Close). No Documents/Chat tab strip.
- Chat = Tawk **Inline** floating widget at `https://embed.tawk.to/{TAWK_PROPERTY_ID}/{TAWK_WIDGET_ID}` (code defaults to Julie’s LAS property/widget). Do **not** set `Tawk_API.embedded` on Julie’s Inline widget IDs — that collapses the composer and blocks sends.
- **Documents** = static catalogue scraped from Julie’s site (`src/documents/catalogue.ts`): Guides (all), Templates (free only — paid “Buy for …” skipped), Videos (YouTube links from Julie’s library). UI: three category cards → searchable list → View / Download / Watch. Files are **not** hosted in this app. The old Tawk Knowledge Base iframe is removed.
- **Out of hours:** Hard-coded `Europe/London` hours matching Julie’s site (Mon–Fri 10:00–16:00, Sat 10:00–13:00, Sun closed). When closed, the app shows an out-of-hours notice and does **not** show Tawk (so the offline ticket form never appears). When open, the bubble loads with `autoStart=false`; if `getStatus` / `onStatusChange` reports `offline`, the notice appears and the bubble is hidden. These app hours can **drift** from Julie’s Tawk Widget Scheduler — update `src/chatHours.ts` (and `src/ui/components/shared/chat-hours.js`) when her site schedule changes. Do not change Julie’s Tawk dashboard for this. Documents stay available.

- **Entitlement = Store install** (listed free until commercial terms + Store billing). No in-app billing, cancel, or tracking UI.
- **Secure Mode / visitor login is out** — another team shares the same Tawk property. Do **not** enable Secure Mode in Tawk admin for this app. The app does **not** call `Tawk_API.login`. `TAWK_API_KEY` is optional/unused; hash helpers remain as dead code only.

## Stack

- Node.js 22+ (built-in `node:sqlite`)
- TypeScript
- Atrium Hosting image contract: `linux/amd64`, `PORT=8080`, `ATRIUM_DATA_DIR=/data`, UID `65532`, image name `atrium-apps/lettings-advice`

## Capabilities

None required for the current chat + document library shell (`requestedCapabilities: []`). Store install alone is the entitlement. Public API identity scopes were only needed for Secure Mode visitor login (removed).

No product webhooks or schedules in this release.

## Environment

Copy [`.env.example`](./.env.example). **Never commit `.env` or real secrets.**

| Variable | Purpose |
|----------|---------|
| `ATRIUM_SETUP_SECRET` | Bootstrap secret for `lifecycle.setup` (Hosting injects) |
| `ATRIUM_DATA_DIR` | SQLite directory (`./data` local, `/data` Hosting) |
| `ATRIUM_FRAME_ANCESTORS` / `ATRIUM_PARENT_ORIGIN` | Hosting injects for iframe CSP / postMessage |
| `TAWK_PROPERTY_ID` | Tawk property id (code default: Julie’s LAS property) |
| `TAWK_WIDGET_ID` | Chat widget id (code default: Julie’s LAS chat widget) |
| `TAWK_KNOWLEDGE_BASE_URL` | Unused by the UI (KB iframe removed). Kept on `/api/tawk/config` for compatibility |
| `TAWK_API_KEY` | Unused (Secure Mode out). Leave empty; never commit a real key |

COHO Public API base URL comes from `lifecycle.setup` (`data.apiBaseUrl`), not from env.

## Hosting secrets / Tawk (Labs → Prod)

Platform injects `PORT`, `ATRIUM_DATA_DIR`, `ATRIUM_FRAME_ANCESTORS`, `ATRIUM_PARENT_ORIGIN`, and `ATRIUM_SETUP_SECRET` on every provision. Anything else (including optional Tawk overrides) belongs in **Hosting runtime secrets** — Liam’s durable key/value map (HouseShare [#5763](https://github.com/CompanyForLife/HouseShare/pull/5763) / [#5765](https://github.com/CompanyForLife/HouseShare/pull/5765)). Saving the map on a Ready hosted app re-provisions and injects each key as container env from the per-app Secrets Manager `Env` document. Do **not** hand-edit ECS task definitions: the next Hosted Update wipes them.

Chat works from **code defaults** for Julie’s public property/widget IDs when those keys are unset. Local/dev still forces the COHO test widget (see Local UI).

### Runtime vars

| Variable | Notes |
|----------|--------|
| `TAWK_PROPERTY_ID` | Optional override. Hosting default: Julie `687cb5a73606072bf84a6030`. |
| `TAWK_WIDGET_ID` | Optional override. Hosting default: Julie `1j0jib5sb`. |
| `TAWK_API_KEY` | **Unused** (Secure Mode out). Leave unset; do not enable Secure Mode on this shared property. |

Do **not** put secrets in Store light/native config, catalogue copy, or the image.

### Set / clear Hosting runtime secrets

- **UI:** My apps / partner portal / organisation Store manage / Super Admin review — **Hosting runtime secrets** editor
- **API:** `PUT /v1.1/public/atrium/apps/{appReference}/runtime-env` (full-replace map); `DELETE …/runtime-env/{keyName}` for one key
- **MCP:** `PutAtriumRuntimeEnv` / `DeleteAtriumRuntimeEnvKey` (and publisher variants)
- Values are write-only on list endpoints. Reserved names (`PORT`, `ATRIUM_*`, `AWS_*`, …) cannot be overridden.
- Manifest may declare expected keys via `runtimeEnv` (see `manifest.example.json`). This app does **not** mark Tawk keys `required` — defaults cover Hosting.

### Labs (ops checklist)

1. Register the Hosted app on Labs Store (GitHub + Dockerfile) and wait until provision state is **Ready**.
2. Browser host is `{slug}.labs.coho.software` (this app: `letting-advi-ce2992b1.labs.coho.software`).
3. Prefer code defaults for Julie’s public IDs. Only set `TAWK_*` in **Hosting runtime secrets** if you need an override — then save (Ready apps re-provision automatically).
4. **Do not** enable Tawk Secure Mode for dogfood.
5. After a Hosted Update, check the runtime-secrets editor (or SM `Env`) if you previously relied on hand-edited ECS env — those keys are gone unless they live in runtime secrets.

### Prod (same checklist before go-live)

1. Confirm Hosted app is Ready on the production Hosting cluster.
2. Prefer code defaults for public widget IDs; override via runtime secrets only if needed.
3. Do **not** enable Secure Mode on the shared property.

## Local UI

```bash
npm install
npm run dev
```

Prints a localhost `/ui` URL (unsigned; requires `NODE_ENV=development` + `ATRIUM_DEV_MODE=1`).

Local/dev **always** loads the COHO test Inline widget (`6ae3a7494dfe83347f02ef1a` / `1k64katug`) and force-opens chat (hours/offline gate skipped; panel maximized). Hosting/production still uses Julie’s LAS defaults. Set `ATRIUM_DEV_FORCE_CHAT_OPEN=0` only if you need to dogfood the out-of-hours panel locally.

| Goal | Command |
|------|---------|
| Start (seed connection on boot) | `npm run dev` |
| Restart TS on change | `npm run dev:watch` |
| Tests | `npm test` |
| Typecheck | `npm run typecheck` |

## Run locally (signed / Hosting-shaped)

```bash
npm install
export ATRIUM_SETUP_SECRET=dev-setup-secret
export ATRIUM_DATA_DIR=./data
export PORT=8080
npm start
```

- Health: `GET http://localhost:8080/health`
- Quick view (signed launch): `GET /ui?connectionReference=…&atriumUsageToken=…&atriumSignature=…`
- Tawk config: `GET /api/tawk/config` with Bearer usage token
- Manifest example: [`manifest.example.json`](./manifest.example.json)

## Secure Mode (out of scope)

Do **not** enable Secure Mode in Tawk admin for this property (shared with another team). This app never calls `Tawk_API.login`. Historical HMAC helper code may remain in-tree as dead code; it is not exposed on a product route.

## CSP

`/ui` keeps Hosting `frame-ancestors` and widens `script-src` / `style-src` / `frame-src` / `connect-src` / `img-src` for `embed.tawk.to` and `*.tawk.to` (including `wss://` on connect). `style-src` must include the Tawk hosts so widget CSS (`max-widget.css`) loads. `frame-src` / `child-src` also allow YouTube for document videos. The Tawk Knowledge Base host is no longer framed. Keys-style tight CSP would block chat.

### postMessage parent origin

The app posts `atrium.quickView.ready` / `close` and accepts `atrium.quickView.theme` only against `PARENT_ORIGIN` from Hosting `ATRIUM_PARENT_ORIGIN` (see `src/ui/quickView.ts`). App code does not hard-code `applabs.coho.management`. If the console shows a postMessage origin mismatch between the Store shell (`applabs.coho.management`) and the app host (`letting-advice*.labs.coho.software`), that is a Hosting / Store `ATRIUM_PARENT_ORIGIN` injection issue — out of app scope unless the wrong origin is baked into this repo.

## Dockerfile

```bash
docker build --platform linux/amd64 -t atrium-apps/lettings-advice .
```

Hosting injects `ATRIUM_*` / `PORT` only. Do not bake secrets into the image.

## Design

`design/` is the COHO Atrium design kit (from HouseShare `samples/atrium/hello-node/design/`). See [`AGENTS.md`](./AGENTS.md). Store catalogue copy lives under [`assets/`](./assets/).

## Remotes / Labs

Canonical source of truth is the CompanyForLife org repo. The personal Labs clone is the deploy target for Atrium Labs dogfood — keep both `main` branches at the same SHA.

| Remote | URL | Role |
|--------|-----|------|
| `origin` (fetch) | `https://github.com/CompanyForLife/atrium-lettings-advice.git` | Canonical / org |
| `labs` (fetch) | `https://github.com/MaximeRobion/coho-atrium-apps-letting-advisory-service.git` | Personal Labs clone |
| `origin` (push, dual) | both URLs above | One `git push` updates org + Labs |

### One-time setup (after clone)

```bash
git remote rename origin company   # optional; or keep origin as org
# Prefer keeping origin = org, then:
git remote add labs https://github.com/MaximeRobion/coho-atrium-apps-letting-advisory-service.git
git remote set-url --add --push origin https://github.com/CompanyForLife/atrium-lettings-advice.git
git remote set-url --add --push origin https://github.com/MaximeRobion/coho-atrium-apps-letting-advisory-service.git
```

Verify:

```bash
git remote -v
# origin  …/CompanyForLife/atrium-lettings-advice.git (fetch)
# origin  …/CompanyForLife/atrium-lettings-advice.git (push)
# origin  …/MaximeRobion/coho-atrium-apps-letting-advisory-service.git (push)
# labs    …/MaximeRobion/coho-atrium-apps-letting-advisory-service.git (fetch)
```

### Everyday push

```bash
git push origin main
# or simply: git push
```

That pushes `main` to **both** remotes because of the dual push URLs on `origin`.

Fetch Labs history when needed: `git fetch labs`. Never force-push the org remote. If Labs drifts and Maxime intentionally wants it realigned from org `main`, use `git push --force-with-lease labs main` only (Labs target), after confirming overwrite is expected.

Optional alias (shell profile):

```bash
alias git-pushall='git push origin'
```

(With dual push URLs configured, `git push origin` already means “pushall”.)

## Support ownership

COHO owns this seed (bugs, Hosting, Store listing). Chat content and history live in Julie’s Tawk property; disconnect only wipes this app’s connection secrets. No manager PII is sent to Tawk via Secure Mode login from this app.

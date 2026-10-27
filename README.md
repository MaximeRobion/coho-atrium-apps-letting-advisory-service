# atrium-lettings-advice

COHO Atrium seed app for the **Lettings Advice Service** (Julie’s Tawk.to chat).

Private product app under `CompanyForLife/atrium-lettings-advice`. It is **not** part of the HouseShare monorepo. Persistent state is **SQLite** under `ATRIUM_DATA_DIR` (Hosting: `/data` on EFS) and holds **connection secrets only**. Support ownership: **COHO** (internal seed).

Linear: [DEV-2840](https://linear.app/teamcoho/issue/DEV-2840/lettings-advice-service-integration).

## P0 scope

- **Web app** quick view (`/ui`, `openPresentation: modal`): Home → Chat embed.
- Chat = Tawk widget at `https://embed.tawk.to/{TAWK_PROPERTY_ID}/{TAWK_WIDGET_ID}`.
- **Entitlement = Store install** (listed free until commercial terms + Store billing). No in-app billing, cancel, or tracking UI.
- **Secure Mode** visitor login when `TAWK_API_KEY` is set: HMAC-SHA256 hex of lowercased OrganisationPerson Guid; `Tawk_API.login({ userId, hash, name: "{org} - {person}", email })`.
- If `TAWK_API_KEY` is missing (or Secure Mode is off in Tawk admin), the widget still loads — login is skipped.
- **Document library deferred** until Julie confirms the canonical docs URL.

## Stack

- Node.js 22+ (built-in `node:sqlite`)
- TypeScript
- Atrium Hosting image contract: `linux/amd64`, `PORT=8080`, `ATRIUM_DATA_DIR=/data`, UID `65532`, image name `atrium-apps/lettings-advice`

## Capabilities

- `organisation.read` — org display name for visitor `name`
- `users.read` — resolve opening manager (`personReference` → Guid / name / email)

No product webhooks or schedules in P0.

## Environment

Copy [`.env.example`](./.env.example). **Never commit `.env` or real secrets.**

| Variable | Purpose |
|----------|---------|
| `ATRIUM_SETUP_SECRET` | Bootstrap secret for `lifecycle.setup` (Hosting injects) |
| `ATRIUM_DATA_DIR` | SQLite directory (`./data` local, `/data` Hosting) |
| `ATRIUM_FRAME_ANCESTORS` / `ATRIUM_PARENT_ORIGIN` | Hosting injects for iframe CSP / postMessage |
| `TAWK_PROPERTY_ID` | Tawk property id (code default: Julie’s LAS property) |
| `TAWK_WIDGET_ID` | Chat widget id (code default: Julie’s LAS chat widget) |
| `TAWK_API_KEY` | Secure Mode JavaScript API key (env-only; degrade without it) |

COHO Public API base URL comes from `lifecycle.setup` (`data.apiBaseUrl`), not from env.

## Hosting secrets / Tawk (Labs → Prod)

There is **no Store UI, Super Admin form, or Hosting console** for custom per-app env today. The provision worker only injects platform vars (`PORT`, `ATRIUM_DATA_DIR`, `ATRIUM_FRAME_ANCESTORS`, `ATRIUM_PARENT_ORIGIN`, and `ATRIUM_SETUP_SECRET` from SM). Third-party secrets such as Tawk must be set by **ops on ECS / Secrets Manager** after the Hosted app is **Ready**.

### Required runtime vars

| Variable | Notes |
|----------|--------|
| `TAWK_PROPERTY_ID` | Public embed id. App falls back to `687cb5a73606072bf84a6030` if unset. |
| `TAWK_WIDGET_ID` | Public embed id. App falls back to `1j0jib5sb` if unset. |
| `TAWK_API_KEY` | Secure Mode JavaScript API key. **Never commit.** Env/SM only; widget still loads without it (no visitor `login`). |

Do **not** put `TAWK_API_KEY` in Store light/native config, catalogue copy, or the image.

### Labs (ops checklist)

1. Register the Hosted app on Labs Store (GitHub + Dockerfile) and wait until provision state is **Ready**.
2. Note the app slug / ECS service (Labs naming: `atrium-labs-<slug>`, cluster `AtriumHosting-LABS`, region `eu-west-2`). Browser host is `{slug}.labs.coho.software`.
3. Add container env on the task definition (preserve existing `ATRIUM_*` / `PORT` / SM `ATRIUM_SETUP_SECRET`):
   - `TAWK_PROPERTY_ID=687cb5a73606072bf84a6030`
   - `TAWK_WIDGET_ID=1j0jib5sb`
   - `TAWK_API_KEY=<from ops vault / project store — never git>`
4. Prefer mapping `TAWK_API_KEY` from Secrets Manager as an ECS `secrets` entry when IAM allows; plaintext env on Labs is acceptable for dogfood only and must be documented as temporary.
5. Register a new task definition revision, update the service, wait until stable.
6. **Re-apply after every Hosted Update / re-provision** — `worker.sh` rewrites the task definition and only injects `ATRIUM_*` / `PORT`. Manual `TAWK_*` is wiped until the provisioner supports custom env.
7. Enable **Tawk Secure Mode** in Tawk admin before relying on hashed visitor login (see Secure Mode notes below).

### Prod (same checklist before go-live)

1. Confirm Hosted app is Ready on the production Hosting cluster.
2. Set `TAWK_PROPERTY_ID`, `TAWK_WIDGET_ID`, and `TAWK_API_KEY` on the prod task definition (prefer SM for the API key).
3. Never commit the API key; rotate if it was ever pasted into chat or a ticket.
4. Enable Tawk Secure Mode for the property before launch.
5. Expect the same re-apply after Hosted Update/re-provision until product supports custom Hosting env.

## Local UI

```bash
npm install
# Optional: export TAWK_PROPERTY_ID=… TAWK_WIDGET_ID=… TAWK_API_KEY=…
npm run dev
```

Prints a localhost `/ui` URL (unsigned; requires `NODE_ENV=development` + `ATRIUM_DEV_MODE=1`).

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
export TAWK_PROPERTY_ID=…
export TAWK_WIDGET_ID=…
# export TAWK_API_KEY=…   # optional
npm start
```

- Health: `GET http://localhost:8080/health`
- Quick view (signed launch): `GET /ui?connectionReference=…&atriumUsageToken=…&atriumSignature=…`
- Visitor payload: `GET /api/tawk/visitor` with Bearer usage token
- Manifest example: [`manifest.example.json`](./manifest.example.json)

## Secure Mode notes

1. Enable **Secure Mode** in the Tawk admin for the property before dogfood (it was disabled when credentials were collected).
2. Hash message = OrganisationPerson **Guid** string, lowercased (legacy LAS behaviour) — not email.
3. Display name = `{AccountName} - {Forename Surname}`; email lowercased.
4. Without `TAWK_API_KEY`, `/api/tawk/visitor` returns `secureModeEnabled: false` and `login: null`; the UI still embeds the widget.

## CSP

`/ui` keeps Hosting `frame-ancestors` and widens `script-src` / `frame-src` / `connect-src` / `img-src` for `embed.tawk.to` and `*.tawk.to` (including `wss://`). Keys-style tight CSP would block the widget.

## Dockerfile

```bash
docker build --platform linux/amd64 -t atrium-apps/lettings-advice .
```

Hosting injects `ATRIUM_*` / `PORT` only. Ops sets `TAWK_*` on ECS/SM (see **Hosting secrets / Tawk** above). Do not bake secrets into the image.

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

COHO owns this seed (bugs, Hosting, Store listing). Chat content and history live in Julie’s Tawk property; disconnect only wipes this app’s connection secrets. PII (name / email / org label) is sent to Tawk when Secure Mode login runs.

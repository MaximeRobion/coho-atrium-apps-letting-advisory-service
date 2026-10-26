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
| `TAWK_PROPERTY_ID` | Tawk property id |
| `TAWK_WIDGET_ID` | Chat widget id |
| `TAWK_API_KEY` | Secure Mode JavaScript API key (optional; degrade without it) |

COHO Public API base URL comes from `lifecycle.setup` (`data.apiBaseUrl`), not from env.

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

Hosting injects `ATRIUM_SETUP_SECRET` and Tawk env. Do not bake secrets into the image.

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

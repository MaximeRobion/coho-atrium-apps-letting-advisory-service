# Store listing pack

Catalogue copy and images for the COHO Store, kept in git so the seed-from-nothing
script (and whoever edits the listing) has one place to copy from.

**COHO seeds:** this folder is required. Process:
[atrium-store-listing-pack.md](https://github.com/CompanyForLife/HouseShare/blob/master/docs/feature-plans/atrium-store-listing-pack.md)
(updated for DEV-3249 seed-from-nothing). Icon, screenshot, and copy rules: design kit section 20.
Quality gate: [atrium-quality-gate-checklist.md](https://github.com/CompanyForLife/HouseShare/blob/master/docs/feature-plans/atrium-quality-gate-checklist.md).

| File | Status |
|---|---|
| `listing.md` | Every §20.3 field (including Data location + Permission reasons). |
| `pricing.md` | Flat monthly **GBP 70** net; COHO platform share **20%**; how to set via `update-listing`. |
| `seed.json` | Stable `appGuid` + `githubUrl` for catalogue seed-from-nothing. |
| `icon-brief.md` | Notes how `icon.png` was produced from Julie’s site favicon. |
| `icon.png` | 1024×1024 opaque RGB from https://lettingsadviceservice.co.uk. `npm run check:icon`. |
| `screenshot.png` | Documents quick view (Guides home). Re-capture: `node --import tsx scripts/capture-store-screenshot.mjs` (or `npm run screenshot -- '<signed-url>' store/screenshot.png`). |

Also required at repo root for the batch seed script: `manifest.json` + `Dockerfile`.

Without `screenshot.png`, readiness is **draft** and the seed script skips unless `LIST_DRAFTS=1`.

Runtime manifest is repo-root [`manifest.json`](../manifest.json) (seedable) plus [`manifest.example.json`](../manifest.example.json) (partner paste). Do not put listing copy or price in the manifest — price is a Store listing field (`priceType` + `price`).

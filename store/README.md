# Store listing pack

Catalogue copy and images for the COHO Store, kept in git so whoever uploads the listing has one place to copy from.

**COHO seeds:** this folder is the internal handoff. Process: [atrium-store-listing-pack.md](https://github.com/CompanyForLife/HouseShare/blob/master/docs/feature-plans/atrium-store-listing-pack.md). Icon, screenshot, and copy rules: design kit section 20.

| File | Status |
|---|---|
| `listing.md` | Lettings Advice Service Store copy (from `assets/app-details.json`). |
| `icon-brief.md` | Notes how `icon.png` was produced from Julie’s site favicon. |
| `icon.png` | 1024×1024 opaque RGB from https://lettingsadviceservice.co.uk (link rel=icon / og:image). Checked with `node design/check-icon.cjs store/icon.png`. |
| `screenshot.png` | **Not shipped yet.** Needs a signed `/ui` launch URL when ready. |

Runtime manifest stays at `assets/manifest.json` / root `manifest.example.json` (Hosting / connect). Do not put listing copy there.

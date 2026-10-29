# Store assets

Runtime manifest and legacy listing metadata. Prefer the atrium-keys-style pack under [`../store/`](../store/) (`icon.png`, `listing.md`) when uploading Store listing art.

| File | Purpose |
|------|---------|
| `manifest.json` | Runtime contract (health, capabilities, triggers, quick view). Same shape as root `manifest.example.json`. |
| `app-details.json` | Store listing fields (name, intro, category, descriptions, prerequisites, background tasks). |
| `logo.png` | Square logo (same art as `store/icon.png`). Julie’s site favicon / og:image, padded and scaled to 1024×1024. |

## `app-details.json` fields

| Field | Store UI | Notes |
|-------|----------|--------|
| `name` | App name | Required |
| `shortName` | Short name | Optional; defaults to app name |
| `intro` | Intro | Short catalogue blurb |
| `category` | Category | One of: `""` (no category), `lettings`, `money`, `property`, `people`, `compliance`, `insight` |
| `logo` | Logo | Filename in this folder |
| `fullDescription` | Full description | Optional longer Store detail |
| `whatItCanDo` | What it can do | Optional customer-facing capabilities |
| `prerequisites` | Pre-requisites | Optional; what customers need before connecting |
| `backgroundTasks` | Background tasks | Optional; disclose work that may affect COHO performance |

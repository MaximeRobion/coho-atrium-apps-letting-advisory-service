# Full name

Lettings Advice Service

# Short name

Lettings Advice

# Intro description

Julie's Lettings Advice Service inside COHO: browse guides, free templates, and videos, then chat with the advice team when they are online.

# Full description

Bring Julie's Lettings Advice Service into COHO for your organisation. Managers open a signed Store quick view and get the Documents library (guides, downloadable free templates, and video tutorials from Julie's catalogue) plus live chat with the advice team via Tawk.to when they are in hours.

Entitlement is a Store install billed as a flat monthly catalogue price (GBP 70 net; see `store/pricing.md`). There is no one-off fee and no in-app billing UI. Secure Mode visitor login is not used; the Tawk property is shared with another team. Chat needs `TAWK_PROPERTY_ID` and `TAWK_WIDGET_ID` in Hosting runtime secrets.

# Category

Lettings

# What's new

Store pack refreshed with the LAS house/headset logo and a Documents quick-view screenshot (guides, templates, videos). Product: Julie's catalogue plus in-hours Tawk chat with an out-of-hours notice. Billing stays flat monthly GBP 70 via Atrium Store monthly billing.

# What it can do

- Open a signed quick view from the COHO Store
- Browse Julie's guides, free templates, and video tutorials without leaving COHO
- Download free templates from the Documents catalogue
- Chat with the Lettings Advice Service team when they are online (out-of-hours notice when closed)
- Disconnect clears this app's connection secrets from SQLite

# Pre-requisites

Connect from the COHO Store (card required for a paid install). No Public API capability grants are required for the current chat + Documents scope. Set `TAWK_PROPERTY_ID` and `TAWK_WIDGET_ID` in Hosting runtime secrets (required for chat). The Secure Mode API key is unused.

# Background tasks

None in P0. No product schedules or domain event webhooks. Entitlement is the Store connection only; there is no in-app billing UI.

# Data location

AWS London

# Permission reasons

None - `requestedCapabilities` is empty. Chat and Documents do not call the Public API in this release.

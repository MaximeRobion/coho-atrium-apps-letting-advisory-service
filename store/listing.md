# Full name

Lettings Advice Service

# Short name

Lettings Advice

# Intro description

Expert advice for lettings professionals

# Full description

Get straight answers from TV property expert Julie Ford and her team.

Open Lettings Advice Service in COHO to browse Julie's library of guides, free templates, and help videos, and to chat with her team when they are online. When chat is closed, the app shows when they are next available.

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

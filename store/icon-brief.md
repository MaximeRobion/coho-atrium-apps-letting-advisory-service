# Icon brief

Store listing icon for Lettings Advice Service.

## Source

Julie’s public site favicon / Open Graph image:

- HTML: `<link rel="icon" href="/images/40add1a7-669a-40e1-9313-659a0977fdb2.png" type="image/png">`
- Also referenced as `og:image` / `twitter:image` on https://lettingsadviceservice.co.uk/
- Fallback checked: `/favicon.ico` (smaller), `/apple-touch-icon.png` (SPA HTML, not an icon)

Original download: 914×780 RGBA PNG. For Store §20.1 / atrium-keys `store/icon.png` path it was:

1. Padded to a square on sampled white edge background (`#ffffff`)
2. Flattened to opaque RGB
3. Lanczos-upscaled to **1024×1024**
4. Verified with `node design/check-icon.cjs store/icon.png`

Same pixels also saved as `assets/logo.png` for `app-details.json` (`"logo": "logo.png"`).

## Compose fallback (not used)

```bash
node design/make-icon.cjs --background '#CEE2FF' --glyph icon-document --out store/icon.png
node design/check-icon.cjs store/icon.png
```

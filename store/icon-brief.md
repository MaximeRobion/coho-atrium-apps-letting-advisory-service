# Icon brief

Store listing icon for Lettings Advice Service.

## Source

Project media logo supplied for Store packing:

- Agent Store `media/las-app-logo.png` (LAS house + headset mark, 914x780 RGBA)
- Same mark as Julie's public site favicon / Open Graph image on https://lettingsadviceservice.co.uk/

## Make / check

Source is not square. Pad to a square on white, flatten alpha onto that pad,
upscale to **1024x1024** opaque RGB, then verify:

```bash
# After writing store/icon.png (and assets/logo.png) from the source logo:
npm run check:icon
```

Same pixels live at `assets/logo.png` for `app-details.json` (`"logo": "logo.png"`).

Optional flat-glyph path (not used for this branded mark):

```bash
npm run make:icon -- --background '#CEE2FF' --glyph icon-document
npm run check:icon
```

# Store pricing — Lettings Advice Service

Commercial values for the COHO Atrium Store listing. **Not** part of the runtime
manifest (`assets/manifest.json`). Do not put prices in marketing blurbs; the
Store card shows the catalogue price.

| Field | Value |
|---|---|
| Model | Monthly (existing Atrium Store billing) |
| Customer list price | **GBP 70** net of VAT, **flat** per organisation per month |
| `priceType` | `Paid` (`1`) |
| Pricing mode | Flat (not per-unit, not banded, not one-off) |
| One-off install fee | **No** |
| COHO platform share | **20%** of Net Receipts (Developer Share **80%**) — set by COHO; do not invent a custom cut |
| Who bills | COHO (merchant of record, card) |

## How to set it on the listing

1. Register / provision the hosted app as usual (register may still create the row as Free).
2. Call Store **update-listing** with:

```json
{
  "priceType": 1,
  "price": 70
}
```

Org path: `POST /api/organisation/{organisationReference}/atrium-store/apps/{appReference}/update-listing`  
Partner path: `POST .../atrium/developer/apps/{appReference}/update-listing`

3. Complete publisher disclosures, submit for approval, Super Admin approve.
   Approve creates the Flat catalogue product at GBP 70 + VAT.

Build an app may show Paid / 70 in the form, but the register API currently
ignores those fields — always confirm SA review shows **Paid — 70** before
approve. Edit listing UI may still omit price controls; the API body above is
the supported path until FE catches up.

Full HouseShare readiness notes: Project doc `docs/las-monthly-billing.md`.

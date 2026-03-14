# FREEDOLIAPP — Brand assets

This folder is the **single source of truth** for app branding in production. The branding system is **closed**: all app references use only the canonical paths below. There are no obsolete paths (e.g. `/logo.png`, `/logo-dark.png`) or dead fallback logic.

## Canonical paths (do not change URLs)

| Path | Used by |
|------|--------|
| `/brand/freedoliapp/logo/logo_master.png` | Sidebar, Landing header, PDF generator |
| `/brand/freedoliapp/logo/wordmark.png` | Landing footer |
| `/brand/freedoliapp/logo/symbol_left.png` | FreedoliLoader (loading spinner) |
| `/brand/freedoliapp/favicons/favicon_16.png` | index.html (favicon) |
| `/brand/freedoliapp/favicons/favicon_32.png` | index.html |
| `/brand/freedoliapp/favicons/favicon_48.png` | index.html |
| `/brand/freedoliapp/favicons/favicon_64.png` | index.html |
| `/brand/freedoliapp/icons/app_icon_256.png` | index.html (apple-touch-icon) |

## Replacing with final artwork

**Current state:** The files in this tree may be minimal placeholders (e.g. 1×1 PNG) so that the app never 404s. They are **not** the final brand artwork.

**To go production-ready:** Replace each file **in place** with the final PNG (same filename, same path). No code changes are required. The build and all references will use the new assets automatically.

- `logo/logo_master.png` — Main logo (sidebar, landing header, PDFs).
- `logo/wordmark.png` — Wordmark for footer.
- `logo/symbol_left.png` — Symbol for loader.
- `favicons/favicon_*.png` — 16×16, 32×32, 48×48, 64×64.
- `icons/app_icon_256.png` — 256×256 app icon.

Do not rename files or change folder structure; the app expects these exact paths.

## Ensuring assets exist (pre-build)

Run `node scripts/ensure-brand-assets.cjs` to create missing files as minimal placeholders so all canonical URLs resolve. Existing files are not overwritten. The script also copies canonical favicon and app icon to **root static paths** so conventional URLs resolve in production: `public/favicon.ico` (from `favicon_32.png`), `public/apple-touch-icon.png` (from `app_icon_256.png`). The build runs this script automatically.

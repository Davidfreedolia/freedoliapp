# Freedoliapp Chrome Extension

A lightweight Manifest V3 extension that turns any Amazon product page into a
one-click research entry inside [Freedoliapp](https://freedoliapp.com).

## What it does

- Runs on **12 Amazon marketplaces** (US, UK, DE, FR, IT, ES, NL, PL, SE, MX, CA, BR).
- Detects the ASIN from any product URL (`/dp/`, `/gp/product/`, `/gp/aw/d/`, `?asin=`).
- Injects a discreet floating button bottom-right: **"Recerca Freedoliapp"**.
- Click the toolbar icon for a popup with two actions:
  - **Investigar amb IA** — opens `/app/research?asin=...&autostart=1` and auto-triggers the Research Wizard with the product title/price prefilled.
  - **Crear projecte** — opens the new-project flow with the ASIN as a starting point.

## File layout

```
extension/
├── manifest.json              # MV3 manifest
├── background.js              # Service worker (badge state, install hook)
├── content/
│   ├── content.js             # Injected on amazon.* pages
│   └── content.css            # Styles for the floating action button
├── popup/
│   ├── popup.html             # Toolbar popup markup
│   ├── popup.css              # Popup styles (mirrors Freedoliapp brand)
│   └── popup.js               # Popup logic — reads the active tab + opens app
├── lib/
│   └── amazon.js              # Shared helpers (ASIN detection, URL builder)
└── icons/                     # 16/32/48/128 PNGs (copied from /public)
```

## Install (developer / unpacked)

1. Open Chrome → `chrome://extensions/`
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the `extension/` folder of this repo.
5. The Freedoliapp icon will appear in your toolbar.
6. Visit any `amazon.*` product page — the floating button shows up bottom-right.

> The same procedure works on **Brave**, **Edge**, **Opera** and any Chromium-based browser.

## Configuration

By default the extension targets `https://freedoliapp.com`. To point it at a local
dev server or a staging URL, open the Chrome devtools console on
`chrome://extensions/` background page and run:

```js
chrome.storage.sync.set({ freedoliappBaseUrl: 'http://localhost:5173' })
```

Reload the extension and any page action will now deep-link to that base URL.

## Publishing to the Chrome Web Store

1. Bump `version` in `manifest.json`.
2. Compress the `extension/` folder as a zip (no extra wrappers).
3. Upload to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) (€5 one-time developer registration).
4. Fill privacy / single-purpose disclosure (extension only sends ASINs to
   `freedoliapp.com` and does not collect personal data on Amazon pages).

## Privacy

The extension does **not**:

- Track browsing activity outside Amazon product pages.
- Send any data to a third party.
- Read or write cookies on Amazon.

It only reads the **current page DOM** when the user clicks the floating button
or the toolbar popup, and only sends the captured ASIN + title + price to
`freedoliapp.com` (or the configured base URL).

## Roadmap

- v0.2 → Authenticated POST to a `/app/api/quick-save` endpoint so the popup
  can save without opening a new tab.
- v0.3 → Right-click context menu ("Save ASIN to Freedoliapp").
- v0.4 → Pull rich data via Keepa API on the user's behalf (BYOK Keepa key
  configurable in the popup settings).
- v0.5 → Multi-ASIN capture from Amazon search results / category pages.

## License

Same as the main repo.

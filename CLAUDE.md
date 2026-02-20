# FlowFix — Agent Context

## What This Is
Chrome extension that diagnoses and optimizes Zapier & Make.com workflows. Free tool, funnel to AI Blitz services.

## Stack
- Manifest V3 Chrome Extension
- Vanilla JS (no framework)
- Content scripts for Zapier + Make.com DOM analysis

## Key Files
- `manifest.json` — extension manifest
- `popup/index.html` + `popup.js` + `styles.css` — popup UI
- `content/zapier.js` — Zapier dashboard analyzer
- `content/make.js` — Make.com dashboard analyzer
- `background/service-worker.js` — service worker
- `privacy-policy.html` — hosted privacy policy

## Build & Test
- No build step. Load unpacked in chrome://extensions
- CWS ZIP: `zip -r flowfix-cws.zip manifest.json popup/ content/ background/ icons/ privacy-policy.html`

## Design Constraints
- Dark theme (#1a1a2e base)
- NO emojis in UI
- 360px popup width, 500px min height
- Professional, clean. Reference: Linear, Raycast aesthetic.

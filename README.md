# Weight Ledger

A personal weight tracker that runs as a PWA on your phone. Reads weight from scale photos via the Anthropic API.

## Contents

- `index.html` — the app (React, Recharts, Lucide, all via CDN, no build step)
- `manifest.json` — PWA manifest
- `service-worker.js` — offline cache + installability
- `icon-192.png`, `icon-512.png` — home-screen icons
- `apple-touch-icon.png`, `favicon.png` — iOS and browser icons

## Deploy

**Requirement: HTTPS.** The camera API and service workers only work over HTTPS. All options below provide this automatically.

### Option A — GitHub Pages

1. Create a public repo (e.g. `weight-ledger`)
2. Upload all files to the repo root
3. **Settings → Pages → Source: main / root → Save**
4. Visit `https://<username>.github.io/weight-ledger/` after ~1 min

### Option B — Netlify (drag-and-drop)

1. Log in to netlify.com
2. Drag the folder onto the deploy area
3. Get a URL like `https://<random-name>.netlify.app/`
4. Optionally rename in Site settings → Domain management

### Option C — Vercel

Similar to Netlify. Import or drag the folder, get a URL.

## Install on your phone

### Android (Chrome)
1. Open the URL
2. A bar appears: "Install app" → tap it
3. If no bar: browser menu → "Install app" / "Add to Home screen"

### iOS (Safari — not Chrome)
1. Open the URL in Safari
2. Share button → "Add to Home Screen"

## First launch

1. Open Settings (gear icon, top right)
2. Set your height
3. Tap "Add key" under API Key, paste your Anthropic API key
4. Start logging — tap the `+` button

The API key is stored in your device's localStorage. It never leaves your phone except in requests to api.anthropic.com.

## Updates

The service worker caches files for offline use. To force updates after you change code:

1. Bump `CACHE_VERSION` in `service-worker.js`
2. Redeploy

The next time the app is opened, the new version installs in the background. The launch after that shows the new version.

## Data

- Everything lives in `localStorage` on your device.
- Export JSON from Settings for backup.
- Import JSON restores data (merges with existing; dedupes by timestamp+weight).
- "Clear all data" wipes entries but leaves the API key and height.

## Troubleshooting

- **Camera doesn't open:** HTTPS missing, or site permissions blocked. Check browser site settings.
- **"API error 401":** API key is invalid or revoked. Update it in Settings.
- **"API error 429":** You've hit the rate limit or monthly spend cap. Check console.anthropic.com.
- **App won't update after redeploy:** Close the app fully, reopen; it may need two launches. Or clear site data in browser settings.

# YouTube Playlist Progress Tracker

A lightweight Chrome extension that displays playlist progress for YouTube playlists and lets you mark videos as completed. Progress is stored per-playlist using `chrome.storage.local`.

This repository contains a small popup UI (built with Vite + React) and a plain content script that injects the playlist UI into YouTube's pages.

---

## Features

- Injects a compact "Playlist Progress" panel above the YouTube playlist sidebar.
- Adds a small ✔/✗ toggle button next to each playlist item to mark completion.
- Persists completed items per-playlist using `chrome.storage.local`.
- Handles YouTube's SPA navigation using MutationObservers and a debounce to avoid excessive updates.
- Minimal runtime footprint for the page — content script is plain JavaScript (`public/content.js`).

## Repository layout

- `public/` — content script and extension manifest for the extension (content scripts run on YouTube pages).
- `pubilc/` — (duplicate folder kept for compatibility). Review before publishing.
- `src/popup/` — React-based popup used by the extension (built with Vite).
- `icons/`, `public/icons/` — icon assets used by the extension.
- `popup.html` — extension popup entry.
- `package.json` / `vite.config.mjs` — development/build configuration for the popup UI.

> Note: The content script is intentionally dependency-free to avoid injecting extra bundles into the YouTube page.

## Quick setup (development)

1. Install dependencies (for building the popup):

```powershell
npm install
```

2. Build the popup (production bundle):

```powershell
npm run build
```

3. Load the extension in Chrome/Edge (Developer mode):
   - Open `chrome://extensions/` (or `edge://extensions/`).
   - Enable **Developer mode**.
   - Click **Load unpacked** and select this project's root folder (the folder that contains `manifest.json`, `public/`, and `popup.html`).

4. Open a YouTube playlist page (URL contains `list=`). The extension's content script should automatically inject the Playlist Progress panel.

## How to use

- Visit a YouTube playlist (e.g., `https://www.youtube.com/playlist?list=...`).
- The Playlist Progress panel should appear above the playlist sidebar.
- Click the small ✔/✗ toggle button next to each playlist item to mark it completed or not completed.
- The progress bar shows the percentage of completed videos for the playlist and updates immediately.
- All progress is saved locally on your machine (in `chrome.storage.local`) and is keyed by the playlist `list` parameter.

## Troubleshooting

- If no panel or buttons appear:
  - Ensure the extension is loaded and enabled.
  - Reload the YouTube tab after updating or reloading the extension; content scripts connect at page load or when re-injected.
  - YouTube's DOM may change; if buttons are missing on a new layout, open DevTools and look for error messages.

- If you see `Extension context invalidated` in the console after reloading the extension:
  - Reload the YouTube tab (Ctrl+R) to re-establish the content script context.

## Development notes

- Content script: `public/content.js`. It:
  - Waits for the playlist container using a selector.
  - Injects a small progress panel and per-item buttons.
  - Uses MutationObserver to re-scan when YouTube updates the sidebar where the playlist items live.
  - Persists per-playlist progress into `chrome.storage.local`.

- Popup UI: `src/popup/` (React + Vite) is optional — the extension works even without the popup.

## Security & privacy

- This extension stores only the minimal data required to track which videos you've marked completed (per-playlist). Data is stored in your browser's local extension storage (`chrome.storage.local`) and does not leave your machine.

## Contributing

- Feel free to open issues or create PRs. Small improvements:
  - Add unit tests for the popup UI.
  - Improve resilience to YouTube DOM changes.
  - Add an options page to export/import progress data.

## License

This project is available under the MIT License. See the `LICENSE` file for details.


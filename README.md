# YouTube Playlist Progress Tracker

A lightweight Chrome extension that adds a "Playlist Progress" panel to YouTube playlist pages and lets you mark videos as completed with a ✔ button. Progress is stored per-playlist using `chrome.storage.local`.

## Features

- Injects a compact "Playlist Progress" panel above the playlist sidebar.
- Adds a small ✗/✔ toggle button next to each playlist item to mark completion.
- Persists completed items per-playlist using `chrome.storage.local`.
- Handles YouTube's SPA navigation via MutationObservers and a debounce to avoid thrash.
- Minimal, dependency-free content script located at `public/content.js`.

## Quick start

1. Install dependencies (for building the extension UI):

```powershell
npm install
```

2. Build the project (if you use Vite for the popup):

```powershell
npm run build
```

3. Load the extension in Chrome/Edge (Developer mode):
   - Open `chrome://extensions/` (or `edge://extensions/`).
   - Enable "Developer mode".
   - Click "Load unpacked" and select this project's root folder (the folder that contains `manifest.json` and `public/`).

4. Open a YouTube playlist page (URL contains `list=`) to see the "Playlist Progress" panel and the ✔/✗ buttons.

## How it works

- The content script (`public/content.js`) waits for the playlist container (`ytd-playlist-panel-renderer #items`).
- It injects a small panel with a title and progress bar, then scans playlist entries (`ytd-playlist-panel-video-renderer`) and adds a toggle button for each.
- When you click a button the script saves completion state to `chrome.storage.local` under a key derived from the playlist `list` query parameter.
- The script uses MutationObservers to re-scan the playlist when YouTube re-renders parts of the page.

## Development notes

- Popup UI is in `src/popup/` and built using Vite + React. The content script is intentionally plain JavaScript to keep page footprint small.
- If you see `Extension context invalidated` in the console after reloading the extension, reload the page containing YouTube to reconnect the content script.

## Testing checklist

- Load the extension as unpacked.
- Open a playlist page that has multiple videos.
- Verify the panel appears above the playlist.
- Click the ✗/✔ button next to a video. It should toggle and persist after reload.
- Open DevTools Console → check for `[YT-PROGRESS]` logs and errors.

## License

This project is released under the MIT License. See `LICENSE` for details.


// YouTube Playlist Progress - simplified robust implementation
// Behavior:
// - Wait for playlist panel to load
// - Insert a small control panel above the playlist
// - Add a tick button for each playlist item to mark completed
// - Persist per-playlist progress in chrome.storage.local
// - Handle SPA navigation (YouTube changes URL without full reload)

(function () {
  'use strict';

  const LOG = (...args) => console.debug('[YT-PROGRESS]', ...args);

  function waitForSelector(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      const obs = new MutationObserver(() => {
        const found = document.querySelector(selector);
        if (found) {
          obs.disconnect();
          resolve(found);
        }
      });
      obs.observe(document.documentElement || document.body, { childList: true, subtree: true });
      if (timeout) setTimeout(() => {
        obs.disconnect();
        reject(new Error('timeout waiting for ' + selector));
      }, timeout);
    });
  }

  function isExtensionValid() {
    return typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id;
  }

  function storageGet(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (data) => {
          if (chrome.runtime.lastError) return resolve({});
          resolve(data[key] || {});
        });
      } catch (e) {
        LOG('storage.get exception', e);
        resolve({});
      }
    });
  }

  function storageSet(key, value) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => resolve());
      } catch (e) {
        LOG('storage.set exception', e);
        resolve();
      }
    });
  }

  function createPanel() {
    if (document.getElementById('yt-progress-panel')) return document.getElementById('yt-progress-panel');
    const panel = document.createElement('div');
    panel.id = 'yt-progress-panel';
    panel.style.padding = '10px';
    panel.style.margin = '8px 0';
    panel.style.background = 'linear-gradient(135deg,#f0fdfa,#e6eefb)';
    panel.style.borderRadius = '8px';
    panel.style.fontFamily = 'Arial, Helvetica, sans-serif';
    panel.style.fontSize = '13px';
    panel.style.color = '#0f172a';

    const title = document.createElement('div');
    title.innerText = 'Playlist Progress';
    title.style.fontWeight = '600';
    title.style.marginBottom = '6px';
    panel.appendChild(title);

    const info = document.createElement('div');
    info.id = 'yt-progress-info';
    info.innerText = 'Loading...';
    info.style.marginBottom = '6px';
    panel.appendChild(info);

    const barWrap = document.createElement('div');
    barWrap.style.width = '100%';
    barWrap.style.height = '8px';
    barWrap.style.background = '#eee';
    barWrap.style.borderRadius = '4px';
    const bar = document.createElement('div');
    bar.id = 'yt-progress-bar-inner';
    bar.style.height = '100%';
    bar.style.width = '0%';
    bar.style.background = '#16a34a';
    bar.style.borderRadius = '4px';
    bar.style.transition = 'width 0.25s';
    barWrap.appendChild(bar);
    panel.appendChild(barWrap);

    return panel;
  }

  async function insertPanelAbovePlaylist() {
    try {
      const playlistRenderer = await waitForSelector('ytd-playlist-panel-renderer');
      if (!document.getElementById('yt-progress-panel')) {
        const panel = createPanel();
        playlistRenderer.parentNode.insertBefore(panel, playlistRenderer);
      }
    } catch (e) {
      LOG('insertPanelAbovePlaylist:', e.message);
    }
  }

  function makeButton(isCompleted) {
    const btn = document.createElement('button');
    btn.textContent = isCompleted ? '✔' : '✗';
    btn.className = isCompleted ? 'yt-green-tick-btn' : 'yt-red-cross-btn';
    btn.style.width = '28px';
    btn.style.height = '28px';
    btn.style.borderRadius = '50%';
    btn.style.border = 'none';
    btn.style.color = '#fff';
    btn.style.fontWeight = '700';
    btn.style.cursor = isCompleted ? 'default' : 'pointer';
    btn.style.marginRight = '8px';
    btn.style.background = isCompleted ? 'linear-gradient(135deg,#16a34a,#22c1c3)' : 'linear-gradient(135deg,#e11d48,#f472b6)';
    return btn;
  }

  async function scanAndAddButtons() {
    try {
      const itemsContainer = await waitForSelector('ytd-playlist-panel-renderer #items');
      const items = itemsContainer.querySelectorAll('ytd-playlist-panel-video-renderer');
      LOG('scanAndAddButtons - items found:', items.length);

      const url = new URL(window.location.href);
      const playlistId = url.searchParams.get('list') || 'default';
      const progress = isExtensionValid() ? await storageGet(playlistId) : {};

      items.forEach(item => {
        try {
          const a = item.querySelector('a#video-title') || item.querySelector('a.yt-simple-endpoint') || item.querySelector('a');
          const href = a?.href || '';
          const videoId = href ? (new URL(href, location.origin)).searchParams.get('v') : null;
          if (!videoId) return;
          if (item.querySelector('.yt-progress-button-container')) return;

          const completed = !!progress[videoId];
          const btn = makeButton(completed);
          const container = document.createElement('div');
          container.className = 'yt-progress-button-container';
          container.style.display = 'flex';
          container.style.alignItems = 'center';
          container.style.marginRight = '6px';
          container.appendChild(btn);
          item.insertBefore(container, item.firstChild);

          if (!completed) {
            btn.addEventListener('click', async () => {
              btn.textContent = '✔';
              btn.style.background = 'linear-gradient(135deg,#16a34a,#22c1c3)';
              btn.style.cursor = 'default';
              if (!isExtensionValid()) return;
              const cur = await storageGet(playlistId);
              cur[videoId] = true;
              await storageSet(playlistId, cur);
              updateProgressDisplay();
            });
          }
        } catch (e) {
          LOG('item processing error', e);
        }
      });

      updateProgressDisplay();
    } catch (e) {
      LOG('scanAndAddButtons:', e.message);
    }
  }

  async function updateProgressDisplay() {
    try {
      const itemsContainer = document.querySelector('ytd-playlist-panel-renderer #items');
      if (!itemsContainer) return;
      const items = itemsContainer.querySelectorAll('ytd-playlist-panel-video-renderer');
      const url = new URL(window.location.href);
      const playlistId = url.searchParams.get('list') || 'default';
      const progress = isExtensionValid() ? await storageGet(playlistId) : {};
      const completed = Object.keys(progress || {}).length;
      const total = items.length || 0;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      const info = document.getElementById('yt-progress-info');
      if (info) info.innerText = `${completed} / ${total} videos completed (${percent}%)`;
      const bar = document.getElementById('yt-progress-bar-inner');
      if (bar) bar.style.width = percent + '%';
    } catch (e) {
      LOG('updateProgressDisplay:', e.message);
    }
  }

  function watchPlaylistChanges() {
    const root = document.documentElement || document.body;
    const mo = new MutationObserver(() => {
      if (window._ytProgressTimeout) clearTimeout(window._ytProgressTimeout);
      window._ytProgressTimeout = setTimeout(() => {
        scanAndAddButtons();
      }, 400);
    });
    mo.observe(root, { childList: true, subtree: true });
  }

  (function main() {
    if (!isExtensionValid()) LOG('Warning: chrome.runtime.id not available - extension APIs may fail');
    insertPanelAbovePlaylist();
    setTimeout(() => scanAndAddButtons(), 1200);
    watchPlaylistChanges();
    window.addEventListener('yt-progress-updated', () => updateProgressDisplay());
  })();

})();

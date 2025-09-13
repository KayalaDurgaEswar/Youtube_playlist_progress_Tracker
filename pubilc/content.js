// content.js
// 1) Track 90% completion of videos in playlists and persist per playlist in chrome.storage.local
// 2) Show a checkmark next to completed videos inside YouTube playlist panel
// 3) Listen to reset events from popup to refresh UI

(function () {
  const PROGRESS_THRESHOLD = 0.9; // 90%
  const CHECK_CLASS = 'yt-playlist-progress-check';
  const CHECK_CSS_ID = 'yt-playlist-progress-styles';

  // Add CSS for checkmark once
  function addStyles() {
    if (document.getElementById(CHECK_CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CHECK_CSS_ID;
    style.textContent = `
      .${CHECK_CLASS} {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        margin-left: 8px;
        color: white;
        background: #16a34a;
        border-radius: 50%;
        font-size: 12px;
        font-weight: 700;
      }
      .yt-playlist-item-row { display: flex; align-items: center; }
    `;
    document.head.appendChild(style);
  }

  // extract playlistId and videoId from URL
  function getPlaylistId() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('list');
    } catch (e) {
      return null;
    }
  }
  function getVideoId() {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('v');
    } catch (e) {
      return null;
    }
  }

  // mark a video as completed in chrome.storage.local
  function markCompleted(playlistId, videoId) {
    if (!playlistId || !videoId) return;
    chrome.storage.local.get([playlistId], (data) => {
      const progress = data[playlistId] || {};
      if (!progress[videoId]) {
        progress[videoId] = true;
        chrome.storage.local.set({ [playlistId]: progress }, () => {
          // after saving, refresh UI to show checkmark
          renderChecksForPlaylist(playlistId, progress);
        });
      }
    });
  }

  // render checkmarks by comparing DOM items' videoId to saved progress
  function renderChecksForPlaylist(playlistId, progressObj) {
    addStyles();

    // playlist panel items (sidebar)
    const panelItems = document.querySelectorAll('ytd-playlist-panel-video-renderer');
    panelItems.forEach((item) => {
      try {
        // find the link that contains the video ID
        const a = item.querySelector('a.yt-simple-endpoint') || item.querySelector('a');
        const href = a?.href || '';
        const vid = (new URL(href)).searchParams.get('v');
        if (!vid) return;

        // avoid double check elements
        let wrapper = item.querySelector('.yt-playlist-item-row');
        if (!wrapper) {
          // create wrapper inside item to keep layout stable
          wrapper = document.createElement('div');
          wrapper.className = 'yt-playlist-item-row';
          // move the existing content inside wrapper
          while (item.firstChild) wrapper.appendChild(item.firstChild);
          item.appendChild(wrapper);
        }

        // remove existing check element for this item
        const existing = item.querySelector('.' + CHECK_CLASS);
        if (existing) existing.remove();

        if (progressObj && progressObj[vid]) {
          const check = document.createElement('span');
          check.className = CHECK_CLASS;
          check.title = 'Completed';
          check.innerText = '✓';
          wrapper.appendChild(check);
        }
      } catch (err) {
        // ignore item parsing errors
      }
    });

    // playlist main list rows in watch page (if present)
    const listItems = document.querySelectorAll('ytd-playlist-video-renderer');
    listItems.forEach((item) => {
      try {
        const a = item.querySelector('a.yt-simple-endpoint') || item.querySelector('a');
        const href = a?.href || '';
        const vid = (new URL(href, location.origin)).searchParams.get('v');
        if (!vid) return;
        const existing = item.querySelector('.' + CHECK_CLASS);
        if (existing) existing.remove();
        if (progressObj && progressObj[vid]) {
          const meta = item.querySelector('#meta') || item;
          const check = document.createElement('span');
          check.className = CHECK_CLASS;
          check.title = 'Completed';
          check.innerText = '✓';
          meta.appendChild(check);
        }
      } catch (err) {}
    });
  }

  // observe DOM changes so if the playlist panel updates we re-render checks
  const obs = new MutationObserver((mutations) => {
    const playlistId = getPlaylistId();
    if (!playlistId) return;
    chrome.storage.local.get([playlistId], (data) => {
      const progress = data[playlistId] || {};
      renderChecksForPlaylist(playlistId, progress);
    });
  });

  function startObserving() {
    const target = document.body;
    obs.observe(target, { childList: true, subtree: true });
  }

  // Attach to the playing video and watch progress
  function attachVideoProgressListener() {
    const video = document.querySelector('video');
    if (!video) return;

    let attached = video.dataset.ytProgressAttached;
    if (attached) return;
    video.dataset.ytProgressAttached = '1';

    video.addEventListener('timeupdate', () => {
      try {
        if (video.duration > 0 && video.currentTime / video.duration >= PROGRESS_THRESHOLD) {
          const playlistId = getPlaylistId();
          const videoId = getVideoId();
          if (playlistId && videoId) {
            markCompleted(playlistId, videoId);
          }
        }
      } catch (e) {}
    });
  }

  // initial bootstrap: attempt to attach and render existing progress
  function bootstrap() {
    addStyles();
    startObserving();

    const playlistId = getPlaylistId();
    if (playlistId) {
      chrome.storage.local.get([playlistId], (data) => {
        const progress = data[playlistId] || {};
        renderChecksForPlaylist(playlistId, progress);
      });
    }

    // try to attach to video (watch page); sometimes video element loads later
    attachVideoProgressListener();
    // attempt periodically for a short while
    const tries = setInterval(() => {
      attachVideoProgressListener();
    }, 1000);
    // stop tries after 10 seconds
    setTimeout(() => clearInterval(tries), 10000);
  }

  // Listen to custom events from popup to refresh or reset visuals
  window.addEventListener('yt-progress-reset', (e) => {
    const playlistId = e?.detail?.playlistId || getPlaylistId();
    if (!playlistId) return;
    chrome.storage.local.get([playlistId], (data) => {
      const progress = data[playlistId] || {};
      renderChecksForPlaylist(playlistId, progress);
    });
  });

  // Run bootstrap when page is ready (YouTube is dynamic, so wait for document)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(bootstrap, 1000);
  } else {
    window.addEventListener('DOMContentLoaded', () => setTimeout(bootstrap, 800));
  }
})();


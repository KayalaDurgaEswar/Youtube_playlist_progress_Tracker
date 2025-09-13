import React, { useEffect, useState } from "react";

/**
 * Popup: React UI for the extension popup
 * - Reads current playlistId from active tab
 * - Loads saved progress from chrome.storage.local
 * - Queries the page for total videos using chrome.scripting.executeScript
 * - Shows progress bar, completed / total, reset button
 */

export default function Popup() {
  const [status, setStatus] = useState({
    playlistId: null,
    completed: 0,
    total: 1,
    loading: true,
  });

  // Helper to refresh progress
  const refreshProgress = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        setStatus((s) => ({ ...s, loading: false }));
        return;
      }
      const url = new URL(tabs[0].url);
      const playlistId = url.searchParams.get("list");
      if (!playlistId) {
        setStatus({ playlistId: null, completed: 0, total: 0, loading: false });
        return;
      }
      chrome.storage.local.get([playlistId], (data) => {
        const progress = data[playlistId] || {};
        const completed = Object.keys(progress).length;
        chrome.scripting.executeScript(
          {
            target: { tabId: tabs[0].id },
            func: () => {
              return document.querySelectorAll("ytd-playlist-panel-video-renderer").length ||
                     document.querySelectorAll("ytd-playlist-video-renderer").length ||
                     0;
            }
          },
          (results) => {
            const total = results?.[0]?.result || 0;
            setStatus({ playlistId, completed, total, loading: false });
          }
        );
      });
    });
  };

  useEffect(() => {
    refreshProgress();
    // Listen for progress updates from content script
    const handler = () => refreshProgress();
    window.addEventListener('yt-progress-updated', handler);
    return () => window.removeEventListener('yt-progress-updated', handler);
  }, []);

  const percent = status.total ? Math.round((status.completed / status.total) * 100) : 0;

  const resetProgress = () => {
    if (!status.playlistId) return;
    chrome.storage.local.remove(status.playlistId, () => {
      setStatus((s) => ({ ...s, completed: 0 }));
      // Also ask the content script to repaint (optionally)
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) return;
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (playlistId) => {
            // trigger visual refresh from content script by dispatching custom event
            window.dispatchEvent(new CustomEvent("yt-progress-reset", { detail: { playlistId } }));
          },
          args: [status.playlistId]
        });
      });
    });
  };

  return (
    <div className="popup-root">
      <h3>YouTube Playlist Progress</h3>

      {status.loading ? (
        <p className="muted">Loading...</p>
      ) : status.playlistId ? (
        <>
          <div className="progress-wrap">
            <div className="progress-bar" style={{ width: `${percent}%` }} />
          </div>
          <p className="muted">
            {status.completed} / {status.total} videos completed ({percent}%)
          </p>
          <button className="btn" onClick={resetProgress}>Reset Progress</button>
        </>
      ) : (
        <p className="muted">Open a YouTube playlist page to see progress.</p>
      )}
  {/* Footer removed as requested */}
    </div>
  );
}


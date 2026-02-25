window.BiliSub = window.BiliSub || {};

window.BiliSub.PlayerService = (function () {
  const { Constants } = window.BiliSub;
  let _video = null;
  let _highlightTimer = null;
  let _onTimeUpdateCallback = null;

  function getVideo() {
    if (_video && document.contains(_video)) return _video;
    _video = document.querySelector(Constants.SELECTORS.VIDEO);
    return _video;
  }

  function getCurrentTime() {
    const video = getVideo();
    return video ? video.currentTime : 0;
  }

  function seekTo(time) {
    const video = getVideo();
    if (video) {
      video.currentTime = time;
      if (video.paused) video.play();
    }
  }

  function isPlaying() {
    const video = getVideo();
    return video ? !video.paused : false;
  }

  function startHighlightTracking(callback) {
    _onTimeUpdateCallback = callback;
    stopHighlightTracking();
    _highlightTimer = setInterval(() => {
      if (_onTimeUpdateCallback) {
        _onTimeUpdateCallback(getCurrentTime());
      }
    }, Constants.HIGHLIGHT_UPDATE_INTERVAL);
  }

  function stopHighlightTracking() {
    if (_highlightTimer) {
      clearInterval(_highlightTimer);
      _highlightTimer = null;
    }
  }

  // Listen for seek requests from UI
  window.addEventListener(Constants.EVENTS.SEEK_TO, (e) => {
    seekTo(e.detail);
  });

  return {
    getVideo,
    getCurrentTime,
    seekTo,
    isPlaying,
    startHighlightTracking,
    stopHighlightTracking,
  };
})();

window.BiliSub = window.BiliSub || {};

window.BiliSub.PlayerService = (function () {
  var Constants = window.BiliSub.Constants;
  var _video = null;
  var _highlightTimer = null;
  var _timeCallback = null;

  function getVideo() {
    if (_video && document.contains(_video)) return _video;
    _video = document.querySelector(Constants.SELECTORS.VIDEO);
    return _video;
  }

  function getCurrentTime() {
    var video = getVideo();
    return video ? video.currentTime : 0;
  }

  function seekTo(time) {
    var video = getVideo();
    if (video) video.currentTime = time;
  }

  function startHighlightTracking(callback) {
    _timeCallback = callback;
    stopHighlightTracking();
    _highlightTimer = setInterval(function () {
      if (_timeCallback) _timeCallback(getCurrentTime());
    }, Constants.HIGHLIGHT_UPDATE_INTERVAL);
  }

  function stopHighlightTracking() {
    if (_highlightTimer) {
      clearInterval(_highlightTimer);
      _highlightTimer = null;
    }
  }

  window.addEventListener(Constants.EVENTS.SEEK_TO, function (e) {
    seekTo(e.detail);
  });

  return {
    getVideo: getVideo,
    getCurrentTime: getCurrentTime,
    seekTo: seekTo,
    startHighlightTracking: startHighlightTracking,
    stopHighlightTracking: stopHighlightTracking,
  };
})();

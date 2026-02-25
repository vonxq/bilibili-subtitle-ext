window.BiliSub = window.BiliSub || {};

window.BiliSub.RepeaterService = (function () {
  var Constants = window.BiliSub.Constants;

  var _state = {
    active: false,
    sentenceFrom: 0,
    sentenceTo: 0,
    loopTotal: 1,
    loopCount: 0,
    originalSpeed: 1,
  };

  var _video = null;
  var _checkTimer = null;
  var _listeners = [];

  function onStateChange(cb) {
    _listeners.push(cb);
  }

  function notify() {
    var snapshot = {
      active: _state.active,
      from: _state.sentenceFrom,
      to: _state.sentenceTo,
      loopTotal: _state.loopTotal,
      loopCount: _state.loopCount,
    };
    _listeners.forEach(function (cb) {
      try { cb(snapshot); } catch (_) {}
    });
  }

  function getVideo() {
    if (_video && document.contains(_video)) return _video;
    _video = document.querySelector(Constants.SELECTORS.VIDEO);
    return _video;
  }

  function play(from, to, loopTotal) {
    var video = getVideo();
    if (!video) return;

    stop();

    _state.active = true;
    _state.sentenceFrom = from;
    _state.sentenceTo = to;
    _state.loopTotal = loopTotal || 1;
    _state.loopCount = 0;

    video.currentTime = from;
    video.play();

    _checkTimer = setInterval(function () {
      checkBoundary();
    }, 50);

    notify();
  }

  function checkBoundary() {
    var video = getVideo();
    if (!video || !_state.active) return;

    if (video.currentTime >= _state.sentenceTo) {
      _state.loopCount++;
      notify();

      var reachedLimit =
        _state.loopTotal !== Infinity && _state.loopCount >= _state.loopTotal;

      if (reachedLimit) {
        video.pause();
        stop();
        return;
      }

      video.pause();
      setTimeout(function () {
        if (!_state.active) return;
        var v = getVideo();
        if (v) {
          v.currentTime = _state.sentenceFrom;
          v.play();
        }
      }, Constants.REPEATER.PAUSE_BETWEEN_LOOPS);
    }
  }

  function stop() {
    _state.active = false;
    _state.loopCount = 0;
    if (_checkTimer) {
      clearInterval(_checkTimer);
      _checkTimer = null;
    }
    notify();
  }

  function isActive() {
    return _state.active;
  }

  function getState() {
    return {
      active: _state.active,
      from: _state.sentenceFrom,
      to: _state.sentenceTo,
      loopTotal: _state.loopTotal,
      loopCount: _state.loopCount,
    };
  }

  function setSpeed(rate) {
    var video = getVideo();
    if (video) {
      video.playbackRate = rate;
    }
  }

  function getSpeed() {
    var video = getVideo();
    return video ? video.playbackRate : 1;
  }

  return {
    play: play,
    stop: stop,
    isActive: isActive,
    getState: getState,
    setSpeed: setSpeed,
    getSpeed: getSpeed,
    onStateChange: onStateChange,
  };
})();

window.BiliSub = window.BiliSub || {};

window.BiliSub.ShortcutService = (function () {
  var Constants = window.BiliSub.Constants;
  var SubtitleService = window.BiliSub.SubtitleService;
  var PlayerService = window.BiliSub.PlayerService;
  var RepeaterService = window.BiliSub.RepeaterService;

  var _enabled = false;
  var _spaceDownAt = 0;
  var _normalPlayCheckTimer = null;
  var LONG_PRESS_MS = 400;

  function _updateEnabled() {
    try {
      chrome.storage.local.get(Constants.STORAGE_KEYS.SHORTCUT_ENABLED, function (r) {
        _enabled = !!r[Constants.STORAGE_KEYS.SHORTCUT_ENABLED];
      });
    } catch (_) {}
  }

  function _getTimeline() {
    return SubtitleService && SubtitleService.getTimeline ? SubtitleService.getTimeline() : [];
  }

  function _getCurrentIndex() {
    var time = PlayerService && PlayerService.getCurrentTime ? PlayerService.getCurrentTime() : 0;
    var timeline = _getTimeline();
    if (!timeline.length) return -1;
    for (var i = 0; i < timeline.length; i++) {
      if (time >= timeline[i].from && time < timeline[i].to) return i;
    }
    if (time < timeline[0].from) return 0;
    return timeline.length - 1;
  }

  function _seekToSentence(index, preservePlayState) {
    var timeline = _getTimeline();
    if (index < 0 || index >= timeline.length) return;
    var sentence = timeline[index];
    if (!PlayerService || !PlayerService.seekTo) return;
    PlayerService.seekTo(sentence.from);
    if (preservePlayState) {
      var video = PlayerService.getVideo && PlayerService.getVideo();
      if (video && video.paused === false) {
        video.play();
      }
    }
  }

  function _startNormalPlayPauseAtEndCheck() {
    if (_normalPlayCheckTimer) return;
    _normalPlayCheckTimer = setInterval(function () {
      var video = PlayerService && PlayerService.getVideo && PlayerService.getVideo();
      if (!video || video.paused) return;
      if (RepeaterService && RepeaterService.isActive && RepeaterService.isActive()) return;
      var time = video.currentTime;
      var timeline = _getTimeline();
      for (var i = 0; i < timeline.length; i++) {
        if (time >= timeline[i].from && time < timeline[i].to) {
          if (time >= timeline[i].to - 0.2) {
            video.pause();
            clearInterval(_normalPlayCheckTimer);
            _normalPlayCheckTimer = null;
          }
          return;
        }
      }
    }, 100);
  }

  function _stopNormalPlayCheck() {
    if (_normalPlayCheckTimer) {
      clearInterval(_normalPlayCheckTimer);
      _normalPlayCheckTimer = null;
    }
  }

  function _onKeyDown(e) {
    if (!_enabled) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable)) return;
    if (e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      _spaceDownAt = Date.now();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      var idx = _getCurrentIndex();
      if (idx <= 0) return;
      var wasPlaying = PlayerService && PlayerService.getVideo && PlayerService.getVideo() && !PlayerService.getVideo().paused;
      _seekToSentence(idx - 1, wasPlaying);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      var idx = _getCurrentIndex();
      var timeline = _getTimeline();
      if (idx < 0 || idx >= timeline.length - 1) return;
      var wasPlaying = PlayerService && PlayerService.getVideo && PlayerService.getVideo() && !PlayerService.getVideo().paused;
      _seekToSentence(idx + 1, wasPlaying);
    }
  }

  function _onKeyUp(e) {
    if (!_enabled || e.key !== ' ') return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    var duration = Date.now() - _spaceDownAt;
    var video = PlayerService && PlayerService.getVideo && PlayerService.getVideo();
    if (!video) return;

    if (duration >= LONG_PRESS_MS) {
      var idx = _getCurrentIndex();
      var timeline = _getTimeline();
      if (idx < 0 || idx >= timeline.length) return;
      var sentence = timeline[idx];
      if (RepeaterService && RepeaterService.isActive && RepeaterService.isActive()) {
        RepeaterService.stop();
        _stopNormalPlayCheck();
      } else {
        RepeaterService.play(sentence.from, sentence.to, Infinity, 'sentence');
        _stopNormalPlayCheck();
      }
      return;
    }

    if (RepeaterService && RepeaterService.isActive && RepeaterService.isActive()) {
      if (video.paused) video.play();
      else video.pause();
      return;
    }

    if (video.paused) {
      video.play();
      _startNormalPlayPauseAtEndCheck();
    } else {
      video.pause();
      _stopNormalPlayCheck();
    }
  }

  function init() {
    _updateEnabled();
    document.addEventListener('keydown', _onKeyDown, true);
    document.addEventListener('keyup', _onKeyUp, true);
    window.addEventListener(Constants.EVENTS.SETTINGS_CHANGED, _updateEnabled);
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && changes[Constants.STORAGE_KEYS.SHORTCUT_ENABLED]) _updateEnabled();
      });
    }
  }

  return { init: init };
})();

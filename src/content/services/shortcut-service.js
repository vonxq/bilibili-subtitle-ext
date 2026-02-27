window.BiliSub = window.BiliSub || {};

window.BiliSub.ShortcutService = (function () {
  var Constants = window.BiliSub.Constants;
  var SubtitleService = window.BiliSub.SubtitleService;
  var PlayerService = window.BiliSub.PlayerService;
  var RepeaterService = window.BiliSub.RepeaterService;

  var _enabled = false;
  var _spaceDownAt = 0;
  var _autoPauseTimerId = null;
  var _autoWatcherId = null;
  var LONG_PRESS_MS = 400;
  var AUTO_PAUSE_LEAD_MS = 100; // 句末前 100ms 自动暂停
  var _autoPauseExpectedTime = 0;

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

  function _clearAutoPauseTimer() {
    if (_autoPauseTimerId) {
      clearInterval(_autoPauseTimerId);
      _autoPauseTimerId = null;
    }
    _autoPauseExpectedTime = 0;
  }

  function _scheduleAutoPause(toTime) {
    _clearAutoPauseTimer();

    var video = PlayerService && PlayerService.getVideo && PlayerService.getVideo();
    if (!video || video.paused) return;
    if (RepeaterService && RepeaterService.isActive && RepeaterService.isActive()) return;

    if (typeof toTime !== 'number' || isNaN(toTime)) return;
    var endTime = toTime;

    var targetTime = endTime - AUTO_PAUSE_LEAD_MS / 1000;
    _autoPauseExpectedTime = targetTime;
    _autoPauseTimerId = setInterval(function () {
      var v = PlayerService && PlayerService.getVideo && PlayerService.getVideo();
      if (!v || v.paused) { _clearAutoPauseTimer(); return; }
      if (RepeaterService && RepeaterService.isActive && RepeaterService.isActive()) { _clearAutoPauseTimer(); return; }

      var t = v.currentTime;
      // 只要已经到达或超过预期停止时间，就立刻暂停并校正到预期时间
      if (t >= _autoPauseExpectedTime) {
        try {
          v.pause();
          v.currentTime = _autoPauseExpectedTime;
        } catch (_) {}
        _clearAutoPauseTimer();
      }
    }, 50);
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
      var tl = _getTimeline();
      if (idx <= 0 || !tl.length) return;
      var wasPlaying = PlayerService && PlayerService.getVideo && PlayerService.getVideo() && !PlayerService.getVideo().paused;
      var targetIdx = idx - 1;
      var targetSentence = tl[targetIdx];
      _seekToSentence(targetIdx, wasPlaying);
      if (wasPlaying && targetSentence) _scheduleAutoPause(targetSentence.to);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      var idx = _getCurrentIndex();
      var timeline = _getTimeline();
      if (idx < 0 || idx >= timeline.length - 1) return;
      var wasPlaying = PlayerService && PlayerService.getVideo && PlayerService.getVideo() && !PlayerService.getVideo().paused;
      var nextIdx = idx + 1;
      var nextSentence = timeline[nextIdx];
      _seekToSentence(nextIdx, wasPlaying);
      if (wasPlaying && nextSentence) _scheduleAutoPause(nextSentence.to);
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
        _clearAutoPauseTimer();
      } else {
        RepeaterService.play(sentence.from, sentence.to, Infinity, 'sentence');
        _clearAutoPauseTimer();
      }
      return;
    }

    if (RepeaterService && RepeaterService.isActive && RepeaterService.isActive()) {
      _clearAutoPauseTimer();
      if (video.paused) video.play();
      else video.pause();
      return;
    }

    if (video.paused) {
      var tl2 = _getTimeline();
      var idx2 = _getCurrentIndex();
      var endTime2 = null;
      if (tl2.length && idx2 >= 0 && idx2 < tl2.length) {
        endTime2 = tl2[idx2].to;
      }
      video.play();
      _scheduleAutoPause(endTime2);
    } else {
      video.pause();
      _clearAutoPauseTimer();
    }
  }

  function init() {
    _updateEnabled();
    document.addEventListener('keydown', _onKeyDown, true);
    document.addEventListener('keyup', _onKeyUp, true);
    window.addEventListener(Constants.EVENTS.SETTINGS_CHANGED, _updateEnabled);
    // 当视频已经在播放且用户尚未使用快捷键时，也自动为当前句设置一次暂停点
    if (!_autoWatcherId) {
      _autoWatcherId = setInterval(function () {
        if (!_enabled || _autoPauseTimerId) return;
        var v = PlayerService && PlayerService.getVideo && PlayerService.getVideo();
        if (!v || v.paused) return;
        var tl = _getTimeline();
        var idx = _getCurrentIndex();
        if (!tl.length || idx < 0 || idx >= tl.length) return;
        _scheduleAutoPause(tl[idx].to);
      }, 500);
    }
    if (chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function (changes, area) {
        if (area === 'local' && changes[Constants.STORAGE_KEYS.SHORTCUT_ENABLED]) _updateEnabled();
      });
    }
  }

  return { init: init };
})();

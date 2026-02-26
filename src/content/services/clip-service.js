window.BiliSub = window.BiliSub || {};

window.BiliSub.ClipService = (function () {
  var PlayerService = window.BiliSub.PlayerService;
  var SubtitleService = window.BiliSub.SubtitleService;

  var MAX_AUTO_CLIPS = 20;
  var _autoClips = new Map();
  var _currentRecorder = null;
  var _currentChunks = [];
  var _currentKey = null;
  var _lastIdx = -1;
  var _videoEl = null;

  function _key(from, to) {
    return from.toFixed(2) + '_' + to.toFixed(2);
  }

  function _blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(r.error); };
      r.readAsDataURL(blob);
    });
  }

  function persistClip(blob) {
    return _blobToDataUrl(blob).then(function (dataUrl) {
      return new Promise(function (resolve, reject) {
        chrome.runtime.sendMessage({ action: 'save-clip', dataUrl: dataUrl }, function (resp) {
          if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
          if (resp && resp.clipId) resolve(resp.clipId);
          else reject(new Error(resp && resp.error || 'save-clip failed'));
        });
      });
    });
  }

  function _createRecorder(stream) {
    var mime = null;
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mime = 'video/webm;codecs=vp9,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
      mime = 'video/webm;codecs=vp8,opus';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      mime = 'video/webm;codecs=vp9';
    } else {
      mime = 'video/webm';
    }
    return new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 2500000,
      audioBitsPerSecond: 128000,
    });
  }

  function deleteClip(clipId) {
    return new Promise(function (resolve) {
      chrome.runtime.sendMessage({ action: 'delete-clip', clipId: clipId }, function () { resolve(); });
    });
  }

  function _stopCurrent() {
    if (_currentRecorder && _currentRecorder.state === 'recording') {
      try { _currentRecorder.stop(); } catch (_) {}
    }
  }

  function _evictOldest() {
    if (_autoClips.size <= MAX_AUTO_CLIPS) return;
    var first = _autoClips.keys().next().value;
    _autoClips.delete(first);
  }

  function _startSentence(video, from, to) {
    _stopCurrent();
    var k = _key(from, to);
    if (_autoClips.has(k)) return;

    var stream;
    try { stream = video.captureStream(); } catch (_) { return; }
    if (!stream || stream.getTracks().length === 0) return;

    try {
      _currentRecorder = _createRecorder(stream);
    } catch (_) { return; }

    _currentChunks = [];
    _currentKey = k;
    var capturedFrom = from;
    var capturedTo = to;

    _currentRecorder.ondataavailable = function (e) {
      if (e.data && e.data.size > 0) _currentChunks.push(e.data);
    };
    _currentRecorder.onstop = function () {
      if (_currentChunks.length > 0) {
        var blob = new Blob(_currentChunks, { type: 'video/webm' });
        _autoClips.set(_currentKey, { from: capturedFrom, to: capturedTo, blob: blob });
        _evictOldest();
      }
      _currentRecorder = null;
      _currentChunks = [];
      _currentKey = null;
    };
    _currentRecorder.start(500);
  }

  function _onTimeUpdate() {
    if (!_videoEl || _videoEl.paused) return;
    var tl = SubtitleService && SubtitleService.getTimeline ? SubtitleService.getTimeline() : [];
    if (!tl.length) return;

    var t = _videoEl.currentTime;
    var idx = -1;
    for (var i = 0; i < tl.length; i++) {
      if (t >= tl[i].from && t < tl[i].to) { idx = i; break; }
    }
    if (idx === -1) {
      _stopCurrent();
      _lastIdx = -1;
      return;
    }
    if (idx !== _lastIdx) {
      _lastIdx = idx;
      _startSentence(_videoEl, tl[idx].from, tl[idx].to);
    }
  }

  function startAutoRecord() {
    var v = PlayerService && PlayerService.getVideo ? PlayerService.getVideo() : null;
    if (!v) return;
    if (_videoEl === v) return;
    if (_videoEl) _videoEl.removeEventListener('timeupdate', _onTimeUpdate);
    _videoEl = v;
    _videoEl.addEventListener('timeupdate', _onTimeUpdate);
  }

  function stopAutoRecord() {
    if (_videoEl) {
      _videoEl.removeEventListener('timeupdate', _onTimeUpdate);
      _videoEl = null;
    }
    _stopCurrent();
    _lastIdx = -1;
  }

  function getAutoClip(from, to) {
    var c = _autoClips.get(_key(from, to));
    return c ? c.blob : null;
  }

  function _collectRangeBlobs(fromSec, toSec) {
    var tl = SubtitleService && SubtitleService.getTimeline ? SubtitleService.getTimeline() : [];
    var blobs = [];
    for (var i = 0; i < tl.length; i++) {
      if (tl[i].to <= fromSec || tl[i].from >= toSec) continue;
      var c = _autoClips.get(_key(tl[i].from, tl[i].to));
      if (c) blobs.push(c.blob);
      else return null;
    }
    return blobs.length ? blobs : null;
  }

  function requestClip(fromSec, toSec) {
    // 当前策略：始终按需录制一段新切片，避免依赖自动缓存导致的无声问题
    return _recordAndPersist(fromSec, toSec);
  }

  function _recordAndPersist(fromSec, toSec) {
    return new Promise(function (resolve, reject) {
      var el = document.querySelector('.bpx-player-video-wrap video') || document.querySelector('video');
      if (!el) { reject(new Error('未找到视频元素')); return; }

      var stream;
      try { stream = el.captureStream(); } catch (err) {
        reject(new Error('无法捕获视频流')); return;
      }

      var rec;
      try {
        rec = _createRecorder(stream);
      } catch (err2) {
        reject(new Error('无法创建录制器')); return;
      }
      var chunks = [];
      var recordedBlob = null;

      rec.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };
      rec.onstop = function () {
        recordedBlob = new Blob(chunks, { type: 'video/webm' });
        persistClip(recordedBlob).then(function (clipId) {
          resolve({ clipId: clipId, blob: recordedBlob });
        }).catch(reject);
      };
      rec.onerror = function () { reject(new Error('录制出错')); };

      el.currentTime = fromSec;
      function onSeeked() {
        el.removeEventListener('seeked', onSeeked);
        rec.start(500);
        el.play();

        var check = setInterval(function () {
          if (el.currentTime >= toSec - 0.05) {
            clearInterval(check);
            el.pause();
            setTimeout(function () { if (rec.state === 'recording') rec.stop(); }, 200);
          }
        }, 80);

        setTimeout(function () {
          clearInterval(check);
          if (rec.state === 'recording') { el.pause(); rec.stop(); }
        }, (toSec - fromSec + 2) * 1000);
      }
      el.addEventListener('seeked', onSeeked, { once: true });
    });
  }

  return {
    persistClip: persistClip,
    deleteClip: deleteClip,
    requestClip: requestClip,
    recordFreshClip: _recordAndPersist,
    getAutoClip: getAutoClip,
    startAutoRecord: startAutoRecord,
    stopAutoRecord: stopAutoRecord,
  };
})();

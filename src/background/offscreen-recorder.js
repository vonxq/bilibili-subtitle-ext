(function () {
  'use strict';

  var IDB_NAME = 'bili-sub-db';
  var CLIPS_STORE = 'bili-sub-clips';
  var _db = null;
  var _recorder = null;
  var _chunks = [];

  function getDb() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB_NAME, 1);
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        _db = req.result;
        resolve(_db);
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(CLIPS_STORE)) db.createObjectStore(CLIPS_STORE);
      };
    });
  }

  function generateClipId() {
    return 'clip_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function saveClip(blob) {
    var id = generateClipId();
    var payload = { blob: blob, createdAt: Date.now() };
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(CLIPS_STORE, 'readwrite');
        var store = tx.objectStore(CLIPS_STORE);
        var req = store.put(payload, id);
        req.onsuccess = function () { resolve(id); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
    if (msg.target !== 'offscreen' || msg.type !== 'start-record') return;
    var streamId = msg.streamId;
    var durationMs = msg.durationMs || 10000;
    _chunks = [];

    if (!streamId) {
      sendResponse({ error: 'No streamId' });
      return true;
    }

    var tabConstraint = {
      mandatory: { chromeMediaSource: 'tab', chromeMediaSourceId: streamId },
    };
    var constraints = { audio: tabConstraint, video: tabConstraint };

    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      _recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 2500000 });
      _recorder.ondataavailable = function (e) {
        if (e.data && e.data.size > 0) _chunks.push(e.data);
      };
      _recorder.onstop = function () {
        stream.getTracks().forEach(function (t) { t.stop(); });
        var blob = new Blob(_chunks, { type: 'video/webm' });
        saveClip(blob).then(function (clipId) {
          chrome.runtime.sendMessage({ target: 'background', type: 'clip-done', clipId: clipId });
        }).catch(function (err) {
          chrome.runtime.sendMessage({ target: 'background', type: 'clip-done', error: err && err.message });
        });
      };
      _recorder.start(1000);
      setTimeout(function () {
        if (_recorder && _recorder.state === 'recording') _recorder.stop();
      }, durationMs);
      sendResponse({ ok: true });
    }).catch(function (err) {
      sendResponse({ error: err && err.message ? err.message : 'getUserMedia failed' });
    });

    return true;
  });
})();

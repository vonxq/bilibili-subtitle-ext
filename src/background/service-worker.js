function isBilibiliVideo(url) {
  if (!url) return false;
  return /:\/\/[^/]*bilibili\.com\/(video|cheese)\//.test(url);
}

function updateActionForTab(tabId, url) {
  if (!chrome.action || !tabId) return;
  var isVideo = isBilibiliVideo(url);
  try {
    chrome.action.setPopup({
      tabId: tabId,
      popup: isVideo ? '' : 'src/options/popup.html',
    });
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(function () {
  console.log('[BiliSub] Extension installed');
});

if (chrome.tabs && chrome.action) {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      updateActionForTab(tabId, tab.url);
    }
  });

  chrome.tabs.onActivated.addListener(function (info) {
    chrome.tabs.get(info.tabId, function (tab) {
      if (chrome.runtime.lastError) return;
      updateActionForTab(tab.id, tab.url);
    });
  });
}

if (chrome.action) {
  chrome.action.onClicked.addListener(function (tab) {
    if (!tab || !tab.id || !tab.url) return;
    if (isBilibiliVideo(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle-panel' });
    }
  });
}

var IDB_NAME = 'bili-sub-db';
var IDB_VERSION = 1;
var CLIPS_STORE = 'bili-sub-clips';
var NOTE_IMAGES_STORE = 'bili-sub-note-images';

function _openDb() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onerror = function () { reject(req.error); };
    req.onsuccess = function () { resolve(req.result); };
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(CLIPS_STORE)) db.createObjectStore(CLIPS_STORE);
      if (!db.objectStoreNames.contains(NOTE_IMAGES_STORE)) db.createObjectStore(NOTE_IMAGES_STORE);
    };
  });
}

function _generateClipId() {
  return 'clip_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function _dataUrlToBlob(dataUrl) {
  var parts = dataUrl.split(',');
  var mime = parts[0].match(/data:([^;]+);/);
  var type = mime ? mime[1] : 'video/webm';
  var binary = atob(parts[1]);
  var arr = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: type });
}

function saveClipFromDataUrl(dataUrl) {
  var blob = _dataUrlToBlob(dataUrl);
  var id = _generateClipId();
  return _openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(CLIPS_STORE, 'readwrite');
      var req = tx.objectStore(CLIPS_STORE).put({ blob: blob, createdAt: Date.now() }, id);
      req.onsuccess = function () { resolve(id); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

function deleteClipFromDb(clipId) {
  return _openDb().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(CLIPS_STORE, 'readwrite');
      var req = tx.objectStore(CLIPS_STORE).delete(clipId);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error); };
    });
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (msg.action === 'open-bookmarks-page') {
    var url = chrome.runtime.getURL('src/bookmarks/bookmarks.html');
    chrome.tabs.create({ url: url }, function () { sendResponse({ ok: true }); });
    return true;
  }

  if (msg.action === 'save-clip') {
    saveClipFromDataUrl(msg.dataUrl).then(function (clipId) {
      sendResponse({ clipId: clipId });
    }).catch(function (err) {
      sendResponse({ error: err && err.message || 'save failed' });
    });
    return true;
  }

  if (msg.action === 'delete-clip') {
    deleteClipFromDb(msg.clipId).then(function () {
      sendResponse({ ok: true });
    }).catch(function () {
      sendResponse({ ok: false });
    });
    return true;
  }
});

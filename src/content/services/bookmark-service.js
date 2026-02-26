window.BiliSub = window.BiliSub || {};

window.BiliSub.BookmarkService = (function () {
  var Constants = window.BiliSub.Constants;
  var KEYS = Constants.STORAGE_KEYS;
  var IDB = Constants.INDEXEDDB;
  var _db = null;

  function _id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  }

  function _getDb() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(IDB.NAME, 1);
      req.onerror = function () { reject(req.error); };
      req.onsuccess = function () {
        _db = req.result;
        resolve(_db);
      };
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(IDB.CLIPS_STORE)) {
          db.createObjectStore(IDB.CLIPS_STORE);
        }
        if (!db.objectStoreNames.contains(IDB.NOTE_IMAGES_STORE)) {
          db.createObjectStore(IDB.NOTE_IMAGES_STORE);
        }
      };
    });
  }

  function _getBookmarks() {
    return new Promise(function (resolve) {
      if (!chrome.storage || !chrome.storage.local) {
        resolve([]);
        return;
      }
      chrome.storage.local.get(KEYS.BOOKMARKS, function (res) {
        var list = res[KEYS.BOOKMARKS];
        resolve(Array.isArray(list) ? list : []);
      });
    });
  }

  function _setBookmarks(list) {
    return new Promise(function (resolve) {
      if (!chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ [KEYS.BOOKMARKS]: list }, resolve);
    });
  }

  function _getTags() {
    return new Promise(function (resolve) {
      if (!chrome.storage || !chrome.storage.local) {
        resolve([]);
        return;
      }
      chrome.storage.local.get(KEYS.BOOKMARK_TAGS, function (res) {
        var tags = res[KEYS.BOOKMARK_TAGS];
        resolve(Array.isArray(tags) ? tags : []);
      });
    });
  }

  function _setTags(tags) {
    return new Promise(function (resolve) {
      if (!chrome.storage || !chrome.storage.local) {
        resolve();
        return;
      }
      chrome.storage.local.set({ [KEYS.BOOKMARK_TAGS]: tags }, resolve);
    });
  }

  function add(bookmark) {
    if (!bookmark || !bookmark.sentences || !bookmark.video) return Promise.reject(new Error('invalid bookmark'));
    var id = bookmark.id || _id();
    var item = {
      id: id,
      type: bookmark.type === 'segment' ? 'segment' : 'sentence',
      sentences: bookmark.sentences,
      video: bookmark.video,
      note: bookmark.note || '',
      tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
      clipId: bookmark.clipId || null,
      createdAt: typeof bookmark.createdAt === 'number' ? bookmark.createdAt : Date.now(),
    };
    return _getBookmarks().then(function (list) {
      list.push(item);
      return _setBookmarks(list);
    }).then(function () {
      return _mergeTags(item.tags);
    }).then(function () {
      try {
        window.dispatchEvent(new CustomEvent(Constants.EVENTS.BOOKMARK_ADDED, { detail: item }));
      } catch (_) {}
      return item;
    });
  }

  function list() {
    return _getBookmarks();
  }

  function get(id) {
    return _getBookmarks().then(function (list) {
      return list.find(function (b) { return b.id === id; }) || null;
    });
  }

  function update(id, patch) {
    return _getBookmarks().then(function (list) {
      var idx = list.findIndex(function (b) { return b.id === id; });
      if (idx < 0) return null;
      var cur = list[idx];
      var next = {
        id: cur.id,
        type: patch.type !== undefined ? patch.type : cur.type,
        sentences: patch.sentences !== undefined ? patch.sentences : cur.sentences,
        video: patch.video !== undefined ? patch.video : cur.video,
        note: patch.note !== undefined ? patch.note : cur.note,
        tags: patch.tags !== undefined ? patch.tags : cur.tags,
        clipId: patch.clipId !== undefined ? patch.clipId : cur.clipId,
        createdAt: cur.createdAt,
      };
      list[idx] = next;
      return _setBookmarks(list).then(function () {
        return _mergeTags(next.tags).then(function () { return next; });
      });
    });
  }

  function remove(id) {
    return _getBookmarks().then(function (list) {
      var idx = list.findIndex(function (b) { return b.id === id; });
      if (idx < 0) return false;
      list.splice(idx, 1);
      return _setBookmarks(list).then(function () {
        return deleteNoteImages(id).then(function () { return true; });
      });
    });
  }

  function _mergeTags(newTags) {
    if (!newTags || !newTags.length) return _getTags();
    return _getTags().then(function (existing) {
      var set = {};
      existing.forEach(function (t) { set[t] = true; });
      newTags.forEach(function (t) { if (t && String(t).trim()) set[String(t).trim()] = true; });
      var merged = Object.keys(set).sort();
      return _setTags(merged).then(function () { return merged; });
    });
  }

  function getAllTags() {
    return _getTags();
  }

  function exportBookmarks() {
    return _getBookmarks().then(function (list) {
      return { version: 1, exportedAt: Date.now(), bookmarks: list };
    });
  }

  function saveNoteImage(bookmarkId, index, blob) {
    return _getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB.NOTE_IMAGES_STORE, 'readwrite');
        var store = tx.objectStore(IDB.NOTE_IMAGES_STORE);
        var key = bookmarkId + '_' + index;
        var req = store.put(blob, key);
        req.onsuccess = function () { resolve(); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getNoteImage(bookmarkId, index) {
    return _getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB.NOTE_IMAGES_STORE, 'readonly');
        var store = tx.objectStore(IDB.NOTE_IMAGES_STORE);
        var key = bookmarkId + '_' + index;
        var req = store.get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function deleteNoteImages(bookmarkId) {
    return _getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB.NOTE_IMAGES_STORE, 'readwrite');
        var store = tx.objectStore(IDB.NOTE_IMAGES_STORE);
        var req = store.openCursor();
        req.onsuccess = function () {
          var cursor = req.result;
          if (!cursor) {
            resolve();
            return;
          }
          if (cursor.key && String(cursor.key).indexOf(bookmarkId + '_') === 0) {
            cursor.delete();
          }
          cursor.continue();
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  return {
    add: add,
    list: list,
    get: get,
    update: update,
    remove: remove,
    getAllTags: getAllTags,
    exportBookmarks: exportBookmarks,
    saveNoteImage: saveNoteImage,
    getNoteImage: getNoteImage,
    deleteNoteImages: deleteNoteImages,
    getDb: _getDb,
  };
})();

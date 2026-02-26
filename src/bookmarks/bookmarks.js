(function () {
  'use strict';

  var STORAGE_KEYS = { BOOKMARKS: 'bili-sub-bookmarks', BOOKMARK_TAGS: 'bili-sub-bookmark-tags' };
  var IDB = { NAME: 'bili-sub-db', CLIPS_STORE: 'bili-sub-clips', NOTE_IMAGES_STORE: 'bili-sub-note-images' };

  var _db = null;
  var _bookmarks = [];
  var _allTags = [];
  var _selectedVideoUrls = [];
  var _selectedTags = [];
  var _timeRange = 'all';
  var _displayMode = 'bilingual';

  function getDb() {
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
        if (!db.objectStoreNames.contains(IDB.CLIPS_STORE)) db.createObjectStore(IDB.CLIPS_STORE);
        if (!db.objectStoreNames.contains(IDB.NOTE_IMAGES_STORE)) db.createObjectStore(IDB.NOTE_IMAGES_STORE);
      };
    });
  }

  function getNoteImage(bookmarkId, index) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB.NOTE_IMAGES_STORE, 'readonly');
        var req = tx.objectStore(IDB.NOTE_IMAGES_STORE).get(bookmarkId + '_' + index);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function getClipBlob(clipId) {
    return getDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(IDB.CLIPS_STORE, 'readonly');
        var req = tx.objectStore(IDB.CLIPS_STORE).get(clipId);
        req.onsuccess = function () {
          var row = req.result;
          resolve(row && row.blob ? row.blob : (row instanceof Blob ? row : null));
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function markdownToHtml(md, getAssetUrl) {
    if (!md) return '';
    var html = escapeHtml(md);
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    html = html.replace(/!\[([^\]]*)\]\((asset:\d+)\)/g, function (_, alt, ref) {
      var num = ref.replace('asset:', '');
      return '<img data-asset-index="' + escapeHtml(num) + '" alt="" class="bili-bookmarks__note-img"/>';
    });
    html = html.replace(/!\[([^\]]*)\]\((data:[^)]+)\)/g, function (_, alt, src) {
      return '<img src="' + escapeHtml(src) + '" alt="" class="bili-bookmarks__note-img"/>';
    });
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, t, u) {
      return '<a href="' + escapeHtml(u) + '" target="_blank" rel="noopener">' + escapeHtml(t) + '</a>';
    });
    html = html.replace(/\n/g, '<br>');
    return html;
  }

  function formatTime(sec) {
    if (typeof sec !== 'number' || isNaN(sec)) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  var TTS_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M4 9v6h3l4 4V5L7 9H4z" fill="currentColor"></path><path d="M16 8a4 4 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>';

  var _ttsActiveBtn = null;

  function detectLang(text) {
    if (!text) return 'en-US';
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh-CN';
    if (/[\u3040-\u30ff]/.test(text)) return 'ja-JP';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar-SA';
    if (/[\u00c0-\u024f\u00d1\u00f1]/.test(text)) return 'es-ES';
    return 'en-US';
  }

  function speakText(text, lang, activeBtn) {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    _ttsActiveBtn = activeBtn || null;
    setTimeout(function () {
      try {
        var u = new SpeechSynthesisUtterance(text);
        u.lang = lang || 'en-US';
        u.rate = 0.9;
        u.onend = u.onerror = function () { if (_ttsActiveBtn === activeBtn) _ttsActiveBtn = null; };
        window.speechSynthesis.speak(u);
      } catch (_) { _ttsActiveBtn = null; }
    }, 50);
  }

  function createTtsButton(text, lang) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bili-bookmarks__tts-btn';
    btn.innerHTML = TTS_ICON;
    btn.title = '朗读';
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (_ttsActiveBtn === btn && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        _ttsActiveBtn = null;
        return;
      }
      speakText(text, lang || detectLang(text), btn);
    });
    return btn;
  }

  function jumpUrl(video) {
    if (!video || !video.url) return '#';
    var url = video.url.split('?')[0].split('#')[0];
    var t = video.from != null ? Math.floor(video.from) : 0;
    return url + (url.indexOf('?') >= 0 ? '&' : '?') + 't=' + t;
  }

  function loadData() {
    return new Promise(function (resolve) {
      chrome.storage.local.get([STORAGE_KEYS.BOOKMARKS, STORAGE_KEYS.BOOKMARK_TAGS], function (res) {
        _bookmarks = Array.isArray(res[STORAGE_KEYS.BOOKMARKS]) ? res[STORAGE_KEYS.BOOKMARKS] : [];
        _allTags = Array.isArray(res[STORAGE_KEYS.BOOKMARK_TAGS]) ? res[STORAGE_KEYS.BOOKMARK_TAGS] : [];
        resolve();
      });
    });
  }

  function filterBookmarks() {
    var list = _bookmarks.slice();
    if (_selectedVideoUrls.length) {
      list = list.filter(function (b) { return _selectedVideoUrls.indexOf(b.video && b.video.url) !== -1; });
    }
    if (_selectedTags.length) {
      list = list.filter(function (b) {
        return _selectedTags.some(function (t) { return b.tags && b.tags.indexOf(t) !== -1; });
      });
    }
    if (_timeRange !== 'all') {
      var days = parseInt(_timeRange, 10);
      var cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      list = list.filter(function (b) { return b.createdAt >= cutoff; });
    }
    return list;
  }

  function groupByVideo(list) {
    var map = {};
    list.forEach(function (b) {
      var url = (b.video && b.video.url) || '';
      var key = url || 'unknown';
      if (!map[key]) map[key] = { video: b.video || {}, items: [] };
      map[key].items.push(b);
    });
    return Object.keys(map).map(function (key) { return map[key]; });
  }

  function deleteBookmark(id) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS, function (res) {
        var list = Array.isArray(res[STORAGE_KEYS.BOOKMARKS]) ? res[STORAGE_KEYS.BOOKMARKS] : [];
        list = list.filter(function (b) { return b.id !== id; });
        chrome.storage.local.set({ [STORAGE_KEYS.BOOKMARKS]: list }, function () {
          getDb().then(function (db) {
            return new Promise(function (resolved) {
              var tx = db.transaction(IDB.NOTE_IMAGES_STORE, 'readwrite');
              var store = tx.objectStore(IDB.NOTE_IMAGES_STORE);
              var req = store.openCursor();
              req.onsuccess = function () {
                var cursor = req.result;
                if (!cursor) { resolved(); return; }
                if (String(cursor.key).indexOf(id + '_') === 0) cursor.delete();
                cursor.continue();
              };
            });
          }).then(resolve).catch(resolve);
        });
      });
    });
  }

  function _rowWithTts(text, isTarget) {
    var row = document.createElement('div');
    row.className = isTarget ? 'bili-bookmarks__sentence-target-row' : 'bili-bookmarks__sentence-native-row';
    var span = document.createElement('span');
    span.className = isTarget ? 'bili-bookmarks__sentence-target' : 'bili-bookmarks__sentence-native';
    span.textContent = text;
    row.appendChild(span);
    row.appendChild(createTtsButton(text));
    return row;
  }

  function _buildSentenceItem(s, video, mode) {
    mode = mode || _displayMode;
    var item = document.createElement('div');
    item.className = 'bili-bookmarks__sentence-item';
    var controls = document.createElement('div');
    controls.className = 'bili-bookmarks__sentence-controls';
    var timeEl = document.createElement('span');
    timeEl.className = 'bili-bookmarks__sentence-time';
    timeEl.textContent = formatTime(s.from);
    controls.appendChild(timeEl);
    var jumpA = document.createElement('a');
    jumpA.href = jumpUrl({ url: video && video.url, from: s.from });
    jumpA.target = '_blank';
    jumpA.className = 'bili-bookmarks__sentence-jump';
    jumpA.textContent = '跳转';
    controls.appendChild(jumpA);
    item.appendChild(controls);

    if (mode === 'bilingual') {
      if (s.target) item.appendChild(_rowWithTts(s.target, true));
      if (s.native) item.appendChild(_rowWithTts(s.native, false));
    } else if (mode === 'learning') {
      if (s.target) item.appendChild(_rowWithTts(s.target, true));
      if (s.native) {
        var reveal = document.createElement('div');
        reveal.className = 'bili-bookmarks__sentence-reveal';
        reveal.appendChild(_rowWithTts(s.native, false));
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'bili-bookmarks__reveal-btn';
        btn.textContent = '查看翻译';
        btn.addEventListener('click', function () {
          item.classList.toggle('bili-bookmarks__sentence-item--expanded');
          btn.textContent = item.classList.contains('bili-bookmarks__sentence-item--expanded') ? '收起翻译' : '查看翻译';
        });
        item.appendChild(reveal);
        item.appendChild(btn);
      }
    } else {
      if (s.native) item.appendChild(_rowWithTts(s.native, true));
      if (s.target) {
        var reveal2 = document.createElement('div');
        reveal2.className = 'bili-bookmarks__sentence-reveal';
        reveal2.appendChild(_rowWithTts(s.target, false));
        var btn2 = document.createElement('button');
        btn2.type = 'button';
        btn2.className = 'bili-bookmarks__reveal-btn';
        btn2.textContent = '查看原文';
        btn2.addEventListener('click', function () {
          item.classList.toggle('bili-bookmarks__sentence-item--expanded');
          btn2.textContent = item.classList.contains('bili-bookmarks__sentence-item--expanded') ? '收起原文' : '查看原文';
        });
        item.appendChild(reveal2);
        item.appendChild(btn2);
      }
    }
    return item;
  }

  function renderBookmarks() {
    var list = filterBookmarks();
    var groups = groupByVideo(list);
    var listEl = document.getElementById('bookmarks-list');
    var emptyEl = document.getElementById('empty-state');
    listEl.innerHTML = '';
    if (groups.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    groups.forEach(function (group) {
      var section = document.createElement('section');
      section.className = 'bili-bookmarks__video-group';
      var titleEl = document.createElement('h2');
      titleEl.className = 'bili-bookmarks__video-title';
      titleEl.textContent = (group.video && group.video.title) || '未知视频';
      section.appendChild(titleEl);

      group.items.forEach(function (b) {
        var card = document.createElement('div');
        card.className = 'bili-bookmarks__card';
        var timeRange = formatTime(b.video && b.video.from) + ' - ' + formatTime(b.video && b.video.to);
        var typeLabel = b.type === 'segment' ? 'AB 段 (' + (b.sentences && b.sentences.length) + ' 句)' : '单句';
        card.innerHTML =
          '<div class="bili-bookmarks__card-header">' +
            '<div class="bili-bookmarks__card-meta">' +
              '<div class="bili-bookmarks__card-meta-line">' +
                '<span class="bili-bookmarks__card-type">' + typeLabel + '</span>' +
                '<span class="bili-bookmarks__card-time">' + timeRange + '</span>' +
              '</div>' +
              '<div class="bili-bookmarks__card-meta-tags"></div>' +
            '</div>' +
            '<div class="bili-bookmarks__card-actions">' +
              '<a href="' + escapeHtml(jumpUrl(b.video)) + '" target="_blank" class="bili-bookmarks__card-btn bili-bookmarks__card-btn--jump">跳转原视频</a>' +
              '<button type="button" class="bili-bookmarks__card-btn bili-bookmarks__card-btn--del" data-id="' + escapeHtml(b.id) + '">删除</button>' +
            '</div>' +
          '</div>' +
          '<div class="bili-bookmarks__card-body">' +
            '<div class="bili-bookmarks__card-col bili-bookmarks__card-col--left">' +
              '<div class="bili-bookmarks__card-section bili-bookmarks__card-section--sentences"><div class="bili-bookmarks__card-sentences"></div></div>' +
            '</div>' +
            '<div class="bili-bookmarks__card-col bili-bookmarks__card-col--right">' +
              (b.note ? '<div class="bili-bookmarks__card-section bili-bookmarks__card-section--note"><div class="bili-bookmarks__card-note"></div></div>' : '') +
              (b.clipId ? '<div class="bili-bookmarks__card-section bili-bookmarks__card-section--clip"><div class="bili-bookmarks__card-clip" data-clip-id="' + escapeHtml(b.clipId) + '"></div></div>' : '') +
            '</div>' +
          '</div>';

        var sentencesEl = card.querySelector('.bili-bookmarks__card-sentences');
        if (b.sentences && b.sentences.length) {
          if (b.type === 'segment' && b.sentences.length > 1) {
            var summary = document.createElement('div');
            summary.className = 'bili-bookmarks__card-sentences-summary';
            summary.textContent = b.sentences[0].target || b.sentences[0].native || '';
            if (b.sentences.length > 1) summary.textContent += ' …';
            var expandBtn = document.createElement('button');
            expandBtn.type = 'button';
            expandBtn.className = 'bili-bookmarks__expand-btn';
            expandBtn.textContent = '按句展开';
            var expanded = false;
            var detailWrap = document.createElement('div');
            detailWrap.className = 'bili-bookmarks__card-sentences-detail';
            detailWrap.style.display = 'none';
            b.sentences.forEach(function (s) {
              detailWrap.appendChild(_buildSentenceItem(s, b.video, _displayMode));
            });
            expandBtn.addEventListener('click', function () {
              expanded = !expanded;
              detailWrap.style.display = expanded ? 'block' : 'none';
              expandBtn.textContent = expanded ? '收起' : '按句展开';
            });
            sentencesEl.appendChild(summary);
            sentencesEl.appendChild(expandBtn);
            sentencesEl.appendChild(detailWrap);
          } else {
            b.sentences.forEach(function (s) {
              sentencesEl.appendChild(_buildSentenceItem(s, b.video, _displayMode));
            });
          }
        }

        if (b.note) {
          var noteEl = card.querySelector('.bili-bookmarks__card-note');
          noteEl.innerHTML = markdownToHtml(b.note);
          noteEl.querySelectorAll('img[data-asset-index]').forEach(function (img) {
            var num = parseInt(img.getAttribute('data-asset-index'), 10);
            getNoteImage(b.id, num).then(function (blob) {
              if (blob) img.src = URL.createObjectURL(blob);
            });
          });
        }

        if (b.tags && b.tags.length) {
          var tagsEl = card.querySelector('.bili-bookmarks__card-meta-tags');
          b.tags.forEach(function (t) {
            var span = document.createElement('span');
            span.className = 'bili-bookmarks__tag';
            span.textContent = t;
            tagsEl.appendChild(span);
          });
        }

        var clipContainer = card.querySelector('.bili-bookmarks__card-clip[data-clip-id]');
        if (clipContainer) {
          (function (container) {
            var cid = container.getAttribute('data-clip-id');
            getClipBlob(cid).then(function (blob) {
              if (!blob) {
                container.textContent = '切片已丢失';
                container.style.color = 'var(--bili-sub-text-muted)';
                return;
              }
              var url = URL.createObjectURL(blob);
              var videoEl = document.createElement('video');
              videoEl.src = url;
              videoEl.controls = true;
              videoEl.preload = 'metadata';
              videoEl.className = 'bili-bookmarks__clip-video';
              var fullscreenBtn = document.createElement('button');
              fullscreenBtn.type = 'button';
              fullscreenBtn.className = 'bili-bookmarks__clip-fullscreen-btn';
              fullscreenBtn.textContent = '全屏';
              fullscreenBtn.addEventListener('click', function () {
                if (videoEl.requestFullscreen) videoEl.requestFullscreen();
                else if (videoEl.webkitRequestFullscreen) videoEl.webkitRequestFullscreen();
              });
              container.appendChild(videoEl);
              container.appendChild(fullscreenBtn);
            }).catch(function () {
              container.textContent = '切片加载失败';
              container.style.color = 'var(--bili-sub-text-muted)';
            });
          })(clipContainer);
        }
        card.querySelector('[data-id]').addEventListener('click', function () {
          var id = this.getAttribute('data-id');
          deleteBookmark(id).then(function () {
            loadData().then(function () { renderFilters(); renderBookmarks(); });
          });
        });

        section.appendChild(card);
      });
      listEl.appendChild(section);
    });
  }

  function renderFilters() {
    var videos = [];
    var seen = {};
    _bookmarks.forEach(function (b) {
      var url = b.video && b.video.url;
      var title = (b.video && b.video.title) || url || '未知';
      if (url && !seen[url]) {
        seen[url] = true;
        videos.push({ url: url, title: title });
      }
    });

    var videosEl = document.getElementById('filter-videos');
    videosEl.innerHTML = '';
    videos.forEach(function (v) {
      var label = document.createElement('label');
      label.className = 'bili-bookmarks__filter-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = v.url;
      cb.checked = _selectedVideoUrls.length === 0 || _selectedVideoUrls.indexOf(v.url) !== -1;
      cb.addEventListener('change', function () {
        if (cb.checked) {
          _selectedVideoUrls = _selectedVideoUrls.indexOf(v.url) === -1 ? _selectedVideoUrls.concat(v.url) : _selectedVideoUrls;
        } else {
          if (_selectedVideoUrls.length === 0) {
            _selectedVideoUrls = videos.map(function (x) { return x.url; }).filter(function (u) { return u !== v.url; });
          } else {
            _selectedVideoUrls = _selectedVideoUrls.filter(function (u) { return u !== v.url; });
          }
        }
        renderBookmarks();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(v.title.length > 40 ? v.title.slice(0, 40) + '…' : v.title));
      videosEl.appendChild(label);
    });

    var tagsEl = document.getElementById('filter-tags');
    tagsEl.innerHTML = '';
    _allTags.forEach(function (t) {
      var label = document.createElement('label');
      label.className = 'bili-bookmarks__filter-check';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = t;
      cb.checked = _selectedTags.length === 0 || _selectedTags.indexOf(t) !== -1;
      cb.addEventListener('change', function () {
        if (cb.checked) {
          _selectedTags = _selectedTags.indexOf(t) === -1 ? _selectedTags.concat(t) : _selectedTags;
        } else {
          _selectedTags = _selectedTags.filter(function (x) { return x !== t; });
        }
        renderBookmarks();
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(t));
      tagsEl.appendChild(label);
    });

    document.getElementById('filter-time').value = _timeRange;
    document.getElementById('filter-time').addEventListener('change', function () {
      _timeRange = this.value;
      renderBookmarks();
    });
  }

  document.getElementById('export-btn').addEventListener('click', function () {
    loadData().then(function () {
      var payload = { version: 1, exportedAt: Date.now(), bookmarks: _bookmarks };
      var blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bili-sub-bookmarks-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
    });
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area === 'local' && (changes[STORAGE_KEYS.BOOKMARKS] || changes[STORAGE_KEYS.BOOKMARK_TAGS])) {
      loadData().then(function () { renderFilters(); renderBookmarks(); });
    }
  });

  document.getElementById('mode-tabs').addEventListener('click', function (e) {
    var tab = e.target.closest('.bili-bookmarks__mode-tab');
    if (!tab || !tab.dataset.mode) return;
    _displayMode = tab.dataset.mode;
    document.querySelectorAll('.bili-bookmarks__mode-tab').forEach(function (t) { t.classList.remove('bili-bookmarks__mode-tab--active'); });
    tab.classList.add('bili-bookmarks__mode-tab--active');
    renderBookmarks();
  });

  loadData().then(function () {
    renderFilters();
    renderBookmarks();
  });
})();

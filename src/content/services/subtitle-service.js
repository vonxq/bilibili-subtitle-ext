window.BiliSub = window.BiliSub || {};

window.BiliSub.SubtitleService = (function () {
  var Constants = window.BiliSub.Constants;
  var SentenceService = window.BiliSub.SentenceService;

  var _rawByLang = {};       // lang -> { lang, body: [...] }
  var _timeline = [];        // bilingual sentence timeline
  var _subtitleUrls = [];    // discovered subtitle URL list
  var _settings = {
    nativeLang: Constants.DEFAULTS.NATIVE_LANG,
    targetLang: Constants.DEFAULTS.TARGET_LANG,
  };
  var _listeners = [];

  function _normalizeLang(lang) {
    if (!lang || typeof lang !== 'string') return lang;
    if (lang.startsWith('ai-')) return lang.substring(3);
    var dash = lang.indexOf('-');
    if (dash > 0) return lang.substring(0, dash).toLowerCase();
    return lang.toLowerCase();
  }

  function _detectLang(body) {
    if (!body || !body.length) return null;
    var sample = '';
    for (var i = 0; i < Math.min(body.length, 5); i++) {
      sample += (body[i].content || '') + ' ';
    }
    if (/[\u4e00-\u9fff]/.test(sample)) return 'zh';
    if (/[\u3040-\u30ff]/.test(sample)) return 'ja';
    if (/[\u0600-\u06ff]/.test(sample)) return 'ar';
    return 'en';
  }

  function onUpdate(cb) { _listeners.push(cb); }

  function notify() {
    _listeners.forEach(function (cb) {
      try { cb(_timeline, Object.keys(_rawByLang)); } catch (_) {}
    });
  }

  function addSubtitleData(data, langHint) {
    if (!data || !data.body || !Array.isArray(data.body)) return;
    var lang = data.lang || data.lan || langHint || _detectLang(data.body);
    lang = _normalizeLang(lang || 'en');
    data.lang = lang;
    _rawByLang[lang] = data;
    rebuildTimeline();
    notify();
  }

  function setSettings(nativeLang, targetLang) {
    _settings.nativeLang = nativeLang;
    _settings.targetLang = targetLang;
    rebuildTimeline();
    notify();
    tryFetchMissing();
  }

  function rebuildTimeline() {
    var targetData = _rawByLang[_settings.targetLang];
    var nativeData = _rawByLang[_settings.nativeLang];

    if (!targetData && !nativeData) {
      _timeline = [];
      return;
    }

    // If only native is available, swap roles so we still show something
    if (!targetData && nativeData) {
      var sentences = SentenceService.groupIntoSentences(nativeData.body, _settings.nativeLang);
      _timeline = sentences.map(function (s) {
        return {
          from: s.from,
          to: s.to,
          target: '',
          native: s.mergedContent,
          segments: s.segments,
        };
      });
      return;
    }

    _timeline = SentenceService.buildBilingualTimeline(
      targetData.body,
      _settings.targetLang,
      nativeData ? nativeData.body : null,
      _settings.nativeLang
    );
  }

  function getTimeline() {
    return _timeline;
  }

  function findCurrentIndex(time) {
    for (var i = _timeline.length - 1; i >= 0; i--) {
      if (time >= _timeline[i].from) return i;
    }
    return -1;
  }

  function getAvailableLangs() {
    return Object.keys(_rawByLang);
  }

  // --- Auto-fetch logic ---

  function setSubtitleUrls(urls) {
    _subtitleUrls = urls;
    tryFetchMissing();
  }

  function _findUrlEntry(lang) {
    return _subtitleUrls.find(function (u) {
      if (_normalizeLang(u.lang) === lang) return true;
      return false;
    });
  }

  function tryFetchMissing() {
    var needed = [_settings.targetLang, _settings.nativeLang];
    needed.forEach(function (lang) {
      if (_rawByLang[lang]) return;
      var entry = _findUrlEntry(lang);
      if (entry && entry.url) {
        fetchSubtitle(entry.url, lang);
      }
    });
  }

  function fetchSubtitle(url, langHint) {
    var fullUrl = url.startsWith('//') ? 'https:' + url : url;
    fetch(fullUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) { addSubtitleData(data, langHint); })
      .catch(function () {});
  }

  // --- Event listeners ---

  window.addEventListener(Constants.EVENTS.SUBTITLE_DATA, function (e) {
    addSubtitleData(e.detail);
  });

  window.addEventListener(Constants.EVENTS.SUBTITLE_URLS, function (e) {
    setSubtitleUrls(e.detail);
  });

  // Load saved settings
  try {
    if (chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(
        [Constants.STORAGE_KEYS.NATIVE_LANG, Constants.STORAGE_KEYS.TARGET_LANG],
        function (result) {
          var n = result[Constants.STORAGE_KEYS.NATIVE_LANG];
          var t = result[Constants.STORAGE_KEYS.TARGET_LANG];
          if (n) _settings.nativeLang = n;
          if (t) _settings.targetLang = t;
        }
      );
    }
  } catch (_) {}

  return {
    addSubtitleData: addSubtitleData,
    setSettings: setSettings,
    getTimeline: getTimeline,
    findCurrentIndex: findCurrentIndex,
    getAvailableLangs: getAvailableLangs,
    getSettings: function () { return { nativeLang: _settings.nativeLang, targetLang: _settings.targetLang }; },
    onUpdate: onUpdate,
  };
})();

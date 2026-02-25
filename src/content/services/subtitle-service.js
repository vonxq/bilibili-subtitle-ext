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

  function onUpdate(cb) { _listeners.push(cb); }

  function notify() {
    _listeners.forEach(function (cb) {
      try { cb(_timeline, Object.keys(_rawByLang)); } catch (_) {}
    });
  }

  function addSubtitleData(data) {
    if (!data || !data.body || !Array.isArray(data.body)) return;
    var lang = data.lang || 'unknown';
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

    var targetSentences = SentenceService.groupIntoSentences(
      targetData.body,
      _settings.targetLang
    );

    _timeline = SentenceService.buildBilingualTimeline(
      targetSentences,
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

  function tryFetchMissing() {
    var needed = [_settings.targetLang, _settings.nativeLang];
    needed.forEach(function (lang) {
      if (_rawByLang[lang]) return;
      var entry = _subtitleUrls.find(function (u) { return u.lang === lang; });
      if (entry && entry.url) {
        fetchSubtitle(entry.url);
      }
    });
  }

  function fetchSubtitle(url) {
    var fullUrl = url.startsWith('//') ? 'https:' + url : url;
    fetch(fullUrl)
      .then(function (r) { return r.json(); })
      .then(function (data) { addSubtitleData(data); })
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

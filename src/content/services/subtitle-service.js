window.BiliSub = window.BiliSub || {};

window.BiliSub.SubtitleService = (function () {
  const { Constants } = window.BiliSub;

  // lang -> { lang, body: [{from, to, content, sid}] }
  const _subtitlesByLang = new Map();
  let _mergedTimeline = [];
  const _listeners = [];

  function onUpdate(callback) {
    _listeners.push(callback);
  }

  function notifyListeners() {
    const langs = getAvailableLanguages();
    _listeners.forEach((cb) => {
      try {
        cb(langs, _mergedTimeline);
      } catch (_) {}
    });
    window.dispatchEvent(new CustomEvent(Constants.EVENTS.SUBTITLE_UPDATED));
  }

  function addSubtitleData(data) {
    if (!data || !data.body || !Array.isArray(data.body)) return;
    const lang = data.lang || 'unknown';
    _subtitlesByLang.set(lang, data);
    rebuildTimeline();
    notifyListeners();
  }

  function getAvailableLanguages() {
    return Array.from(_subtitlesByLang.keys());
  }

  function getSubtitlesByLang(lang) {
    return _subtitlesByLang.get(lang) || null;
  }

  function rebuildTimeline() {
    const allEntries = [];

    _subtitlesByLang.forEach((data, lang) => {
      data.body.forEach((item) => {
        allEntries.push({
          from: item.from,
          to: item.to,
          lang,
          content: item.content,
        });
      });
    });

    // Group by approximate time (within 0.5s tolerance)
    allEntries.sort((a, b) => a.from - b.from);

    const groups = [];
    let currentGroup = null;

    allEntries.forEach((entry) => {
      if (!currentGroup || Math.abs(entry.from - currentGroup.from) > 0.5) {
        currentGroup = {
          from: entry.from,
          to: entry.to,
          texts: {},
        };
        groups.push(currentGroup);
      }
      currentGroup.texts[entry.lang] = entry.content;
      currentGroup.to = Math.max(currentGroup.to, entry.to);
    });

    _mergedTimeline = groups;
  }

  function getMergedTimeline() {
    return _mergedTimeline;
  }

  function getFilteredTimeline(selectedLangs) {
    if (!selectedLangs || selectedLangs.length === 0) return _mergedTimeline;
    return _mergedTimeline.filter((item) =>
      selectedLangs.some((lang) => item.texts[lang])
    );
  }

  function findCurrentIndex(time, timeline) {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (time >= timeline[i].from) return i;
    }
    return -1;
  }

  // Listen for intercepted subtitle data from inject.js
  window.addEventListener(Constants.EVENTS.SUBTITLE_DATA, (e) => {
    addSubtitleData(e.detail);
  });

  return {
    addSubtitleData,
    getAvailableLanguages,
    getSubtitlesByLang,
    getMergedTimeline,
    getFilteredTimeline,
    findCurrentIndex,
    onUpdate,
  };
})();

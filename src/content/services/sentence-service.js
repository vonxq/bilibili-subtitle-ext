window.BiliSub = window.BiliSub || {};

window.BiliSub.SentenceService = (function () {
  var C = window.BiliSub.Constants.SENTENCE;

  function isCJK(lang) {
    return lang === 'zh' || lang === 'ja' || lang === 'ko';
  }

  function endsWithTerminal(text) {
    return C.TERMINAL_PUNCTUATION.test(text.trim());
  }

  function endsWithConnector(text) {
    return C.EN_CONNECTORS.test(text.trim());
  }

  function startsWithUpperCase(text) {
    var trimmed = text.trim();
    if (!trimmed) return false;
    var first = trimmed.charAt(0);
    return first === first.toUpperCase() && first !== first.toLowerCase();
  }

  function isShortFragment(text, lang) {
    var trimmed = text.trim();
    if (endsWithTerminal(trimmed)) return false;
    if (isCJK(lang)) return trimmed.length < C.SHORT_CJK_CHARS;
    return trimmed.split(/\s+/).length < C.SHORT_EN_WORDS;
  }

  function shouldMergeNext(current, next, lang, groupSize) {
    if (groupSize >= C.MAX_MERGE_COUNT) return false;
    if (!current || !next) return false;

    var currentText = current.content.trim();
    var nextText = next.content.trim();

    if (endsWithTerminal(currentText)) return false;

    var timeGap = next.from - current.to;
    if (timeGap > C.TIME_GAP_THRESHOLD) return false;

    if (!isCJK(lang) && startsWithUpperCase(nextText) && !endsWithConnector(currentText)) {
      return false;
    }

    if (endsWithConnector(currentText)) return true;
    if (isShortFragment(currentText, lang)) return true;

    return false;
  }

  /**
   * Group subtitle body into sentences.
   * @param {Array} body - [{from, to, content, sid}, ...]
   * @param {string} lang - language code
   * @returns {Array} - [{from, to, segments: [...], mergedContent}, ...]
   */
  function groupIntoSentences(body, lang) {
    if (!body || body.length === 0) return [];

    var sentences = [];
    var i = 0;

    while (i < body.length) {
      var segments = [body[i]];
      var groupSize = 1;

      while (i + groupSize < body.length && shouldMergeNext(body[i + groupSize - 1], body[i + groupSize], lang, groupSize)) {
        segments.push(body[i + groupSize]);
        groupSize++;
      }

      var joiner = isCJK(lang) ? '' : ' ';
      sentences.push({
        from: segments[0].from,
        to: segments[segments.length - 1].to,
        segments: segments,
        mergedContent: segments.map(function (s) { return s.content.trim(); }).join(joiner),
      });

      i += groupSize;
    }

    return sentences;
  }

  /**
   * Merge target & native sentences by time alignment.
   * Target sentences drive grouping; native is matched by overlap.
   */
  function buildBilingualTimeline(targetSentences, nativeBody, nativeLang) {
    var nativeSentences = nativeBody ? groupIntoSentences(nativeBody, nativeLang) : [];

    return targetSentences.map(function (tSent) {
      var matched = [];
      var joiner = isCJK(nativeLang) ? '' : ' ';

      nativeSentences.forEach(function (nSent) {
        var overlap = Math.min(tSent.to, nSent.to) - Math.max(tSent.from, nSent.from);
        var nDuration = nSent.to - nSent.from;
        if (overlap > nDuration * 0.3) {
          matched.push(nSent.mergedContent);
        }
      });

      return {
        from: tSent.from,
        to: tSent.to,
        target: tSent.mergedContent,
        native: matched.join(joiner) || '',
        segments: tSent.segments,
      };
    });
  }

  return {
    groupIntoSentences: groupIntoSentences,
    buildBilingualTimeline: buildBilingualTimeline,
  };
})();

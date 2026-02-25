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
   * Match subtitle body items into sentence time ranges by overlap.
   */
  function matchBodyToSentences(sentences, body, lang) {
    var joiner = isCJK(lang) ? '' : ' ';

    return sentences.map(function (sent) {
      var matched = [];
      body.forEach(function (item) {
        var overlap = Math.min(sent.to, item.to) - Math.max(sent.from, item.from);
        var itemDuration = item.to - item.from;
        if (itemDuration > 0 && overlap > itemDuration * 0.3) {
          matched.push(item.content.trim());
        }
      });
      return matched.join(joiner);
    });
  }

  /**
   * Build bilingual timeline. Uses the language that produces fewer groups
   * (= better merging) as the primary grouping source.
   * This fixes AI translation adding spurious punctuation to fragments.
   */
  function buildBilingualTimeline(targetBody, targetLang, nativeBody, nativeLang) {
    var targetSentences = groupIntoSentences(targetBody, targetLang);
    var nativeSentences = nativeBody ? groupIntoSentences(nativeBody, nativeLang) : [];

    var primarySentences, primaryIsTarget;

    if (nativeSentences.length === 0) {
      primarySentences = targetSentences;
      primaryIsTarget = true;
    } else if (targetSentences.length === 0) {
      primarySentences = nativeSentences;
      primaryIsTarget = false;
    } else {
      // Fewer groups = better merging = more likely to have correct boundaries
      primaryIsTarget = targetSentences.length <= nativeSentences.length;
      primarySentences = primaryIsTarget ? targetSentences : nativeSentences;
    }

    if (primaryIsTarget) {
      var nativeTexts = nativeBody ? matchBodyToSentences(primarySentences, nativeBody, nativeLang) : [];
      return primarySentences.map(function (sent, i) {
        return {
          from: sent.from,
          to: sent.to,
          target: sent.mergedContent,
          native: nativeTexts[i] || '',
          segments: sent.segments,
        };
      });
    } else {
      var targetTexts = matchBodyToSentences(primarySentences, targetBody, targetLang);
      return primarySentences.map(function (sent, i) {
        return {
          from: sent.from,
          to: sent.to,
          target: targetTexts[i] || '',
          native: sent.mergedContent,
          segments: sent.segments,
        };
      });
    }
  }

  return {
    groupIntoSentences: groupIntoSentences,
    buildBilingualTimeline: buildBilingualTimeline,
  };
})();

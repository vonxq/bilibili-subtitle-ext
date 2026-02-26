window.BiliSub = window.BiliSub || {};

window.BiliSub.SubtitleItem = (function () {
  var DOM = window.BiliSub.DOM;
  var Time = window.BiliSub.Time;
  var Constants = window.BiliSub.Constants;
  var RepeaterService = window.BiliSub.RepeaterService;
  var SubtitleService = window.BiliSub.SubtitleService;

  var PLAY_SVG = '<svg viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20"/></svg>';
  var LOOP_SVG = '<svg viewBox="0 0 24 24"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>';
  var BOOKMARK_SVG = '<svg viewBox="0 0 24 24"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>';
  var CHEVRON_SVG = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';

  function create(sentence, index, displayMode) {
    var item = DOM.create('div', 'bili-sub-item');
    item.dataset.index = index;
    item.dataset.from = sentence.from;
    item.dataset.to = sentence.to;

    // Controls row
    var controls = DOM.create('div', 'bili-sub-item__controls');

    var playBtn = DOM.create('button', 'bili-sub-item__play-btn', { innerHTML: PLAY_SVG });
    playBtn.title = '播放此句';
    playBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      RepeaterService.play(sentence.from, sentence.to, 1);
    });

    var loopBtn = _createLoopBtn(sentence);

    var bookmarkBtn = DOM.create('button', 'bili-sub-item__bookmark-btn', { innerHTML: BOOKMARK_SVG });
    bookmarkBtn.title = '收藏此句';
    bookmarkBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var BookmarkDialog = window.BiliSub.BookmarkDialog;
      if (BookmarkDialog && typeof BookmarkDialog.open === 'function') {
        var videoUrl = typeof location !== 'undefined' ? location.href : '';
        var videoTitle = typeof document !== 'undefined' ? document.title : '';
        BookmarkDialog.open({
          type: 'sentence',
          sentences: [sentence],
          video: { url: videoUrl, title: videoTitle, from: sentence.from, to: sentence.to },
        }, { anchor: bookmarkBtn });
      }
    });

    var timeEl = DOM.create('span', 'bili-sub-item__time', {
      textContent: Time.format(sentence.from),
    });

    var progressWrap = DOM.create('div', 'bili-sub-item__progress-wrap');
    progressWrap.title = '点击进度条跳转到该位置';
    var progressTrack = DOM.create('div', 'bili-sub-item__progress-track');
    var progressFill = DOM.create('div', 'bili-sub-item__progress-fill');
    progressTrack.appendChild(progressFill);
    progressWrap.appendChild(progressTrack);
    progressWrap.addEventListener('click', function (e) {
      e.stopPropagation();
      var track = progressWrap.querySelector('.bili-sub-item__progress-track');
      if (!track) return;
      var rect = track.getBoundingClientRect();
      var ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      var from = parseFloat(item.dataset.from);
      var to = parseFloat(item.dataset.to);
      var seekTime = from + ratio * (to - from);
      if (window.BiliSub && window.BiliSub.PlayerService && typeof window.BiliSub.PlayerService.seekTo === 'function') {
        window.BiliSub.PlayerService.seekTo(seekTime);
      }
    });

    DOM.appendChildren(controls, playBtn, loopBtn, bookmarkBtn, timeEl);
    item.appendChild(controls);
    item.appendChild(progressWrap);

    // Text content based on display mode
    _renderTextContent(item, sentence, displayMode);

    return item;
  }

  function _createLoopBtn(sentence) {
    var options = Constants.REPEATER.LOOP_OPTIONS;

    var btn = DOM.create('button', 'bili-sub-item__loop-btn');
    btn.innerHTML = LOOP_SVG + '<span class="bili-sub-item__loop-count"></span>';
    btn.title = '循环播放';
    btn._loopIndex = 0;

    btn.addEventListener('click', function (e) {
      e.stopPropagation();

      document.querySelectorAll('.bili-sub-item__loop-btn--active').forEach(function (b) {
        if (b !== btn) {
          b.classList.remove('bili-sub-item__loop-btn--active');
          var countEl = b.querySelector('.bili-sub-item__loop-count');
          if (countEl) countEl.textContent = '';
          b._loopIndex = 0;
        }
      });

      btn._loopIndex = (btn._loopIndex + 1) % (options.length + 1);

      if (btn._loopIndex === 0) {
        RepeaterService.stop();
        btn.classList.remove('bili-sub-item__loop-btn--active');
        btn.querySelector('.bili-sub-item__loop-count').textContent = '';
        return;
      }

      var count = options[btn._loopIndex - 1];
      btn.classList.add('bili-sub-item__loop-btn--active');
      btn.querySelector('.bili-sub-item__loop-count').textContent =
        count === Infinity ? '∞' : count + 'x';

      if (btn._loopIndex === 1) {
        RepeaterService.play(sentence.from, sentence.to, count);
      } else {
        RepeaterService.setLoopTotal(count);
      }
    });

    return btn;
  }

  function _renderTextContent(item, sentence, displayMode) {
    var MODES = Constants.DISPLAY_MODES;
    var hasTarget = !!sentence.target;
    var hasNative = !!sentence.native;
    var langs = SubtitleService && typeof SubtitleService.getSettings === 'function'
      ? SubtitleService.getSettings()
      : { nativeLang: Constants.DEFAULTS.NATIVE_LANG, targetLang: Constants.DEFAULTS.TARGET_LANG };

    if (displayMode === MODES.BILINGUAL) {
      if (hasTarget) {
        var targetRow = DOM.create('div', 'bili-sub-item__target-row');
        var targetText = DOM.create('div', 'bili-sub-item__target', { textContent: sentence.target });
        var targetTts = _createTtsBtnFor(sentence.target, langs.targetLang, '朗读目标语');
        DOM.appendChildren(targetRow, targetText, targetTts);
        item.appendChild(targetRow);
      }
      if (hasNative) {
        var nativeRow = DOM.create('div', 'bili-sub-item__native-row');
        var nativeText = DOM.create('div', 'bili-sub-item__native', { textContent: sentence.native });
        var nativeTts = _createTtsBtnFor(sentence.native, langs.nativeLang, '朗读母语');
        DOM.appendChildren(nativeRow, nativeText, nativeTts);
        item.appendChild(nativeRow);
      }
    } else if (displayMode === MODES.LEARNING) {
      if (hasTarget) {
        var lTargetRow = DOM.create('div', 'bili-sub-item__target-row');
        var lTargetText = DOM.create('div', 'bili-sub-item__target', { textContent: sentence.target });
        var lTargetTts = _createTtsBtnFor(sentence.target, langs.targetLang, '朗读目标语');
        DOM.appendChildren(lTargetRow, lTargetText, lTargetTts);
        item.appendChild(lTargetRow);
      }
      if (hasNative) {
        var reveal = DOM.create('div', 'bili-sub-item__reveal');
        var lNativeRow = DOM.create('div', 'bili-sub-item__native-row');
        var lNativeText = DOM.create('div', 'bili-sub-item__native', { textContent: sentence.native });
        var lNativeTts = _createTtsBtnFor(sentence.native, langs.nativeLang, '朗读母语');
        DOM.appendChildren(lNativeRow, lNativeText, lNativeTts);
        reveal.appendChild(lNativeRow);
        item.appendChild(reveal);

        var revealBtn = DOM.create('button', 'bili-sub-item__reveal-btn');
        revealBtn.innerHTML = '查看翻译 ' + CHEVRON_SVG;
        revealBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          item.classList.toggle('bili-sub-item--expanded');
          revealBtn.innerHTML = item.classList.contains('bili-sub-item--expanded')
            ? '收起翻译 ' + CHEVRON_SVG
            : '查看翻译 ' + CHEVRON_SVG;
        });
        item.appendChild(revealBtn);
      }
    } else if (displayMode === MODES.ASSISTED) {
      if (hasNative) {
        var aNativeRow = DOM.create('div', 'bili-sub-item__target-row');
        var aNativeText = DOM.create('div', 'bili-sub-item__target', { textContent: sentence.native });
        var aNativeTts = _createTtsBtnFor(sentence.native, langs.nativeLang, '朗读母语');
        DOM.appendChildren(aNativeRow, aNativeText, aNativeTts);
        item.appendChild(aNativeRow);
      }
      if (hasTarget) {
        var reveal2 = DOM.create('div', 'bili-sub-item__reveal');
        var aTargetRow = DOM.create('div', 'bili-sub-item__native-row');
        var aTargetText = DOM.create('div', 'bili-sub-item__native', { textContent: sentence.target });
        var aTargetTts = _createTtsBtnFor(sentence.target, langs.targetLang, '朗读目标语');
        DOM.appendChildren(aTargetRow, aTargetText, aTargetTts);
        reveal2.appendChild(aTargetRow);
        item.appendChild(reveal2);

        var revealBtn2 = DOM.create('button', 'bili-sub-item__reveal-btn');
        revealBtn2.innerHTML = '查看原文 ' + CHEVRON_SVG;
        revealBtn2.addEventListener('click', function (e) {
          e.stopPropagation();
          item.classList.toggle('bili-sub-item--expanded');
          revealBtn2.innerHTML = item.classList.contains('bili-sub-item--expanded')
            ? '收起原文 ' + CHEVRON_SVG
            : '查看原文 ' + CHEVRON_SVG;
        });
        item.appendChild(revealBtn2);
      }
    }
  }

  var _ttsActiveBtn = null;

  function _createTtsBtnFor(text, langCode, label) {
    var btn = DOM.create('button', 'bili-sub-item__tts-btn');
    btn.innerHTML =
      '<svg class="bili-sub-item__tts-icon" viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M4 9v6h3l4 4V5L7 9H4z" fill="currentColor"></path>' +
        '<path d="M16 8a4 4 0 0 1 0 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path>' +
      '</svg>';
    btn.title = label || '朗读';

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (_ttsActiveBtn === btn && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        _ttsActiveBtn = null;
        return;
      }
      _speak(text, langCode, btn);
    });

    return btn;
  }

  function _speak(text, langCode, activeBtn) {
    if (!text || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;

    var map = {
      zh: 'zh-CN',
      en: 'en-US',
      ja: 'ja-JP',
      es: 'es-ES',
      ar: 'ar-SA',
      pt: 'pt-PT',
    };

    try {
      window.speechSynthesis.cancel();
      _ttsActiveBtn = activeBtn || null;
      var utter = new window.SpeechSynthesisUtterance(text);
      if (langCode && map[langCode]) {
        utter.lang = map[langCode];
      }
      utter.onend = utter.onerror = function () {
        if (_ttsActiveBtn === activeBtn) _ttsActiveBtn = null;
      };
      window.speechSynthesis.speak(utter);
    } catch (_) {
      _ttsActiveBtn = null;
    }
  }

  return { create: create };
})();

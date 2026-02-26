window.BiliSub = window.BiliSub || {};

window.BiliSub.ABRepeatBar = (function () {
  var DOM = window.BiliSub.DOM;
  var Time = window.BiliSub.Time;
  var Constants = window.BiliSub.Constants;
  var RepeaterService = window.BiliSub.RepeaterService;
  var LicenseService = window.BiliSub.LicenseService;
  var SubtitleService = window.BiliSub.SubtitleService;

  var _bar = null;
  var _state = 'idle';
  var _aFrom = 0;
  var _aTo = 0;
  var _bTo = 0;
  var _selectedAItem = null;
  var _listClickHandler = null;

  function create() {
    _bar = DOM.create('div', 'bili-sub-ab-bar');
    _render();

    RepeaterService.onStateChange(function (state) {
      if (_state === 'playing' && (!state.active || state.mode !== 'ab')) {
        _clearSelection();
        _setState('idle');
      }
    });

    window.addEventListener(Constants.EVENTS.SUBTITLE_UPDATED, function () {
      if (_state !== 'idle') {
        RepeaterService.stop();
        _clearSelection();
        _setState('idle');
      }
    });

    return _bar;
  }

  function _setState(newState) {
    _state = newState;
    _render();
    _updateListInteraction();
  }

  function _render() {
    if (!_bar) return;
    _bar.innerHTML = '';

    if (_state === 'idle') {
      _bar.className = 'bili-sub-ab-bar';
      var btn = DOM.create('button', 'bili-sub-ab-bar__start-btn');
      btn.innerHTML = '<span class="bili-sub-ab-bar__icon">A\u21CCB</span> AB\u6BB5\u91CD\u64AD';
      btn.addEventListener('click', function () { _setState('selecting-a'); });
      _bar.appendChild(btn);

    } else if (_state === 'selecting-a') {
      _bar.className = 'bili-sub-ab-bar bili-sub-ab-bar--active';
      var dot = DOM.create('span', 'bili-sub-ab-bar__dot bili-sub-ab-bar__dot--pulse');
      var text = DOM.create('span', 'bili-sub-ab-bar__text', { textContent: '\u70B9\u51FB\u5B57\u5E55\u9009\u62E9\u8D77\u70B9' });
      var cancelBtn = _createCancelBtn();
      DOM.appendChildren(_bar, dot, text, cancelBtn);

    } else if (_state === 'selecting-b') {
      _bar.className = 'bili-sub-ab-bar bili-sub-ab-bar--active';
      var label = DOM.create('span', 'bili-sub-ab-bar__point');
      label.innerHTML = 'A <span class="bili-sub-ab-bar__time">' + Time.format(_aFrom) + '</span>';
      var arrow = DOM.create('span', 'bili-sub-ab-bar__arrow', { textContent: '\u2192' });
      var text2 = DOM.create('span', 'bili-sub-ab-bar__text', { textContent: '\u9009\u62E9\u7EC8\u70B9' });
      var cancelBtn2 = _createCancelBtn();
      DOM.appendChildren(_bar, label, arrow, text2, cancelBtn2);

    } else if (_state === 'playing') {
      _bar.className = 'bili-sub-ab-bar bili-sub-ab-bar--playing';
      var labelA = DOM.create('span', 'bili-sub-ab-bar__point');
      labelA.innerHTML = 'A <span class="bili-sub-ab-bar__time">' + Time.format(_aFrom) + '</span>';
      var arrow2 = DOM.create('span', 'bili-sub-ab-bar__arrow', { textContent: '\u2192' });
      var labelB = DOM.create('span', 'bili-sub-ab-bar__point');
      labelB.innerHTML = 'B <span class="bili-sub-ab-bar__time">' + Time.format(_bTo) + '</span>';
      var bookmarkAbBtn = DOM.create('button', 'bili-sub-ab-bar__bookmark-btn', { textContent: '收藏此AB段' });
      bookmarkAbBtn.title = '收藏此 AB 段';
      bookmarkAbBtn.addEventListener('click', function () {
        var BookmarkDialog = window.BiliSub.BookmarkDialog;
        if (BookmarkDialog && typeof BookmarkDialog.open === 'function' && SubtitleService && SubtitleService.getTimeline) {
          var timeline = SubtitleService.getTimeline();
          var sentences = timeline.filter(function (s) {
            return s.from < _bTo && s.to > _aFrom;
          });
          if (sentences.length) {
            var videoUrl = typeof location !== 'undefined' ? location.href : '';
            var videoTitle = typeof document !== 'undefined' ? document.title : '';
            BookmarkDialog.open({
              type: 'segment',
              sentences: sentences,
              video: { url: videoUrl, title: videoTitle, from: _aFrom, to: _bTo },
            }, { anchor: bookmarkAbBtn });
          }
        }
      });
      var stopBtn = DOM.create('button', 'bili-sub-ab-bar__stop-btn', { textContent: '\u505C\u6B62' });
      stopBtn.addEventListener('click', function () {
        RepeaterService.stop();
        _clearSelection();
        _setState('idle');
      });
      DOM.appendChildren(_bar, labelA, arrow2, labelB, bookmarkAbBtn, stopBtn);
    }
  }

  function _createCancelBtn() {
    var btn = DOM.create('button', 'bili-sub-ab-bar__cancel-btn', { textContent: '\u2715' });
    btn.title = '\u53D6\u6D88';
    btn.addEventListener('click', function () {
      _clearSelection();
      _setState('idle');
    });
    return btn;
  }

  function _clearSelection() {
    if (_selectedAItem) {
      _selectedAItem.classList.remove('bili-sub-item--ab-a');
      _selectedAItem = null;
    }
    document.querySelectorAll('.bili-sub-item--ab-range').forEach(function (el) {
      el.classList.remove('bili-sub-item--ab-range');
    });
  }

  function _updateListInteraction() {
    var list = document.querySelector('.bili-sub-list');
    if (!list) return;

    if (_listClickHandler) {
      list.removeEventListener('click', _listClickHandler);
      _listClickHandler = null;
    }

    list.classList.remove('bili-sub-list--ab-selecting');

    if (_state !== 'selecting-a' && _state !== 'selecting-b') return;

    list.classList.add('bili-sub-list--ab-selecting');

    _listClickHandler = function (e) {
      if (e.target.closest('button')) return;
      var item = e.target.closest('.bili-sub-item');
      if (!item) return;

      e.preventDefault();
      e.stopPropagation();

      if (_state === 'selecting-a') {
        _aFrom = parseFloat(item.dataset.from);
        _aTo = parseFloat(item.dataset.to);
        _selectedAItem = item;
        item.classList.add('bili-sub-item--ab-a');
        _setState('selecting-b');

      } else if (_state === 'selecting-b') {
        var clickedFrom = parseFloat(item.dataset.from);
        var clickedTo = parseFloat(item.dataset.to);

        _aFrom = Math.min(_aFrom, clickedFrom);
        _bTo = Math.max(_aTo, clickedTo);

        _highlightRange(_aFrom, _bTo);
        RepeaterService.play(_aFrom, _bTo, Infinity, 'ab');
        _setState('playing');
      }
    };

    list.addEventListener('click', _listClickHandler);
  }

  function _highlightRange(from, to) {
    document.querySelectorAll('.bili-sub-item').forEach(function (item) {
      var f = parseFloat(item.dataset.from);
      var t = parseFloat(item.dataset.to);
      if (f >= from && t <= to) {
        item.classList.add('bili-sub-item--ab-range');
      }
    });
  }

  return { create: create };
})();

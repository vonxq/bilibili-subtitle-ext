window.BiliSub = window.BiliSub || {};

window.BiliSub.SubtitleList = (function () {
  var DOM = window.BiliSub.DOM;
  var Constants = window.BiliSub.Constants;
  var SubtitleService = window.BiliSub.SubtitleService;
  var SubtitleItem = window.BiliSub.SubtitleItem;

  var _container = null;
  var _displayMode = Constants.DEFAULTS.DISPLAY_MODE;
  var _isManualScrolling = false;
  var _scrollTimeout = null;
  var _lastActiveIndex = -1;
  var _isAutoScrolling = false;

  function create() {
    _container = DOM.create('div', 'bili-sub-list');

    _container.addEventListener('scroll', function () {
      // 自动滚动产生的 scroll 事件不计入「手动滚动」
      if (_isAutoScrolling) return;
      _isManualScrolling = true;
      clearTimeout(_scrollTimeout);
      _scrollTimeout = setTimeout(function () {
        _isManualScrolling = false;
      }, Constants.AUTO_SCROLL_DELAY);
    });

    window.addEventListener(Constants.EVENTS.REPEATER_STATE, function (e) {
      if (!e.detail.active && _container) {
        _container.querySelectorAll('.bili-sub-item__loop-btn--active').forEach(function (b) {
          b.classList.remove('bili-sub-item__loop-btn--active');
          var countEl = b.querySelector('.bili-sub-item__loop-count');
          if (countEl) countEl.textContent = '';
          b._loopIndex = 0;
        });
      }
    });

    return _container;
  }

  function render(mode) {
    if (!_container) return;
    if (mode) _displayMode = mode;

    var timeline = SubtitleService.getTimeline();
    _container.innerHTML = '';
    _lastActiveIndex = -1;

    timeline.forEach(function (sentence, index) {
      var item = SubtitleItem.create(sentence, index, _displayMode);
      _container.appendChild(item);
    });
  }

  function setDisplayMode(mode) {
    _displayMode = mode;
    render();
  }

  function highlightCurrent(currentTime, forceScroll) {
    if (!_container) return;

    var items = _container.querySelectorAll('.bili-sub-item');
    var activeIndex = -1;

    items.forEach(function (item, index) {
      var from = parseFloat(item.dataset.from);
      var to = parseFloat(item.dataset.to);
      var isActive = currentTime >= from && currentTime < to;
      item.classList.toggle('bili-sub-item--active', isActive);
      if (isActive) activeIndex = index;
      var duration = to - from;
      var progress = duration <= 0 ? 0 : Math.max(0, Math.min(1, (currentTime - from) / duration));
      var fill = item.querySelector('.bili-sub-item__progress-fill');
      if (fill) fill.style.width = (progress * 100) + '%';
    });

    if (activeIndex >= 0 && (forceScroll || activeIndex !== _lastActiveIndex) && !_isManualScrolling) {
      _lastActiveIndex = activeIndex;
      var activeItem = items[activeIndex];
      if (activeItem) _scrollToItem(activeItem);
    }
  }

  function _scrollToItem(item) {
    if (!_container) return;
    var cRect = _container.getBoundingClientRect();
    var iRect = item.getBoundingClientRect();
    var relTop = iRect.top - cRect.top;
    var target = _container.scrollTop + relTop - cRect.height / 2 + iRect.height / 2;

    _isAutoScrolling = true;
    _container.scrollTo({ top: target, behavior: 'smooth' });
    // 短暂窗口内的 scroll 事件视为自动滚动，不会把 _isManualScrolling 置为 true
    setTimeout(function () {
      _isAutoScrolling = false;
    }, 350);
  }

  function getElement() { return _container; }

  return {
    create: create,
    render: render,
    setDisplayMode: setDisplayMode,
    highlightCurrent: highlightCurrent,
    getElement: getElement,
  };
})();

window.BiliSub = window.BiliSub || {};

window.BiliSub.Panel = (function () {
  var DOM = window.BiliSub.DOM;
  var Constants = window.BiliSub.Constants;
  var Header = window.BiliSub.Header;
  var Settings = window.BiliSub.Settings;
  var ModeSelector = window.BiliSub.ModeSelector;
  var SubtitleList = window.BiliSub.SubtitleList;
  var ABRepeatBar = window.BiliSub.ABRepeatBar;
  var SpeedControl = window.BiliSub.SpeedControl;
  var SubtitleService = window.BiliSub.SubtitleService;
  var PlayerService = window.BiliSub.PlayerService;

  var _panel = null;
  var _isCollapsed = false;
  var _isDragging = false;
  var _dragOffset = { x: 0, y: 0 };
  var _emptyEl = null;

  function _centerCurrentSentence() {
    try {
      if (!PlayerService || !SubtitleList || typeof PlayerService.getCurrentTime !== 'function') return;
      var time = PlayerService.getCurrentTime();
      if (typeof time !== 'number' || isNaN(time)) return;
      if (typeof SubtitleList.highlightCurrent === 'function') {
        SubtitleList.highlightCurrent(time, true);
      }
    } catch (_) {}
  }

  function create() {
    _panel = DOM.create('div', 'bili-sub-panel bili-sub-panel--hidden');

    // Header
    var header = Header.create(
      function () {
        Settings.close();
        if (Header && typeof Header.setActive === 'function') {
          Header.setActive('home');
        }
        _centerCurrentSentence();
      },
      function () {
        if (Settings.isOpen()) {
          Settings.close();
          if (Header && typeof Header.setActive === 'function') {
            Header.setActive('home');
          }
          _centerCurrentSentence();
        } else {
          Settings.toggle();
          if (Header && typeof Header.setActive === 'function') {
            Header.setActive('settings');
          }
        }
      },
      _handleCollapse,
      _handleClose
    );
    _setupDrag(header);

    // Settings overlay
    var settingsEl = Settings.create(function (nativeLang, targetLang) {
      SubtitleService.setSettings(nativeLang, targetLang);
      SubtitleList.render(ModeSelector.getMode());
    });

    // Body
    var body = DOM.create('div', 'bili-sub-panel__body');

    var modeEl = ModeSelector.create(function (mode) {
      SubtitleList.setDisplayMode(mode);
    });

    var abBarEl = ABRepeatBar.create();

    var listEl = SubtitleList.create();

    _emptyEl = DOM.create('div', 'bili-sub-panel__empty');
    _emptyEl.innerHTML =
      '<div class="bili-sub-panel__empty-icon">📡</div>' +
      '<div class="bili-sub-panel__empty-text">等待字幕数据…<br>播放带有 AI 字幕的视频即可自动加载</div>';

    var speedEl = SpeedControl.create();

    DOM.appendChildren(body, modeEl, abBarEl, listEl, _emptyEl, speedEl);
    DOM.appendChildren(_panel, header, settingsEl, body);

    _loadState();

    // React to subtitle data updates
    SubtitleService.onUpdate(function (timeline, langs) {
      _panel.classList.remove('bili-sub-panel--hidden');
      Settings.close();
      if (Header && typeof Header.setActive === 'function') {
        Header.setActive('home');
      }
      SubtitleList.render(ModeSelector.getMode());
      _updateEmptyState(timeline.length > 0);
      _centerCurrentSentence();
    });

    // Highlight tracking
    PlayerService.startHighlightTracking(function (time) {
      SubtitleList.highlightCurrent(time);
    });

    document.body.appendChild(_panel);
    return _panel;
  }

  function _updateEmptyState(hasData) {
    var list = SubtitleList.getElement();
    if (_emptyEl) _emptyEl.style.display = hasData ? 'none' : 'flex';
    if (list) list.style.display = hasData ? 'block' : 'none';
  }

  function _handleCollapse() {
    _isCollapsed = !_isCollapsed;
    _panel.classList.toggle('bili-sub-panel--collapsed', _isCollapsed);
    _saveState();
  }

  function _handleClose() {
    _panel.classList.add('bili-sub-panel--hidden');
    PlayerService.stopHighlightTracking();
  }

  function show() {
    if (!_panel) return;
    _panel.classList.remove('bili-sub-panel--hidden');
    PlayerService.startHighlightTracking(function (time) {
      SubtitleList.highlightCurrent(time);
    });
  }

  function _setupDrag(headerEl) {
    headerEl.addEventListener('mousedown', function (e) {
      if (e.target.closest('.bili-sub-header__btn') || e.target.closest('.bili-sub-header__tab')) return;
      _isDragging = true;
      var rect = _panel.getBoundingClientRect();
      _dragOffset.x = e.clientX - rect.left;
      _dragOffset.y = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
      if (!_isDragging) return;
      var x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - _dragOffset.x));
      var y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - _dragOffset.y));
      _panel.style.left = x + 'px';
      _panel.style.top = y + 'px';
      _panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', function () {
      if (_isDragging) {
        _isDragging = false;
        _saveState();
      }
    });
  }

  function _saveState() {
    try {
      if (!chrome || !chrome.storage || !chrome.storage.local) return;
      var rect = _panel.getBoundingClientRect();
      chrome.storage.local.set({
        [Constants.STORAGE_KEYS.PANEL_COLLAPSED]: _isCollapsed,
        [Constants.STORAGE_KEYS.PANEL_POSITION]: { left: rect.left, top: rect.top },
      });
    } catch (_) {}
  }

  function _loadState() {
    try {
      if (!chrome || !chrome.storage || !chrome.storage.local) return;
      chrome.storage.local.get(
        [Constants.STORAGE_KEYS.PANEL_COLLAPSED, Constants.STORAGE_KEYS.PANEL_POSITION],
        function (result) {
          if (result[Constants.STORAGE_KEYS.PANEL_COLLAPSED]) {
            _isCollapsed = true;
            _panel.classList.add('bili-sub-panel--collapsed');
          }
          var pos = result[Constants.STORAGE_KEYS.PANEL_POSITION];
          if (pos && pos.left != null) {
            _panel.style.left = pos.left + 'px';
            _panel.style.top = pos.top + 'px';
            _panel.style.right = 'auto';
          }
        }
      );
    } catch (_) {}
  }

  return { create: create, show: show };
})();

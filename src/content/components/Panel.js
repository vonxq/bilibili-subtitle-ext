window.BiliSub = window.BiliSub || {};

window.BiliSub.Panel = (function () {
  const { DOM, Constants, Header, LanguageFilter, SubtitleList, SubtitleService, PlayerService } =
    window.BiliSub;

  let _panel = null;
  let _isCollapsed = false;
  let _isDragging = false;
  let _dragOffset = { x: 0, y: 0 };

  function create() {
    _panel = DOM.create('div', 'bili-sub-panel bili-sub-panel--hidden');

    const header = Header.create(_handleCollapse, _handleClose);
    _setupDrag(header);

    const body = DOM.create('div', 'bili-sub-panel__body');

    const filterEl = LanguageFilter.create((selectedLangs) => {
      SubtitleList.setSelectedLangs(selectedLangs);
    });

    const listEl = SubtitleList.create();

    const emptyEl = DOM.create('div', 'bili-sub-panel__empty');
    emptyEl.innerHTML = `
      <div class="bili-sub-panel__empty-icon">📡</div>
      <div class="bili-sub-panel__empty-text">等待字幕数据…<br>播放带有 AI 字幕的视频即可自动加载</div>
    `;

    DOM.appendChildren(body, filterEl, listEl, emptyEl);
    DOM.appendChildren(_panel, header, body);

    _loadState();

    SubtitleService.onUpdate((langs) => {
      _panel.classList.remove('bili-sub-panel--hidden');
      LanguageFilter.render(langs);
      SubtitleList.render(LanguageFilter.getSelectedLangs());
      _updateEmptyState(langs.length > 0);
    });

    PlayerService.startHighlightTracking((time) => {
      SubtitleList.highlightCurrent(time);
    });

    document.body.appendChild(_panel);
    return _panel;
  }

  function _updateEmptyState(hasData) {
    if (!_panel) return;
    const empty = _panel.querySelector('.bili-sub-panel__empty');
    const list = SubtitleList.getElement();
    const filter = LanguageFilter.getElement();
    if (empty) empty.style.display = hasData ? 'none' : 'flex';
    if (list) list.style.display = hasData ? 'block' : 'none';
    if (filter) filter.style.display = hasData ? 'flex' : 'none';
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
    if (_panel) {
      _panel.classList.remove('bili-sub-panel--hidden');
      PlayerService.startHighlightTracking((time) => {
        SubtitleList.highlightCurrent(time);
      });
    }
  }

  function _setupDrag(headerEl) {
    headerEl.addEventListener('mousedown', (e) => {
      if (e.target.closest('.bili-sub-header__btn')) return;
      _isDragging = true;
      const rect = _panel.getBoundingClientRect();
      _dragOffset.x = e.clientX - rect.left;
      _dragOffset.y = e.clientY - rect.top;
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!_isDragging) return;
      const x = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - _dragOffset.x));
      const y = Math.max(0, Math.min(window.innerHeight - 50, e.clientY - _dragOffset.y));
      _panel.style.left = x + 'px';
      _panel.style.top = y + 'px';
      _panel.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (_isDragging) {
        _isDragging = false;
        _saveState();
      }
    });
  }

  function _saveState() {
    try {
      if (!chrome?.storage?.local) return;
      const rect = _panel.getBoundingClientRect();
      chrome.storage.local.set({
        [Constants.STORAGE_KEYS.PANEL_COLLAPSED]: _isCollapsed,
        [Constants.STORAGE_KEYS.PANEL_POSITION]: {
          left: rect.left,
          top: rect.top,
        },
      });
    } catch (_) {}
  }

  function _loadState() {
    try {
      if (!chrome?.storage?.local) return;
      chrome.storage.local.get(
        [Constants.STORAGE_KEYS.PANEL_COLLAPSED, Constants.STORAGE_KEYS.PANEL_POSITION],
        (result) => {
          if (result[Constants.STORAGE_KEYS.PANEL_COLLAPSED]) {
            _isCollapsed = true;
            _panel.classList.add('bili-sub-panel--collapsed');
          }
          const pos = result[Constants.STORAGE_KEYS.PANEL_POSITION];
          if (pos && pos.left != null && pos.top != null) {
            _panel.style.left = pos.left + 'px';
            _panel.style.top = pos.top + 'px';
            _panel.style.right = 'auto';
          }
        }
      );
    } catch (_) {}
  }

  return { create, show };
})();

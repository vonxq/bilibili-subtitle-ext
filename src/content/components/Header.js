window.BiliSub = window.BiliSub || {};

window.BiliSub.Header = (function () {
  var DOM = window.BiliSub.DOM;

  var SUBTITLE_ICON = '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3" fill="currentColor" opacity="0.15"/><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="15.5" x2="18" y2="15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  var SETTINGS_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var BOOKMARK_ICON = '<svg viewBox="0 0 24 24"><path d="M5 4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v18l-7-4-7 4V4z"/></svg>';
  var COLLAPSE_ICON = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  var _homeTab = null;
  var _settingsTab = null;

  function create(onHome, onSettings, onCollapse, onClose, onBookmark) {
    var header = DOM.create('div', 'bili-sub-header');

    var titleWrap = DOM.create('div', 'bili-sub-header__title');
    var icon = DOM.create('span', 'bili-sub-header__icon', { innerHTML: SUBTITLE_ICON });
    titleWrap.appendChild(icon);

    var tabs = DOM.create('div', 'bili-sub-header__tabs');
    _homeTab = DOM.create('button', 'bili-sub-header__tab bili-sub-header__tab--active', {
      textContent: '主页',
    });
    _settingsTab = DOM.create('button', 'bili-sub-header__tab', {
      textContent: '设置',
    });

    _homeTab.addEventListener('click', function (e) {
      e.stopPropagation();
      _setActive('home');
      if (onHome) onHome();
    });

    _settingsTab.addEventListener('click', function (e) {
      e.stopPropagation();
      _setActive('settings');
      if (onSettings) onSettings();
    });

    DOM.appendChildren(tabs, _homeTab, _settingsTab);
    titleWrap.appendChild(tabs);

    var actions = DOM.create('div', 'bili-sub-header__actions');

    var bookmarkBtn = DOM.create('button', 'bili-sub-header__btn bili-sub-header__btn--bookmark', {
      innerHTML: BOOKMARK_ICON,
    });
    bookmarkBtn.title = '查看收藏';
    bookmarkBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (onBookmark) onBookmark();
    });

    var collapseBtn = DOM.create('button', 'bili-sub-header__btn bili-sub-header__btn--collapse', {
      innerHTML: COLLAPSE_ICON,
    });
    collapseBtn.title = '折叠/展开';
    collapseBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (onCollapse) onCollapse();
    });

    var closeBtn = DOM.create('button', 'bili-sub-header__btn', { innerHTML: CLOSE_ICON });
    closeBtn.title = '关闭';
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (onClose) onClose();
    });

    DOM.appendChildren(actions, bookmarkBtn, collapseBtn, closeBtn);
    DOM.appendChildren(header, titleWrap, actions);
    return header;
  }

  function _setActive(tab) {
    if (!_homeTab || !_settingsTab) return;
    var isHome = tab === 'home';
    _homeTab.classList.toggle('bili-sub-header__tab--active', isHome);
    _settingsTab.classList.toggle('bili-sub-header__tab--active', !isHome);
  }

  function setActive(tab) {
    _setActive(tab);
  }

  return { create: create, setActive: setActive };
})();

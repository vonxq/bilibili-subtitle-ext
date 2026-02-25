window.BiliSub = window.BiliSub || {};

window.BiliSub.Header = (function () {
  var DOM = window.BiliSub.DOM;

  var SUBTITLE_ICON = '<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3" fill="currentColor" opacity="0.15"/><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="15.5" x2="18" y2="15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
  var SETTINGS_ICON = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var COLLAPSE_ICON = '<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

  function create(onSettings, onCollapse, onClose) {
    var header = DOM.create('div', 'bili-sub-header');

    var titleWrap = DOM.create('div', 'bili-sub-header__title');
    var icon = DOM.create('span', 'bili-sub-header__icon', { innerHTML: SUBTITLE_ICON });
    titleWrap.appendChild(icon);
    titleWrap.appendChild(document.createTextNode('字幕助手'));

    var actions = DOM.create('div', 'bili-sub-header__actions');

    var settingsBtn = DOM.create('button', 'bili-sub-header__btn', { innerHTML: SETTINGS_ICON });
    settingsBtn.title = '设置';
    settingsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (onSettings) onSettings();
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

    DOM.appendChildren(actions, settingsBtn, collapseBtn, closeBtn);
    DOM.appendChildren(header, titleWrap, actions);
    return header;
  }

  return { create: create };
})();

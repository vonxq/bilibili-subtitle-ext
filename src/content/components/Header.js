window.BiliSub = window.BiliSub || {};

window.BiliSub.Header = (function () {
  const { DOM } = window.BiliSub;

  const SUBTITLE_ICON = `<svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="3" fill="currentColor" opacity="0.15"/><rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" stroke-width="1.5" fill="none"/><line x1="6" y1="12" x2="14" y2="12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><line x1="6" y1="15.5" x2="18" y2="15.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;

  const COLLAPSE_ICON = `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

  const CLOSE_ICON = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;

  function create(onCollapse, onClose) {
    const header = DOM.create('div', 'bili-sub-header');

    const titleWrap = DOM.create('div', 'bili-sub-header__title');
    const icon = DOM.create('div', 'bili-sub-header__icon', { innerHTML: SUBTITLE_ICON });
    const titleText = document.createTextNode('字幕助手');
    DOM.appendChildren(titleWrap, icon, titleText);

    const actions = DOM.create('div', 'bili-sub-header__actions');

    const collapseBtn = DOM.create('button', 'bili-sub-header__btn bili-sub-header__btn--collapse', {
      innerHTML: COLLAPSE_ICON,
    });
    collapseBtn.title = '折叠/展开';
    collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onCollapse) onCollapse();
    });

    const closeBtn = DOM.create('button', 'bili-sub-header__btn', {
      innerHTML: CLOSE_ICON,
    });
    closeBtn.title = '关闭';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (onClose) onClose();
    });

    DOM.appendChildren(actions, collapseBtn, closeBtn);
    DOM.appendChildren(header, titleWrap, actions);

    return header;
  }

  return { create };
})();

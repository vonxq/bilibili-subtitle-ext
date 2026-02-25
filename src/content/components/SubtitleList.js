window.BiliSub = window.BiliSub || {};

window.BiliSub.SubtitleList = (function () {
  const { DOM, Constants, SubtitleService, SubtitleItem, PlayerService } = window.BiliSub;

  let _container = null;
  let _selectedLangs = [];
  let _isManualScrolling = false;
  let _scrollTimeout = null;
  let _lastActiveIndex = -1;

  function create() {
    _container = DOM.create('div', 'bili-sub-list');

    _container.addEventListener('scroll', () => {
      _isManualScrolling = true;
      clearTimeout(_scrollTimeout);
      _scrollTimeout = setTimeout(() => {
        _isManualScrolling = false;
      }, Constants.AUTO_SCROLL_DELAY);
    });

    return _container;
  }

  function render(selectedLangs) {
    if (!_container) return;
    _selectedLangs = selectedLangs || _selectedLangs;

    const timeline = SubtitleService.getFilteredTimeline(_selectedLangs);
    _container.innerHTML = '';
    _lastActiveIndex = -1;

    timeline.forEach((entry, index) => {
      const item = SubtitleItem.create(entry, _selectedLangs, index);
      _container.appendChild(item);
    });
  }

  function highlightCurrent(currentTime) {
    if (!_container) return;

    const items = _container.querySelectorAll('.bili-sub-item');
    let activeIndex = -1;

    items.forEach((item, index) => {
      const from = parseFloat(item.dataset.from);
      const to = parseFloat(item.dataset.to);
      const isActive = currentTime >= from && currentTime < to;

      item.classList.toggle('bili-sub-item--active', isActive);
      if (isActive) activeIndex = index;
    });

    if (activeIndex >= 0 && activeIndex !== _lastActiveIndex && !_isManualScrolling) {
      _lastActiveIndex = activeIndex;
      const activeItem = items[activeIndex];
      if (activeItem) {
        scrollToItem(activeItem);
      }
    }
  }

  function scrollToItem(item) {
    if (!_container || !item) return;

    const containerRect = _container.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const relativeTop = itemRect.top - containerRect.top;
    const targetScroll =
      _container.scrollTop + relativeTop - containerRect.height / 2 + itemRect.height / 2;

    _container.scrollTo({ top: targetScroll, behavior: 'smooth' });
  }

  function setSelectedLangs(langs) {
    _selectedLangs = langs;
    render(_selectedLangs);
  }

  function getElement() {
    return _container;
  }

  return { create, render, highlightCurrent, setSelectedLangs, getElement };
})();

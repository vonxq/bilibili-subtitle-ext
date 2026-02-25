window.BiliSub = window.BiliSub || {};

window.BiliSub.LanguageFilter = (function () {
  const { DOM, Constants } = window.BiliSub;

  let _container = null;
  let _selectedLangs = [];
  let _onChange = null;

  function create(onChange) {
    _onChange = onChange;
    _container = DOM.create('div', 'bili-sub-filter');
    _loadSavedSelection();
    return _container;
  }

  function render(availableLangs) {
    if (!_container) return;
    _container.innerHTML = '';

    if (availableLangs.length === 0) return;

    const label = DOM.create('span', 'bili-sub-filter__label', {
      textContent: 'Lang',
    });
    _container.appendChild(label);

    // If no saved selection, default to all languages
    if (_selectedLangs.length === 0) {
      _selectedLangs = [...availableLangs];
      _saveSelection();
    }

    availableLangs.forEach((lang) => {
      const isActive = _selectedLangs.includes(lang);
      const langName = Constants.LANG_NAMES[lang] || lang;
      const chip = DOM.create(
        'div',
        `bili-sub-filter__chip${isActive ? ' bili-sub-filter__chip--active' : ''}`
      );
      chip.textContent = langName;
      chip.dataset.lang = lang;

      chip.addEventListener('click', () => {
        _toggleLang(lang);
        render(availableLangs);
      });

      _container.appendChild(chip);
    });
  }

  function _toggleLang(lang) {
    const idx = _selectedLangs.indexOf(lang);
    if (idx >= 0) {
      if (_selectedLangs.length > 1) {
        _selectedLangs.splice(idx, 1);
      }
    } else {
      _selectedLangs.push(lang);
    }
    _saveSelection();
    if (_onChange) _onChange(_selectedLangs);
  }

  function _saveSelection() {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({
          [Constants.STORAGE_KEYS.SELECTED_LANGS]: _selectedLangs,
        });
      }
    } catch (_) {}
  }

  function _loadSavedSelection() {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(Constants.STORAGE_KEYS.SELECTED_LANGS, (result) => {
          const saved = result[Constants.STORAGE_KEYS.SELECTED_LANGS];
          if (Array.isArray(saved) && saved.length > 0) {
            _selectedLangs = saved;
          }
        });
      }
    } catch (_) {}
  }

  function getSelectedLangs() {
    return _selectedLangs;
  }

  function getElement() {
    return _container;
  }

  return { create, render, getSelectedLangs, getElement };
})();

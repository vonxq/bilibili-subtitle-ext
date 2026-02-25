window.BiliSub = window.BiliSub || {};

window.BiliSub.ModeSelector = (function () {
  var DOM = window.BiliSub.DOM;
  var Constants = window.BiliSub.Constants;

  var _container = null;
  var _currentMode = Constants.DEFAULTS.DISPLAY_MODE;
  var _onChange = null;

  var MODES = [
    { id: Constants.DISPLAY_MODES.LEARNING, icon: '🎓', label: '学习' },
    { id: Constants.DISPLAY_MODES.BILINGUAL, icon: '📚', label: '双语' },
    { id: Constants.DISPLAY_MODES.ASSISTED, icon: '📖', label: '辅助' },
  ];

  function create(onChange) {
    _onChange = onChange;
    _container = DOM.create('div', 'bili-sub-modes');
    _loadSaved();
    render();
    return _container;
  }

  function render() {
    _container.innerHTML = '';
    MODES.forEach(function (mode) {
      var active = mode.id === _currentMode;
      var btn = DOM.create(
        'button',
        'bili-sub-modes__btn' + (active ? ' bili-sub-modes__btn--active' : '')
      );
      btn.innerHTML =
        '<span class="bili-sub-modes__icon">' + mode.icon + '</span>' +
        '<span>' + mode.label + '</span>';
      btn.dataset.mode = mode.id;

      btn.addEventListener('click', function () {
        setMode(mode.id);
      });

      _container.appendChild(btn);
    });
  }

  function setMode(modeId) {
    _currentMode = modeId;
    render();
    _save();
    if (_onChange) _onChange(modeId);
  }

  function getMode() { return _currentMode; }

  function _save() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [Constants.STORAGE_KEYS.DISPLAY_MODE]: _currentMode });
      }
    } catch (_) {}
  }

  function _loadSaved() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        var keys = {};
        keys[Constants.STORAGE_KEYS.DISPLAY_MODE] = null;
        keys[Constants.STORAGE_KEYS.DEFAULT_MODE_STRATEGY] = null;
        keys[Constants.STORAGE_KEYS.DEFAULT_MODE] = null;

        chrome.storage.local.get(keys, function (result) {
          var savedMode = result[Constants.STORAGE_KEYS.DISPLAY_MODE];
          var strategy = result[Constants.STORAGE_KEYS.DEFAULT_MODE_STRATEGY] || 'last';
          var fixedMode = result[Constants.STORAGE_KEYS.DEFAULT_MODE];

          function isValid(modeId) {
            return MODES.some(function (mo) { return mo.id === modeId; });
          }

          if (strategy === 'fixed' && isValid(fixedMode)) {
            _currentMode = fixedMode;
            render();
            if (_onChange) _onChange(_currentMode);
            return;
          }

          if (savedMode && isValid(savedMode)) {
            _currentMode = savedMode;
            render();
            if (_onChange) _onChange(_currentMode);
          }
        });
      }
    } catch (_) {}
  }

  return { create: create, getMode: getMode, setMode: setMode };
})();

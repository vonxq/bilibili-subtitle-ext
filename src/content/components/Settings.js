window.BiliSub = window.BiliSub || {};

window.BiliSub.Settings = (function () {
  var DOM = window.BiliSub.DOM;
  var Constants = window.BiliSub.Constants;

  var _container = null;
  var _isOpen = false;
  var _tipEl = null;

  function create() {
    _container = DOM.create('div', 'bili-sub-settings');

    var nativeGroup = _buildSelect('母语 / Native Language', 'native');
    var targetGroup = _buildSelect('目标语言 / Target Language', 'target');

    _tipEl = DOM.create('div', 'bili-sub-settings__tip', {
      textContent: '修改后请刷新页面生效',
    });
    _tipEl.style.display = 'none';

    DOM.appendChildren(_container, nativeGroup, targetGroup, _tipEl);

    _loadSaved();
    return _container;
  }

  function _buildSelect(labelText, type) {
    var group = DOM.create('div', 'bili-sub-settings__group');
    var label = DOM.create('label', 'bili-sub-settings__label', { textContent: labelText });
    var select = DOM.create('select', 'bili-sub-settings__select');
    select.dataset.type = type;

    Constants.SUPPORTED_LANGS.forEach(function (lang) {
      var opt = DOM.create('option', '', { textContent: Constants.LANG_NAMES[lang] });
      opt.value = lang;
      select.appendChild(opt);
    });

    select.addEventListener('change', function () {
      _save();
    });

    DOM.appendChildren(group, label, select);
    return group;
  }

  function _save() {
    var nativeSelect = _container.querySelector('[data-type="native"]');
    var targetSelect = _container.querySelector('[data-type="target"]');
    var nativeLang = nativeSelect.value;
    var targetLang = targetSelect.value;

    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          [Constants.STORAGE_KEYS.NATIVE_LANG]: nativeLang,
          [Constants.STORAGE_KEYS.TARGET_LANG]: targetLang,
        });
      }
    } catch (_) {}

    if (_tipEl) _tipEl.style.display = '';
  }

  function _loadSaved() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(
          [Constants.STORAGE_KEYS.NATIVE_LANG, Constants.STORAGE_KEYS.TARGET_LANG],
          function (result) {
            var n = result[Constants.STORAGE_KEYS.NATIVE_LANG] || Constants.DEFAULTS.NATIVE_LANG;
            var t = result[Constants.STORAGE_KEYS.TARGET_LANG] || Constants.DEFAULTS.TARGET_LANG;
            var nativeSelect = _container.querySelector('[data-type="native"]');
            var targetSelect = _container.querySelector('[data-type="target"]');
            if (nativeSelect) nativeSelect.value = n;
            if (targetSelect) targetSelect.value = t;
          }
        );
      }
    } catch (_) {}
  }

  function toggle() {
    _isOpen = !_isOpen;
    _container.classList.toggle('bili-sub-settings--open', _isOpen);
    if (!_isOpen && _tipEl) _tipEl.style.display = 'none';
  }

  function close() {
    _isOpen = false;
    _container.classList.remove('bili-sub-settings--open');
    if (_tipEl) _tipEl.style.display = 'none';
  }

  function isOpen() { return _isOpen; }

  return { create: create, toggle: toggle, close: close, isOpen: isOpen };
})();

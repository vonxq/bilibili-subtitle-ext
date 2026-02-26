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

    var shortcutGroup = DOM.create('div', 'bili-sub-settings__group');
    var shortcutLabel = DOM.create('label', 'bili-sub-settings__label');
    var shortcutCheck = DOM.create('input');
    shortcutCheck.type = 'checkbox';
    shortcutCheck.dataset.type = 'shortcut';
    shortcutLabel.appendChild(shortcutCheck);
    shortcutLabel.appendChild(document.createTextNode(' 快捷键模式（左右切句，空格播放/暂停/单句循环）'));
    shortcutGroup.appendChild(shortcutLabel);
    shortcutCheck.addEventListener('change', function () { _save(); });

    var defaultModeGroup = DOM.create('div', 'bili-sub-settings__group');
    var defaultModeLabel = DOM.create('label', 'bili-sub-settings__label', { textContent: '默认显示模式' });
    var defaultModeSelect = DOM.create('select', 'bili-sub-settings__select');
    defaultModeSelect.dataset.type = 'default-mode';
    [
      { value: 'last', text: '记住上次使用的模式' },
      { value: 'bilingual', text: '双语模式' },
      { value: 'learning', text: '学习模式' },
      { value: 'assisted', text: '辅助模式' },
    ].forEach(function (o) {
      var opt = DOM.create('option', '', { textContent: o.text });
      opt.value = o.value;
      defaultModeSelect.appendChild(opt);
    });
    defaultModeSelect.addEventListener('change', function () { _save(); });
    defaultModeGroup.appendChild(defaultModeLabel);
    defaultModeGroup.appendChild(defaultModeSelect);

    _tipEl = DOM.create('div', 'bili-sub-settings__tip', {
      textContent: '修改后请刷新页面生效',
    });
    _tipEl.style.display = 'none';

    DOM.appendChildren(_container, nativeGroup, targetGroup, shortcutGroup, defaultModeGroup, _tipEl);

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
    var shortcutCheck = _container.querySelector('[data-type="shortcut"]');
    var defaultModeSelect = _container.querySelector('[data-type="default-mode"]');
    var nativeLang = nativeSelect ? nativeSelect.value : Constants.DEFAULTS.NATIVE_LANG;
    var targetLang = targetSelect ? targetSelect.value : Constants.DEFAULTS.TARGET_LANG;
    var shortcutEnabled = shortcutCheck ? shortcutCheck.checked : false;
    var defaultModeVal = defaultModeSelect ? defaultModeSelect.value : 'last';

    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        var payload = {
          [Constants.STORAGE_KEYS.NATIVE_LANG]: nativeLang,
          [Constants.STORAGE_KEYS.TARGET_LANG]: targetLang,
          [Constants.STORAGE_KEYS.SHORTCUT_ENABLED]: shortcutEnabled,
          [Constants.STORAGE_KEYS.DEFAULT_MODE_STRATEGY]: defaultModeVal === 'last' ? 'last' : 'fixed',
          [Constants.STORAGE_KEYS.DEFAULT_MODE]: defaultModeVal === 'last' ? null : defaultModeVal,
        };
        chrome.storage.local.set(payload);
      }
    } catch (_) {}

    if (_tipEl) _tipEl.style.display = '';
    try {
      window.dispatchEvent(new CustomEvent(Constants.EVENTS.SETTINGS_CHANGED, { detail: { shortcutEnabled: shortcutEnabled } }));
    } catch (_) {}
  }

  function _loadSaved() {
    try {
      if (chrome && chrome.storage && chrome.storage.local) {
        var keys = [
          Constants.STORAGE_KEYS.NATIVE_LANG,
          Constants.STORAGE_KEYS.TARGET_LANG,
          Constants.STORAGE_KEYS.SHORTCUT_ENABLED,
          Constants.STORAGE_KEYS.DEFAULT_MODE_STRATEGY,
          Constants.STORAGE_KEYS.DEFAULT_MODE,
        ];
        chrome.storage.local.get(keys, function (result) {
          var n = result[Constants.STORAGE_KEYS.NATIVE_LANG] || Constants.DEFAULTS.NATIVE_LANG;
          var t = result[Constants.STORAGE_KEYS.TARGET_LANG] || Constants.DEFAULTS.TARGET_LANG;
          var nativeSelect = _container.querySelector('[data-type="native"]');
          var targetSelect = _container.querySelector('[data-type="target"]');
          if (nativeSelect) nativeSelect.value = n;
          if (targetSelect) targetSelect.value = t;
          var shortcutCheck = _container.querySelector('[data-type="shortcut"]');
          if (shortcutCheck) shortcutCheck.checked = !!result[Constants.STORAGE_KEYS.SHORTCUT_ENABLED];
          var defaultModeSelect = _container.querySelector('[data-type="default-mode"]');
          if (defaultModeSelect) {
            var strategy = result[Constants.STORAGE_KEYS.DEFAULT_MODE_STRATEGY];
            var mode = result[Constants.STORAGE_KEYS.DEFAULT_MODE];
            defaultModeSelect.value = strategy === 'last' ? 'last' : (mode || 'assisted');
          }
        });
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

document.addEventListener('DOMContentLoaded', function () {
  var STORAGE_KEYS = {
    NATIVE_LANG: 'bili-sub-native-lang',
    TARGET_LANG: 'bili-sub-target-lang',
    DISPLAY_MODE: 'bili-sub-display-mode',
    DEFAULT_MODE_STRATEGY: 'bili-sub-default-mode-strategy',
    DEFAULT_MODE: 'bili-sub-default-mode',
  };

  var SUPPORTED_LANGS = [
    { id: 'zh', label: '中文' },
    { id: 'en', label: 'English' },
    { id: 'ja', label: '日本語' },
    { id: 'es', label: 'Español' },
    { id: 'ar', label: 'العربية' },
    { id: 'pt', label: 'Português' },
  ];

  var nativeSelect = document.getElementById('native');
  var targetSelect = document.getElementById('target');
  var btnSaveLangs = document.getElementById('save-langs');
  var defaultModeSelect = document.getElementById('default-mode');

  function populateLangs() {
    SUPPORTED_LANGS.forEach(function (l) {
      var o1 = document.createElement('option');
      o1.value = l.id;
      o1.textContent = l.label;
      nativeSelect.appendChild(o1);

      var o2 = document.createElement('option');
      o2.value = l.id;
      o2.textContent = l.label;
      targetSelect.appendChild(o2);
    });
  }

  function loadSettings() {
    if (!chrome || !chrome.storage || !chrome.storage.local) return;
    var keys = {};
    Object.keys(STORAGE_KEYS).forEach(function (k) {
      keys[STORAGE_KEYS[k]] = null;
    });

    chrome.storage.local.get(keys, function (res) {
      var native = res[STORAGE_KEYS.NATIVE_LANG] || 'zh';
      var target = res[STORAGE_KEYS.TARGET_LANG] || 'en';
      nativeSelect.value = native;
      targetSelect.value = target;

      var strategy = res[STORAGE_KEYS.DEFAULT_MODE_STRATEGY] || 'last';
      var fixedDefault = res[STORAGE_KEYS.DEFAULT_MODE] || 'assisted';
      if (strategy === 'last') {
        defaultModeSelect.value = 'last';
      } else {
        defaultModeSelect.value = fixedDefault || 'assisted';
      }
    });
  }

  function saveLangs() {
    if (!chrome || !chrome.storage || !chrome.storage.local) return;
    var native = nativeSelect.value;
    var target = targetSelect.value;
    chrome.storage.local.set({
      [STORAGE_KEYS.NATIVE_LANG]: native,
      [STORAGE_KEYS.TARGET_LANG]: target,
    });
    window.close();
  }

  function saveDefaultMode() {
    if (!chrome || !chrome.storage || !chrome.storage.local) return;
    var val = defaultModeSelect.value;
    var strategy = 'last';
    var mode = null;
    if (val === 'last') {
      strategy = 'last';
    } else {
      strategy = 'fixed';
      mode = val;
    }
    var data = {};
    data[STORAGE_KEYS.DEFAULT_MODE_STRATEGY] = strategy;
    data[STORAGE_KEYS.DEFAULT_MODE] = mode;
    chrome.storage.local.set(data);
  }

  populateLangs();
  loadSettings();

  btnSaveLangs.addEventListener('click', function () {
    saveLangs();
    saveDefaultMode();
  });
  defaultModeSelect.addEventListener('change', saveDefaultMode);
});


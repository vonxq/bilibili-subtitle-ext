window.BiliSub = window.BiliSub || {};

window.BiliSub.AutoSubtitleService = (function () {
  var DOM = window.BiliSub.DOM;
  var SubtitleService = window.BiliSub.SubtitleService;
  var Constants = window.BiliSub.Constants;

  var _configuredOnce = false;
  var _turnedOffOnce = false;

  function waitForSubtitleButton(timeout) {
    return DOM.waitForElement('.bpx-player-ctrl-btn.bpx-player-ctrl-subtitle', timeout || 8000);
  }

  function isMenuOpen() {
    var menu = document.querySelector('.bpx-player-ctrl-subtitle-menu');
    return !!(menu && menu.offsetParent !== null);
  }

  function getMenuRoot() {
    return document.querySelector('.bpx-player-ctrl-subtitle-menu');
  }

  function openMenuIfNeeded() {
    if (isMenuOpen()) return Promise.resolve(getMenuRoot());

    return waitForSubtitleButton().then(function (btn) {
      try {
        btn.click();
      } catch (_) {}

      return new Promise(function (resolve) {
        setTimeout(function () {
          resolve(getMenuRoot());
        }, 200);
      });
    });
  }

  function toggleMainButton() {
    var btn = document.querySelector('.bpx-player-ctrl-btn.bpx-player-ctrl-subtitle');
    if (!btn) return;
    try {
      btn.click();
    } catch (_) {}
  }

  function ensureBilingualSwitchOn(root) {
    if (!root) return;
    var input = root.querySelector(
      '.bpx-player-ctrl-subtitle-bilingual-above input.bui-switch-input,' +
        ' .bpx-player-ctrl-subtitle-bilingual-bottom input.bui-switch-input'
    );
    if (!input) return;
    try {
      if (!input.checked) {
        input.click();
      }
    } catch (_) {}
  }

  function mapToAiLan(lang) {
    if (!lang) return null;
    return 'ai-' + lang;
  }

  function selectLanguage(root, containerSelector, lang) {
    if (!root) return;
    var container = root.querySelector(containerSelector);
    if (!container) return;
    var item = null;

    if (lang) {
      var aiLan = mapToAiLan(lang);
      if (aiLan) {
        item = container.querySelector('[data-lan="' + aiLan + '"]');
      }
      if (!item && Constants && Constants.LANG_NAMES && Constants.LANG_NAMES[lang]) {
        var label = Constants.LANG_NAMES[lang];
        var candidates = container.querySelectorAll('.bpx-player-ctrl-subtitle-language-item');
        for (var i = 0; i < candidates.length; i++) {
          var textEl = candidates[i].querySelector('.bpx-player-ctrl-subtitle-language-item-text');
          if (textEl && textEl.textContent.trim() === label) {
            item = candidates[i];
            break;
          }
        }
      }
    }

    // fallback：找不到配置语言时，点击第一个可用字幕项（适配只有中文一种字幕的情况）
    if (!item) {
      item = container.querySelector('.bpx-player-ctrl-subtitle-language-item');
    }

    if (item) {
      try {
        item.click();
      } catch (_) {}
    }
  }

  function configureOnce() {
    if (_configuredOnce) return;

    openMenuIfNeeded()
      .then(function (menuRoot) {
        if (!menuRoot) return;
        var settings = SubtitleService.getSettings();
        ensureBilingualSwitchOn(menuRoot);
        selectLanguage(menuRoot, '.bpx-player-ctrl-subtitle-major-inner', settings.targetLang);
        selectLanguage(menuRoot, '.bpx-player-ctrl-subtitle-minor-inner', settings.nativeLang);
        _configuredOnce = true;
      })
      .then(function () {
        if (_turnedOffOnce) return;
        setTimeout(turnOffSubtitlesOnce, 2000);
      })
      .catch(function () {});
  }

  function turnOffSubtitlesOnce() {
    if (_turnedOffOnce) return;
    _turnedOffOnce = true;

    var menuRoot = getMenuRoot();
    if (!menuRoot) {
      toggleMainButton();
      menuRoot = getMenuRoot();
    }
    if (menuRoot) {
      var closeSwitch = menuRoot.querySelector('.bpx-player-ctrl-subtitle-close-switch[data-action="close"]');
      try {
        if (closeSwitch) {
          closeSwitch.click();
        }
      } catch (_) {}
    }

    toggleMainButton();
  }

  function onSubtitleTimelineUpdate(timeline) {
    if (!timeline || !timeline.length) return;
    configureOnce();
  }

  function init() {
    setTimeout(function () {
      configureOnce();
    }, 2000);
  }

  SubtitleService.onUpdate(onSubtitleTimelineUpdate);

  return {
    init: init,
  };
})();



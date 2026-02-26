window.BiliSub = window.BiliSub || {};

(function () {
  'use strict';

  if (window.__biliSubContentLoaded) return;
  window.__biliSubContentLoaded = true;

  var DOM = window.BiliSub.DOM;
  var Panel = window.BiliSub.Panel;
  var AutoSubtitleService = window.BiliSub.AutoSubtitleService;

  function init() {
    var scriptUrl = chrome.runtime.getURL('src/inject.js');
    DOM.injectPageScript(scriptUrl);
    Panel.create();
    if (AutoSubtitleService && typeof AutoSubtitleService.init === 'function') {
      AutoSubtitleService.init();
    }
    var ShortcutService = window.BiliSub.ShortcutService;
    if (ShortcutService && typeof ShortcutService.init === 'function') {
      ShortcutService.init();
    }
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.action === 'toggle-panel') Panel.show();
    if (msg.action === 'clip-seek-play') {
      var PlayerService = window.BiliSub && window.BiliSub.PlayerService;
      if (PlayerService && typeof PlayerService.seekTo === 'function') {
        PlayerService.seekTo(msg.from);
        var video = PlayerService.getVideo && PlayerService.getVideo();
        if (video && typeof video.play === 'function') video.play();
      }
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

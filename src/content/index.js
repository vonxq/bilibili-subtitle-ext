window.BiliSub = window.BiliSub || {};

(function () {
  'use strict';

  if (window.__biliSubContentLoaded) return;
  window.__biliSubContentLoaded = true;

  var DOM = window.BiliSub.DOM;
  var Panel = window.BiliSub.Panel;

  function init() {
    var scriptUrl = chrome.runtime.getURL('src/inject.js');
    DOM.injectPageScript(scriptUrl);
    Panel.create();
  }

  chrome.runtime.onMessage.addListener(function (msg) {
    if (msg.action === 'toggle-panel') Panel.show();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

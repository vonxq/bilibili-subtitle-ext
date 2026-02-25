window.BiliSub = window.BiliSub || {};

(function () {
  'use strict';

  if (window.__biliSubContentLoaded) return;
  window.__biliSubContentLoaded = true;

  const { DOM, Panel } = window.BiliSub;

  function init() {
    injectPageScript();
    Panel.create();

    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggle-panel') {
        Panel.show();
      }
    });
  }

  function injectPageScript() {
    const scriptUrl = chrome.runtime.getURL('src/inject.js');
    DOM.injectPageScript(scriptUrl);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

(function () {
  'use strict';

  if (window.__biliSubInterceptorLoaded) return;
  window.__biliSubInterceptorLoaded = true;

  function dispatchSubtitle(data) {
    window.dispatchEvent(
      new CustomEvent('bili-subtitle-data', {
        detail: JSON.parse(JSON.stringify(data)),
      })
    );
  }

  // Hook fetch
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';

    if (url.includes('ai_subtitle')) {
      try {
        const response = await originalFetch.apply(this, args);
        const cloned = response.clone();
        cloned.json().then(dispatchSubtitle).catch(() => {});
        return response;
      } catch (e) {
        return originalFetch.apply(this, args);
      }
    }

    return originalFetch.apply(this, args);
  };

  // Hook XMLHttpRequest
  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._biliSubUrl = url;
    return xhrOpen.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._biliSubUrl && this._biliSubUrl.includes('ai_subtitle')) {
      this.addEventListener('load', function () {
        if (this.status === 200) {
          try {
            dispatchSubtitle(JSON.parse(this.responseText));
          } catch (_) {}
        }
      });
    }
    return xhrSend.apply(this, args);
  };
})();

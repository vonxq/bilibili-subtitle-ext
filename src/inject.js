(function () {
  'use strict';

  if (window.__biliSubInterceptorLoaded) return;
  window.__biliSubInterceptorLoaded = true;

  function dispatch(eventName, data) {
    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: JSON.parse(JSON.stringify(data)),
      })
    );
  }

  function isSubtitleUrl(url) {
    return typeof url === 'string' && url.includes('ai_subtitle');
  }

  function isPlayerApiUrl(url) {
    return typeof url === 'string' && /\/x\/player\/(wbi\/)?v2/.test(url);
  }

  function handleSubtitleResponse(data) {
    dispatch('bili-subtitle-data', data);
  }

  function handlePlayerApiResponse(data) {
    if (data && data.data && data.data.subtitle && data.data.subtitle.subtitles) {
      var subtitles = data.data.subtitle.subtitles;
      var urls = subtitles.map(function (s) {
        return {
          lang: s.lan,
          langDoc: s.lan_doc,
          url: s.subtitle_url,
          aiType: s.ai_type,
          aiStatus: s.ai_status,
        };
      });
      dispatch('bili-subtitle-urls', urls);
    }
  }

  // Hook fetch
  var originalFetch = window.fetch;
  window.fetch = function () {
    var args = arguments;
    var url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url) || '';

    if (isSubtitleUrl(url) || isPlayerApiUrl(url)) {
      return originalFetch.apply(this, args).then(function (response) {
        var cloned = response.clone();
        cloned
          .json()
          .then(function (data) {
            if (isSubtitleUrl(url)) handleSubtitleResponse(data);
            if (isPlayerApiUrl(url)) handlePlayerApiResponse(data);
          })
          .catch(function () {});
        return response;
      });
    }

    return originalFetch.apply(this, args);
  };

  // Hook XMLHttpRequest
  var xhrOpen = XMLHttpRequest.prototype.open;
  var xhrSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this._biliSubUrl = url;
    return xhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var self = this;
    var url = self._biliSubUrl;

    if (url && (isSubtitleUrl(url) || isPlayerApiUrl(url))) {
      self.addEventListener('load', function () {
        if (self.status === 200) {
          try {
            var data = JSON.parse(self.responseText);
            if (isSubtitleUrl(url)) handleSubtitleResponse(data);
            if (isPlayerApiUrl(url)) handlePlayerApiResponse(data);
          } catch (_) {}
        }
      });
    }

    return xhrSend.apply(this, arguments);
  };
})();

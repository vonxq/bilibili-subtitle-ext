function isBilibiliVideo(url) {
  if (!url) return false;
  return /:\/\/[^/]*bilibili\.com\/(video|cheese)\//.test(url);
}

function updateActionForTab(tabId, url) {
  if (!chrome.action || !tabId) return;
  var isVideo = isBilibiliVideo(url);
  try {
    chrome.action.setPopup({
      tabId: tabId,
      popup: isVideo ? '' : 'src/options/popup.html',
    });
  } catch (_) {}
}

chrome.runtime.onInstalled.addListener(function () {
  console.log('[BiliSub] Extension installed');
});

if (chrome.tabs && chrome.action) {
  chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
      updateActionForTab(tabId, tab.url);
    }
  });

  chrome.tabs.onActivated.addListener(function (info) {
    chrome.tabs.get(info.tabId, function (tab) {
      if (chrome.runtime.lastError) return;
      updateActionForTab(tab.id, tab.url);
    });
  });
}

if (chrome.action) {
  chrome.action.onClicked.addListener(function (tab) {
    if (!tab || !tab.id || !tab.url) return;
    if (isBilibiliVideo(tab.url)) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle-panel' });
    }
  });
}

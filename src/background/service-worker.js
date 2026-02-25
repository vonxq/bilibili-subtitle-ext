chrome.runtime.onInstalled.addListener(() => {
  console.log('[BiliSub] Extension installed');
});

if (chrome.action) {
  chrome.action.onClicked.addListener((tab) => {
    if (tab.id && tab.url && tab.url.includes('bilibili.com')) {
      chrome.tabs.sendMessage(tab.id, { action: 'toggle-panel' });
    }
  });
}

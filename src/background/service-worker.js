chrome.action.onClicked.addListener((tab) => {
  if (tab.url && tab.url.includes('bilibili.com')) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle-panel' });
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('[BiliSub] Extension installed');
});

let currentTabId = null;
let currentHeaders = {};

chrome.webRequest.onCompleted.addListener(async function (details) {
  console.log("onCompleted:: Response headers:", details.responseHeaders);
  if (details.tabId === currentTabId) {
    currentHeaders.response = sortHeaders(details.responseHeaders);
    sendHeadersToContentScript(currentTabId);
  }
}, {urls: ['<all_urls>']}, ['responseHeaders'])

chrome.webRequest.onBeforeSendHeaders.addListener(function (details) {
  console.log("onBeforeSendHeaders:: Request headers:", details.requestHeaders);

  if (details.tabId === currentTabId) {
    currentHeaders.request = sortHeaders(details.requestHeaders);
  }
}, {urls: ['<all_urls>']}, ['requestHeaders'])

function sortHeaders(headers) {
  return headers.sort((a, b) => a.name.localeCompare(b.name));
}

chrome.tabs.onActivated.addListener(activeInfo => {
  console.log('Tab activated', activeInfo);
  currentTabId = activeInfo.tabId;
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  console.log('Tab updated', tabId, changeInfo, tab);
  if (changeInfo.status === 'complete' && tabId === currentTabId) {
    currentHeaders = {};
    console.log('Headers reset for new page load');
  }
});

function sendHeadersToContentScript(tabId) {
  if (currentHeaders.request && currentHeaders.response) {
    chrome.tabs.sendMessage(tabId, {
      action: "updateHeaders",
      headers: currentHeaders
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Error sending message:', chrome.runtime.lastError.message);
        // If the content script isn't ready, retry after a short delay
        setTimeout(() => sendHeadersToContentScript(tabId), 200);
      } else {
        console.log('Headers sent successfully');
        currentHeaders = {}; // Reset headers after successful send
      }
    });
  }
}
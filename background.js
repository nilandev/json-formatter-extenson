chrome.action.onClicked.addListener((tab) => {
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: formatJSON
    });
});

function formatJSON() {
    var pre = document.querySelector("pre");
    if (pre) {
        try {
            var jsonObj = JSON.parse(pre.textContent);
            pre.textContent = JSON.stringify(jsonObj, null, 2);
        } catch (e) {
            console.error("Invalid JSON");
        }
    }
}
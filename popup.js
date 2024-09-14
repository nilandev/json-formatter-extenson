document.addEventListener('DOMContentLoaded', function() {
    const themeSelect = document.getElementById('themeSelect');
    const fontInput = document.getElementById('fontInput');
    const saveButton = document.getElementById('saveButton');

    // Load saved settings
    chrome.storage.sync.get(['theme', 'fontFamily'], function(data) {
        if (data.theme) {
            themeSelect.value = data.theme;
        }
        if (data.fontFamily) {
            fontInput.value = data.fontFamily;
        }
    });

    saveButton.addEventListener('click', function() {
        const selectedTheme = themeSelect.value;
        const fontFamily = fontInput.value;

        chrome.storage.sync.set({theme: selectedTheme, fontFamily: fontFamily}, function() {
            console.log('Settings saved');

            // Notify content script to update theme and font
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "updateSettings",
                    theme: selectedTheme,
                    fontFamily: fontFamily
                });
            });
        });
    });

    themeSelect.addEventListener('change', function() {
        const selectedTheme = themeSelect.value;
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "updateSettings",
                theme: selectedTheme
            });
        });
    });
});
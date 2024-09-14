let currentTheme = 'dark';
let currentFontFamily = 'monospace';
let jsonObj = null;
let originalContent = null;
let isFlatView = false;

function isJSONString(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

function formatJSON(theme, fontFamily) {
    if (document.contentType === 'application/json' ||
        (document.contentType === 'text/plain' && isJSONString(document.body.textContent))) {
        originalContent = document.body.textContent;
        try {
            jsonObj = JSON.parse(originalContent);
            document.body.innerHTML = '';
            renderJSON(jsonObj, theme, fontFamily);
            addFilterUI();
        } catch (e) {
            console.error("Error formatting JSON:", e);
        }
    }
}

function applyThemeAndFont(theme, fontFamily) {
    if (theme === 'light') {
        document.body.style.backgroundColor = '#ffffff';
        document.body.style.color = '#000000';
    } else if (theme === 'dark') {
        document.body.style.backgroundColor = '#1e1e1e';
        document.body.style.color = '#d4d4d4';
    }
    document.body.style.fontFamily = fontFamily;
}

function renderJSON(obj, theme, fontFamily) {
    const existingContainer = document.getElementById('json-container');
    if (existingContainer) {
        existingContainer.remove();
    }

    const jsonContainer = document.createElement('div');
    jsonContainer.id = 'json-container';

    if (isFlatView) {
        jsonContainer.appendChild(renderFlatJSON(obj));
    } else {
        const formatter = new JSONFormatter(obj, 3, {
            hoverPreviewEnabled: true,
            hoverPreviewArrayCount: 100,
            hoverPreviewFieldCount: 5,
            theme: theme,
            animateOpen: true,
            animateClose: true
        });
        jsonContainer.appendChild(formatter.render());
    }

    document.body.appendChild(jsonContainer);

    applyThemeAndFont(theme, fontFamily);
}

function renderFlatJSON(obj) {
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(obj, null, 2);
    return pre;
}

function addFilterUI() {
    const existingFilterContainer = document.getElementById('json-filter-container');
    if (existingFilterContainer) {
        existingFilterContainer.remove();
    }

    const filterContainer = document.createElement('div');
    filterContainer.id = 'json-filter-container';
    filterContainer.innerHTML = `
    <input type="text" id="json-filter-input" placeholder="Filter JSON...">
    <button id="json-filter-button">Filter</button>
    <button id="json-clear-button">Clear filter</button>
    <button id="json-toggle-view-button">${isFlatView ? 'Tree View' : 'Text View'}</button>
    <button id="json-copy-button">Copy</button>
  `;
    document.body.insertBefore(filterContainer, document.body.firstChild);

    document.getElementById('json-filter-button').addEventListener('click', performFilter);
    document.getElementById('json-clear-button').addEventListener('click', clearFilter);
    document.getElementById('json-toggle-view-button').addEventListener('click', toggleView);
    document.getElementById('json-copy-button').addEventListener('click', copyJSON);
    document.getElementById('json-filter-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performFilter();
        }
    });
}

function copyJSON() {
    const jsonString = JSON.stringify(jsonObj, null, 2);
    navigator.clipboard.writeText(jsonString).then(() => {
        alert('JSON copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy JSON: ', err);
        alert('Failed to copy JSON. Please check console for details.');
    });
}

function performFilter() {
    const filterValue = document.getElementById('json-filter-input').value.toLowerCase();
    const filteredObj = filterObject(jsonObj, filterValue);
    renderJSON(filteredObj, currentTheme, currentFontFamily);
}

function clearFilter() {
    document.getElementById('json-filter-input').value = '';
    renderJSON(jsonObj, currentTheme, currentFontFamily);
}

function toggleView() {
    isFlatView = !isFlatView;
    renderJSON(jsonObj, currentTheme, currentFontFamily);
    const toggleButton = document.getElementById('json-toggle-view-button');
    toggleButton.textContent = isFlatView ? 'Tree View' : 'Text View';
}

function filterObject(obj, filter) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => filterObject(item, filter)).filter(item => item !== undefined);
    }

    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (key.toLowerCase().includes(filter) || JSON.stringify(value).toLowerCase().includes(filter)) {
            result[key] = filterObject(value, filter);
        }
    }

    return Object.keys(result).length ? result : undefined;
}
chrome.storage.sync.get(['theme', 'fontFamily'], function(data) {
    currentTheme = data.theme || 'dark';
    currentFontFamily = data.fontFamily || 'monospace';
    formatJSON(currentTheme, currentFontFamily);
});

// Listen for settings update messages
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Received message from popup.js:", request);

    if (request.action === "updateSettings") {
        currentTheme = request.theme;
        currentFontFamily = request.fontFamily;
        renderJSON(jsonObj, currentTheme, currentFontFamily);
    }
});
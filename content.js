let currentTheme = 'dark';
let currentFontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
let jsonObj = null;
let originalContent = null;
let isFlatView = false;
let isExpandedAll = false;

function initializeExtension() {
    chrome.storage.sync.get(['theme', 'fontFamily'], function(data) {
        currentTheme = data.theme || 'github-dark';
        currentFontFamily = data.fontFamily || 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
    });
}


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
    document.body.className = `${theme}-theme`;
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
        const formatter = new JSONFormatter(obj, isExpandedAll ? Infinity : 3, {
            hoverPreviewEnabled: false,
            hoverPreviewArrayCount: 200,
            hoverPreviewFieldCount: 10,
            theme: theme,
            animateOpen: true,
            animateClose: true
        });
        jsonContainer.appendChild(formatter.render());
    }
    document.body.appendChild(jsonContainer);
    applyThemeAndFont(theme, fontFamily);
}

function expandAll() {
    isExpandedAll = true;
    renderJSON(jsonObj, currentTheme, currentFontFamily);
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

    <input type="text" id="json-filter-input" placeholder="Enter JSONPath (e.g., $.store.book[*].author)">
    <button id="json-filter-button">Filter</button>
    <button id="json-clear-button" class="view-button">Clear</button>
    <div id="json-view-switch">
      <button id="json-foldable-view-button" class="view-button ${!isFlatView ? 'active' : ''}">Tree</button>
      <button id="json-flat-view-button" class="view-button ${isFlatView ? 'active' : ''}">Flat</button>
    </div>
    <button id="json-expand-all-button">Expand All</button>
    <button id="json-copy-button">Copy</button>
     <button id="json-filter-help-button">
       <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-help-circle"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
     </button>
  `;
    document.body.insertBefore(filterContainer, document.body.firstChild);

    document.getElementById('json-filter-button').addEventListener('click', performFilter);
    document.getElementById('json-clear-button').addEventListener('click', clearFilter);
    document.getElementById('json-foldable-view-button').addEventListener('click', () => switchView(false));
    document.getElementById('json-flat-view-button').addEventListener('click', () => switchView(true));
    document.getElementById('json-copy-button').addEventListener('click', copyJSON);
    // document.getElementById('json-export-csv-button').addEventListener('click', exportToCSV);
    document.getElementById('json-filter-help-button').addEventListener('click', showFilterHelp);
    document.getElementById('json-expand-all-button').addEventListener('click', expandAll);
    document.getElementById('json-filter-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performFilter();
        }
    });
}


function performFilter() {
    const filterExpression = document.getElementById('json-filter-input').value;
    console.log('Attempting to filter with expression:', filterExpression);

    try {
        const filteredObj = JSONPath.JSONPath({path: filterExpression, json: jsonObj});
        console.log('Filtered result:', filteredObj);

        if (filteredObj === undefined || filteredObj === null) {
            alert('No results found for this JSONPath expression.');
            return;
        }

        isExpandedAll = false; // Reset expansion state
        renderJSON(filteredObj, currentTheme, currentFontFamily);
    } catch (error) {
        console.error('JSONPath filtering error:', error);
        alert(`Invalid JSONPath syntax: ${error.message}. Please check your syntax.`);
    }
}

function clearFilter() {
    document.getElementById('json-filter-input').value = '';
    isExpandedAll = false;
    renderJSON(jsonObj, currentTheme, currentFontFamily);
}

function showFilterHelp() {
    const helpURL = chrome.runtime.getURL('filter-help.html');
    window.open(helpURL, '_blank');
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

function switchView(toFlatView) {
    if (isFlatView !== toFlatView) {
        isFlatView = toFlatView;
        document.getElementById('json-foldable-view-button').classList.toggle('active', !isFlatView);
        document.getElementById('json-flat-view-button').classList.toggle('active', isFlatView);
        renderJSON(jsonObj, currentTheme, currentFontFamily);
    }
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
        if (request.theme) {
            currentTheme = request.theme;
        }
        if (request.fontFamily) {
            currentFontFamily = request.fontFamily;
        }

        renderJSON(jsonObj, currentTheme, currentFontFamily);
    }
});

initializeExtension();
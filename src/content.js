let currentTheme = 'light';
let currentFontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
let jsonObj = null;
let originalContent = null;
let isFlatView = false;
let isExpandedAll = false;
let filteredJsonObj = null;
let currentHeaders = {
    request: {},
    response: {}
};

function init() {
    if (document.contentType === 'application/json' ||
        (document.contentType === 'text/plain' && isJSONString(document.body.firstChild.textContent))) {

        chrome.storage.sync.get(['theme', 'fontFamily'], function(data) {
            currentTheme = data.theme || 'light';
            currentFontFamily = data.fontFamily || 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
            applyThemeAndFont(currentTheme, currentFontFamily);
        });

        originalContent = document.body.firstChild.textContent;
        try {
            jsonObj = JSON.parse(originalContent);
            document.body.innerHTML = '';
            addFilterUI();
            renderJSON(jsonObj, currentTheme, currentFontFamily);
            renderHeaders();
        } catch (e) {
            console.error("Error formatting JSON:", e);
        }
    }
}

function applyThemeAndFont(theme, fontFamily) {
    document.body.className = `${theme}-theme`;
    document.body.style.fontFamily = fontFamily;
}

function isJSONString(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

function renderJSON(obj, theme, fontFamily) {
    const existingContainer = document.getElementById('json-container');

    //remove all child nodes, before adding new ones
    existingContainer.childNodes.forEach(child => child.remove());

    if (isFlatView) {
        existingContainer.appendChild(renderFlatJSON(obj));
    } else {
        const formatter = new JSONFormatter(obj, isExpandedAll ? Infinity : 1, {
            hoverPreviewEnabled: false,
            hoverPreviewArrayCount: 200,
            hoverPreviewFieldCount: 10,
            theme: theme,
            animateOpen: true,
            animateClose: true
        });
        existingContainer.appendChild(formatter.render());
    }
}

function collapseAll() {
    isExpandedAll = false;
    renderJSON(jsonObj, currentTheme, currentFontFamily);
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

function renderNavigation() {
    return `
      <div class="tab-container">
        <button id="json-tab" class="tab-button active">JSON</button>
        <button id="headers-tab" class="tab-button">Headers</button>
      </div>
      <div id="json-view" class="tab-content active">
        <div id="json-filter-container">
          <div class="header-row">
            <div id="json-view-switch">
              <button id="json-foldable-view-button" class="view-button ${!isFlatView ? 'active' : ''}">Tree</button>
              <button id="json-flat-view-button" class="view-button ${isFlatView ? 'active' : ''}">Flat</button>
            </div>
            <button id="json-expand-all-button" class="header-button">Expand All</button>
            <button id="json-collapse-all-button" class="header-button">Collapse All</button>
            <button id="json-copy-button" class="header-button">Copy</button>
            <button id="json-export-csv-button" class="header-button">Export CSV</button>
          </div>
          <div class="header-row">
            <input type="text" id="json-filter-input" placeholder="Enter JSONPath (e.g., $.store.book[*].author)">
            <button id="json-filter-button" class="header-button">Filter</button>
            <button id="json-clear-button" class="header-button">Clear</button>
            <button id="json-filter-help-button" class="header-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-help-circle"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </button>
          </div>
        </div>
        <div id="json-container"></div>
      </div>
      <div id="headers-view" class="tab-content">
        <div id="headers-container"></div>
      </div>
  `;
}

function addFilterUI() {
    const existingFilterContainer = document.getElementById('json-filter-container');
    if (existingFilterContainer) {
        existingFilterContainer.remove();
    }

    const filterContainer = document.createElement('div');
    filterContainer.id = 'json-formatter-container';
    filterContainer.innerHTML = renderNavigation();
    document.body.insertBefore(filterContainer, document.body.firstChild);

    document.getElementById('json-tab').addEventListener('click', () => switchTab('json'));
    document.getElementById('headers-tab').addEventListener('click', () => switchTab('headers'));
    document.getElementById('json-filter-button').addEventListener('click', performFilter);
    document.getElementById('json-clear-button').addEventListener('click', clearFilter);
    document.getElementById('json-foldable-view-button').addEventListener('click', () => switchView(false));
    document.getElementById('json-flat-view-button').addEventListener('click', () => switchView(true));
    document.getElementById('json-copy-button').addEventListener('click', copyJSON);
    document.getElementById('json-export-csv-button').addEventListener('click', exportFilteredToCSV);
    document.getElementById('json-filter-help-button').addEventListener('click', showFilterHelp);
    document.getElementById('json-expand-all-button').addEventListener('click', expandAll);
    document.getElementById('json-collapse-all-button').addEventListener('click', collapseAll); // New event
    document.getElementById('json-filter-input').addEventListener('keyup', function(event) {
        if (event.key === 'Enter') {
            performFilter();
        }
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.getElementById(`${tabName}-view`).classList.add('active');
}

function renderHeaders() {
    const headersContainer = document.getElementById('headers-container');
    if (currentHeaders) {
        let headersHTML = '<h3>Request Headers</h3><ul>';
        for (const [key, value] of Object.entries(currentHeaders.request)) {
            headersHTML += `<li><strong>${key}:</strong> ${value}</li>`;
        }
        headersHTML += '</ul><h3>Response Headers</h3><ul>';
        for (const [key, value] of Object.entries(currentHeaders.response)) {
            headersHTML += `<li><strong>${key}:</strong> ${value}</li>`;
        }
        headersHTML += '</ul>';
        headersContainer.innerHTML = headersHTML;
    } else {
        headersContainer.innerHTML = '<p>No headers available.</p>';
    }
}

function performFilter() {
    const filterExpression = document.getElementById('json-filter-input').value;
    console.log('Attempting to filter with expression:', filterExpression);

    try {
        filteredJsonObj = JSONPath.JSONPath({path: filterExpression, json: jsonObj});
        console.log('Filtered result:', filteredJsonObj);

        if (filteredJsonObj === undefined || filteredJsonObj === null) {
            alert('No results found for this JSONPath expression.');
            return;
        }

        isExpandedAll = false; // Reset expansion state
        renderJSON(filteredJsonObj, currentTheme, currentFontFamily);
    } catch (error) {
        console.error('JSONPath filtering error:', error);
        alert(`Invalid JSONPath syntax: ${error.message}. Please check your syntax.`);
    }
}



function exportFilteredToCSV() {
    if (filteredJsonObj) {
        exportToCSV(filteredJsonObj, '_filtered');
    } else {
        exportToCSV(jsonObj);
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
        showToast('Copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy JSON: ', err);
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Received message from popup.js:", request);
    // Listen for settings update messages
    if (request.action === "updateSettings") {
        if (request.theme) {
            currentTheme = request.theme;
        }
        if (request.fontFamily) {
            currentFontFamily = request.fontFamily;
        }

        applyThemeAndFont(currentTheme, currentFontFamily)
        renderJSON(jsonObj, currentTheme, currentFontFamily);
    }

    if (request.action === "updateHeaders") {
        headers = request.headers;
        console.log('Headers updated', headers);
        renderHeaders();
        sendResponse({status: "Headers updated successfully"});
    }
    return true; // Indicates that sendResponse will be called asynchronously
});

init();
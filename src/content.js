let currentTheme = 'light';
let currentFontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
let currentHeaders = {
    request: [],
    response: []
};
let jsonObj = null;
let originalContent = null;
let jsonViewType = 'tree';

let isExpandedAll = true;
let filteredJsonObj = null;
let filterExpression = '';
let filterType = 'jsonpath';

function init() {
    if (document.contentType === 'application/json' ||
        (document.contentType === 'text/plain' && isJSONString(document.body.firstChild.textContent))) {

        chrome.storage.sync.get(['theme', 'fontFamily'], function (data) {
            currentTheme = data.theme || 'light';
            currentFontFamily = data.fontFamily || 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
            applyThemeAndFont(currentTheme, currentFontFamily);
        });

        originalContent = document.body.firstChild.textContent;
        try {
            jsonObj = JSON.parse(originalContent);
            document.body.innerHTML = '';
            addFilterUI();
            renderJSON(currentTheme, currentFontFamily);
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

function renderJSON(theme, fontFamily) {
    let obj = filteredJsonObj == null ? jsonObj : filteredJsonObj;

    //remove all child nodes, before adding new ones
    const existingContainer = document.getElementById('json-container');
    existingContainer.innerHTML = '';

    switch (jsonViewType) {
        case "tree":
            const formatter = new JSONFormatter(obj, isExpandedAll ? Infinity : 1, {
                hoverPreviewEnabled: false,
                hoverPreviewArrayCount: 200,
                hoverPreviewFieldCount: 10,
                theme: theme,
                animateOpen: true,
                animateClose: true
            });
            existingContainer.appendChild(formatter.render());
            break;
        case "grid":
            const jsonGrid = document.createElement('div');
            jsonGrid.id = 'json-grid-container';
            createJsonGrid(obj, jsonGrid);
            existingContainer.appendChild(jsonGrid);
            break;
        case "flat":
            const pre = document.createElement('pre');
            pre.className = 'raw-json';
            pre.textContent = JSON.stringify(obj, null, 2);
            existingContainer.appendChild(pre);
            break;
    }
}

function collapseAll() {
    isExpandedAll = false;
    renderJSON(currentTheme, currentFontFamily);
}

function expandAll() {
    isExpandedAll = true;
    renderJSON(currentTheme, currentFontFamily);
}

function renderNavigation() {
    return `
      <div class="tab-container">
        <button id="json-tab" class="tab-button active">JSON</button>
        <button id="raw-json-tab" class="tab-button">Raw</button>
        <button id="headers-tab" class="tab-button">Headers</button>
      </div>
      <div id="json-view" class="tab-content active">
        <div id="json-filter-container">
        
        <div class="filter-container">
          <div class="header-action-button-container">
            <button id="json-download-button" class="header-button">Save</button>
            <button id="json-copy-button" class="header-button">Copy</button>
            <button id="json-expand-all-button" class="header-button">Expand</button>
            <button id="json-collapse-all-button" class="header-button">Collapse</button>
            <div id="json-view-switch">
              <button id="json-tree-view-button" class="view-button active">Tree</button>
              <button id="json-grid-view-button" class="view-button">Grid</button>
              <button id="json-flat-view-button" class="view-button">Text</button>
            </div>
          </div>
          <div class="search-filter-container">
            <select id="filter-type-select">
              <option value="keyvalue">Key:Value</option>
              <option value="regex">Regex</option>
              <option value="jsonpath">JSONPath</option>
            </select>
            <input type="text" id="json-filter-input" placeholder="Filter JSON">
            </div>
            <button id="json-filter-help-button" class="header-button" style="margin: 0 10px;padding: 0">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-help-circle"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </button>
          </div>
        </div>
        <div id="json-container"></div>
      </div>
      <div id="raw-json-view" class="tab-content">
        <div class="scroll-wrapper">
          <pre class="raw-json">${originalContent}</pre>
        </div>
      </div>
      <div id="headers-view" class="tab-content">
        <div class="scroll-wrapper">
          <div id="headers-container"></div>
        </div>
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
    document.getElementById('raw-json-tab').addEventListener('click', () => switchTab('raw-json'));
    document.getElementById('headers-tab').addEventListener('click', () => switchTab('headers'));

    document.getElementById('json-tree-view-button').addEventListener('click', () => switchView("tree"));
    document.getElementById('json-flat-view-button').addEventListener('click', () => switchView("flat"));
    document.getElementById('json-grid-view-button').addEventListener('click', () => switchView("grid"));

    document.getElementById('json-copy-button').addEventListener('click', copyJSON);
    document.getElementById('json-download-button').addEventListener('click', () => exportJson(jsonObj));
    document.getElementById('json-filter-help-button').addEventListener('click', showFilterHelp);
    document.getElementById('json-expand-all-button').addEventListener('click', expandAll);
    document.getElementById('json-collapse-all-button').addEventListener('click', collapseAll); // New event
    document.getElementById('json-filter-input').addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
            performFilter();
        }
    });
}

function switchView(viewName) {
    jsonViewType = viewName;
    console.log("Switching view to", viewName);

    document.querySelectorAll('.view-button')
        .forEach(button => button.classList.remove('active'));
    document.getElementById(`json-${viewName}-view-button`).classList.add('active');
    renderJSON(currentTheme, currentFontFamily);
}


function switchTab(tabName) {
    document.querySelectorAll('.tab-button').forEach(button => button.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`${tabName}-tab`).classList.add('active');
    document.getElementById(`${tabName}-view`).classList.add('active');
}


function renderHeaders() {
    const headerTab = document.getElementById('headers-tab'); // Assuming the header tab has an ID of 'header-tab'
    console.log('Rendering headers', currentHeaders);

    if (!currentHeaders ||
        (!currentHeaders.request || currentHeaders.request.length === 0) &&
        (!currentHeaders.response || currentHeaders.response.length === 0)) {
        // Hide the header tab
        headerTab.style.display = 'none';
        return;
    }

    headerTab.style.display = 'inline-block';
    const headersContainer = document.getElementById('headers-container');
    if (currentHeaders && currentHeaders.request && currentHeaders.response) {
        let headersHTML = '<h3 class="headerGroup">Response Headers</h3>';
        headersHTML += '<table>';
        headersHTML += '<tbody>';
        currentHeaders.response.forEach(header => {
            headersHTML += `
                <tr>
                    <td class="headerParamName">${header.name}</td>
                    <td class="headerParamValue">${header.value}</td>
                </tr>
            `;
        });
        headersHTML += '</tbody></table>';
        headersHTML += '<h3 class="headerGroup">Request Headers</h3>';
        headersHTML += '<table>';
        headersHTML += '<tbody>';
        currentHeaders.request.forEach(header => {
            headersHTML += `
                <tr>
                    <td class="headerParamName">${header.name}</td>
                    <td class="headerParamValue">${header.value}</td>
                </tr>
            `;
        });
        headersHTML += '</tbody></table>';
        headersContainer.innerHTML = headersHTML;
    }
}

function performFilter() {
    filterExpression = document.getElementById('json-filter-input').value;
    if (filterExpression === '') {
        clearFilter();
        return; // No need to filter
    }

    filterType = document.getElementById('filter-type-select').value;
    filteredJsonObj = filterJsonObject(jsonObj, filterExpression.toLowerCase());
    if (!Array.isArray(filteredJsonObj)) {
        filteredJsonObj = [filteredJsonObj];
    }

    filteredJsonObj = filteredJsonObj.filter(item => item != null);
    if (filteredJsonObj.length === 0) {
        alert('No results found for this filter expression.');
        return;
    }
    renderJSON(currentTheme, currentFontFamily);
}


function clearFilter() {
    document.getElementById('json-filter-input').value = '';
    filterExpression = '';
    filteredJsonObj = null;
    renderJSON(currentTheme, currentFontFamily);
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
        renderJSON(currentTheme, currentFontFamily);
    }

    if (request.action === "updateHeaders") {
        currentHeaders = request.headers;
        console.log('Headers updated', currentHeaders);
        renderHeaders();
        sendResponse({status: "Headers updated successfully"});
    }
    return true; // Indicates that sendResponse will be called asynchronously
});


function createJsonGrid(jsonData, container) {
    container.innerHTML = ''; // Clear the container
    if (Array.isArray(jsonData)) {
        createArrayGrid(jsonData, container);
    } else if (typeof jsonData === 'object' && jsonData !== null) {
        createObjectGrid(jsonData, container);
    } else {
        container.textContent = JSON.stringify(jsonData);
    }
}

function createArrayGrid(jsonArray, container) {
    const table = document.createElement('table');
    table.className = 'json-grid';

    // Create header row
    const headerRow = table.insertRow();
    for (const key in jsonArray[0]) {
        const th = document.createElement('th');
        th.textContent = key;
        headerRow.appendChild(th);
    }

    // Create data rows
    jsonArray.forEach(item => {
        const row = table.insertRow();
        for (const key in item) {
            const cell = row.insertCell();
            renderCell(cell, key, item[key]);
        }
    });

    container.appendChild(table);
}

function createObjectGrid(jsonObject, container) {
    const table = document.createElement('table');
    table.className = 'json-grid';

    // Create header row
    const headerRow = table.insertRow();
    const keyHeader = document.createElement('th');
    keyHeader.textContent = 'Key';
    const valueHeader = document.createElement('th');
    valueHeader.textContent = 'Value';
    headerRow.appendChild(keyHeader);
    headerRow.appendChild(valueHeader);

    // Create data rows
    for (const key in jsonObject) {
        const row = table.insertRow();
        const keyCell = row.insertCell();
        keyCell.textContent = key;
        const valueCell = row.insertCell();
        renderCell(valueCell, key, jsonObject[key]);
    }

    container.appendChild(table);
}

function renderCell(cell, key, value) {
    if (Array.isArray(value)) {
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '►';
        toggleBtn.className = 'toggle-btn';
        toggleBtn.classList.remove('rotated');

        const keySpan = document.createElement('span');
        keySpan.textContent = `${key} (${value.length} items)`;
        keySpan.className = 'key-span';

        const container = document.createElement('div');
        container.className = 'expandable-container';
        container.appendChild(toggleBtn);
        container.appendChild(keySpan);

        cell.appendChild(container);

        if (value.every(item => typeof item !== 'object')) {
            toggleBtn.onclick = () => togglePrimitiveArray(cell, value, toggleBtn);
        } else {
            toggleBtn.onclick = () => toggleNestedObject(cell, value, toggleBtn);
        }
    } else if (typeof value === 'object' && value !== null) {
        const toggleBtn = document.createElement('button');
        toggleBtn.textContent = '►';
        toggleBtn.className = 'toggle-btn';
        toggleBtn.classList.remove('rotated');

        const keySpan = document.createElement('span');
        keySpan.textContent = key;
        keySpan.className = 'key-span';

        const container = document.createElement('div');
        container.className = 'expandable-container';
        container.appendChild(toggleBtn);
        container.appendChild(keySpan);

        cell.appendChild(container);

        toggleBtn.onclick = () => toggleNestedObject(cell, value, toggleBtn);
    } else {
        const valueSpan = document.createElement('span');
        valueSpan.textContent = value;
        valueSpan.className = 'value-span';
        cell.appendChild(valueSpan);
    }
}



function togglePrimitiveArray(cell, data, toggleBtn) {
    const existingContent = cell.querySelector('.primitive-array-content');

    if (existingContent) {
        existingContent.remove();
        toggleBtn.textContent = '►';
        toggleBtn.classList.remove('rotated');
    } else {
        const contentDiv = document.createElement('div');
        contentDiv.className = 'primitive-array-content';
        contentDiv.textContent = JSON.stringify(data);
        cell.appendChild(contentDiv);
        toggleBtn.classList.add('rotated');
    }
}

function toggleNestedObject(cell, data, toggleBtn) {
    const container = cell.querySelector('.expandable-container');
    const existingContent = cell.querySelector('.nested-grid');

    if (existingContent) {
        existingContent.remove();
        toggleBtn.textContent = '►';
        toggleBtn.classList.remove('rotated');
    } else {
        const nestedContainer = document.createElement('div');
        nestedContainer.className = 'nested-grid';
        createJsonGrid(data, nestedContainer);
        cell.appendChild(nestedContainer);
        toggleBtn.classList.add('rotated');
    }
}

init();
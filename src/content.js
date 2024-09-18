let currentTheme = 'dark';
let currentFontFamily = 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace';
let jsonObj = null;
let originalContent = null;
let isFlatView = false;
let isExpandedAll = false;
let filteredJsonObj = null;

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
        (document.contentType === 'text/plain' && isJSONString(document.body.firstChild.textContent))) {
        originalContent = document.body.firstChild.textContent;
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
    <button id="json-export-csv-button">Export CSV</button>
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
    document.getElementById('json-export-csv-button').addEventListener('click', exportFilteredToCSV);
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

function getFilenameFromUrl(url) {
    try {
        const urlObj = new URL(url);
        let filename = urlObj.pathname.split('/').pop() || urlObj.hostname;

        // Remove file extension if present
        filename = filename.split('.').slice(0, -1).join('.') || filename;

        // Remove any special characters that are invalid in filenames
        filename = filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();

        // Ensure the filename isn't empty and add a default if it is
        return filename || 'json_data';
    } catch (error) {
        console.error('Error parsing URL:', error);
        return 'json_data';
    }
}

function exportFilteredToCSV() {
    if (filteredJsonObj) {
        exportToCSV(filteredJsonObj, '_filtered');
    } else {
        exportToCSV(jsonObj);
    }
}

function exportToCSV(data, filenamePrefix = '') {
    let items = Array.isArray(data) ? data[0] : [data];
    const blob = new Blob([jsonToCsv(items)], { type: 'text/csv;charset=utf-8;' });
    const pageUrl = window.location.href;
    const baseFilename = getFilenameFromUrl(pageUrl);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${baseFilename}${filenamePrefix}_${timestamp}.csv`;
    saveFile(blob, filename);
}

function saveFile(blob, filename) {
    if (window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveOrOpenBlob(blob, filename);
    } else {
        const a = document.createElement('a');
        document.body.appendChild(a);
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = filename;
        a.click();
        setTimeout(() => {
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        }, 0)
    }
}

function exportToCSV2(data, filename = 'export.csv') {
    let items = Array.isArray(data) ? data[0] : [data];

    const blob = new Blob([jsonToCsv(items)], { type: 'text/csv;charset=utf-8;' });
    if (navigator.msSaveBlob) {
        navigator.msSaveBlob(blob, filename);
    } else {
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }
}

function jsonToCsv(jsonData) {
    let headers = new Set();
    let rows = [];

    // Helper function to sanitize multi-line strings
    function sanitizeString(value) {
        if (typeof value === 'string') {
            return value.replace(/[\n\r]+/g, ' ').replace(/"/g, '""');
        } else if (Array.isArray(value)) {
            return value.join('; ');  // Join array elements with semicolon or any other separator
        } else if (typeof value === 'object') {
            return JSON.stringify(value);
        }
        return value;
    }

    // Recursive function to flatten nested JSON objects
    function flattenObject(obj, parentKey = '') {
        let flatObject = {};

        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                let fullKey = parentKey ? `${parentKey}.${key}` : key;

                // If the value is an object, recurse, otherwise add the value
                if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                    Object.assign(flatObject, flattenObject(obj[key], fullKey));
                } else {
                    flatObject[fullKey] = sanitizeString(obj[key]);
                    headers.add(fullKey);  // Collect headers dynamically
                }
            }
        }

        return flatObject;
    }

    // Handle both array of objects or single object
    let jsonArray = Array.isArray(jsonData) ? jsonData : [jsonData];

    // Flatten each object and store the result in rows
    jsonArray.forEach((item) => {
        rows.push(flattenObject(item));
    });

    // Convert headers Set to Array
    let headerArray = Array.from(headers);

    // Create CSV string with headers and rows
    let csv = headerArray.join(',') + '\n';

    rows.forEach(row => {
        let rowArray = headerArray.map(header => {
            // Ensure that each row has a value for each header (undefined if missing)
            return row[header] !== undefined ? `"${row[header]}"` : '';
        });
        csv += rowArray.join(',') + '\n';
    });

    return csv;
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

function showToast(message, duration = 3000) {
    // Remove existing toast if any
    const existingToast = document.getElementById('json-formatter-toast');
    if (existingToast) {
        existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'json-formatter-toast';
    toast.innerHTML = `
    ${message}
    <button class="toast-close">&times;</button>
  `;

    // Add toast to the page
    document.body.appendChild(toast);

    // Add click event to close button
    const closeButton = toast.querySelector('.toast-close');
    closeButton.addEventListener('click', () => {
        toast.remove();
    });

    // Auto dismiss
    setTimeout(() => {
        toast.remove();
    }, duration);
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


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    console.log("Received message from popup.js:", request);

    // Listen for settings update messages
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
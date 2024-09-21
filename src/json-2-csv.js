window.jsonToCsv = function(jsonData) {
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
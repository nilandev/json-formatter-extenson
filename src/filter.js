window.filterJsonObject = function(jsonObj, filterExpression) {

  function filterByKeyValue(obj, filter) {
    const [key, value] = filter.split(':').map(part => part.trim());

    function filterObject(item) {
      if (item == null) {
        return null;
      }
      if (Array.isArray(item)) {
        return item.map(filterObject).filter(i => i != null);
      }
      if (typeof item === 'object') {
        if (key in item && item[key].toString() === value) {
          return item; // Return the entire object if there's a match
        }
        const filtered = Object.entries(item).reduce((acc, [k, v]) => {
          if (v != null && typeof v === 'object') {
            const result = filterObject(v);
            if (result != null) {
              acc[k] = result;
            }
          }
          return acc;
        }, {});
        return Object.keys(filtered).length > 0 ? filtered : null;
      }
      return null;
    }

    const result = filterObject(obj);
    return Array.isArray(result) ? result.filter(item => item != null) : (result ? [result] : []);
  }

  function filterByRegex(obj, regex) {
    const re = new RegExp(regex);

    function filterObject(item) {
      if (item == null) {
        return null;
      }
      if (Array.isArray(item)) {
        return item.map(filterObject).filter(i => i != null);
      }
      if (typeof item === 'object') {
        if (Object.entries(item).some(([k, v]) => re.test(k) || (typeof v === 'string' && re.test(v)))) {
          return item; // Return the entire object if there's a match
        }
        const filtered = Object.entries(item).reduce((acc, [k, v]) => {
          if (v != null && typeof v === 'object') {
            const result = filterObject(v);
            if (result != null) {
              acc[k] = result;
            }
          }
          return acc;
        }, {});
        return Object.keys(filtered).length > 0 ? filtered : null;
      }
      return null;
    }

    const result = filterObject(obj);
    return Array.isArray(result) ? result.filter(item => item != null) : (result ? [result] : []);
  }

  console.log(`Attempting to filter with ${filterType} expression:`, filterExpression);
  let filteredJsonObj;
  try {
    switch (filterType) {
      case 'jsonpath':
        filteredJsonObj = JSONPath.JSONPath({path: filterExpression, json: jsonObj});
        break;
      case 'keyvalue':
        filteredJsonObj = filterByKeyValue(jsonObj, filterExpression);
        break;
      case 'regex':
        filteredJsonObj = filterByRegex(jsonObj, filterExpression);
        break;
    }
    console.log('Filtered result:', filteredJsonObj);

    if (!Array.isArray(filteredJsonObj)) {
      filteredJsonObj = [filteredJsonObj];
    }

    filteredJsonObj = filteredJsonObj.filter(item => item != null);
    return filteredJsonObj;
  } catch (error) {
    console.error('Filtering error:', error);
    alert(`Error applying filter: ${error.message}. Please check your syntax and try again.`);
  }
}
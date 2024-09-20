window.exportToCSV = function (data, filenamePrefix = '') {

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

  let items = Array.isArray(data) ? data[0] : [data];
  const blob = new Blob([jsonToCsv(items)], {type: 'text/csv;charset=utf-8;'});
  const pageUrl = window.location.href;
  const baseFilename = getFilenameFromUrl(pageUrl);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${baseFilename}${filenamePrefix}_${timestamp}.csv`;
  saveFile(blob, filename);

}
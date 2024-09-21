window.showToast = function(message, duration = 3000) {
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
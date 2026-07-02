export function createToast(root) {
  function show(message, type = 'info') {
    const item = document.createElement('div');
    item.className = `toast ${type}`;
    item.textContent = message;
    root.appendChild(item);

    setTimeout(() => {
      item.remove();
    }, 3600);
  }

  return {
    info: message => show(message, 'info'),
    success: message => show(message, 'success'),
    error: message => show(message, 'error'),
    warn: message => show(message, 'warn')
  };
}

(() => {
  'use strict';
  const script = document.createElement('script');
  script.src = 'app-v2.js?v=1';
  script.onerror = () => {
    const stack = document.getElementById('toastStack');
    if (!stack) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<b>Не удалось загрузить V2</b><small>Обнови страницу ещё раз.</small>';
    stack.append(toast);
  };
  document.body.append(script);
})();

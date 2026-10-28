/* ==========================================
   THEME MANAGER
   ========================================== */
const ThemeManager = (() => {
  const root = document.documentElement;
  const toggleBtn = document.getElementById('theme-toggle');
  const STORAGE_KEY = 'gamehub-theme';

  let current = localStorage.getItem(STORAGE_KEY) || 'dark';

  function apply(theme) {
    current = theme;
    root.setAttribute('data-theme', theme);
    toggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem(STORAGE_KEY, theme);
  }

  toggleBtn.addEventListener('click', () => {
    apply(current === 'dark' ? 'light' : 'dark');
  });

  apply(current);

  return { getCurrent: () => current, apply };
})();

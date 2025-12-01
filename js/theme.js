export function initThemeToggle(btn, settings) {
  const apply = (mode) => {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(mode === 'light' ? 'theme-light' : 'theme-dark');
    settings.set('theme', mode);
  };
  const saved = settings.get('theme', 'dark');
  apply(saved);
  if (btn) {
    btn.addEventListener('click', () => {
      const current = settings.get('theme', 'dark');
      apply(current === 'dark' ? 'light' : 'dark');
    });
  }
}

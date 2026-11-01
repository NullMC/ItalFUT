// Applies the saved/OS theme before first paint (external file so the CSP needs no 'unsafe-inline' script).
(function () {
  var theme = 'dark';
  try {
    var saved = localStorage.getItem('italfut-appearance');
    theme = saved === 'dark' || saved === 'light' ? saved : (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch (e) { /* storage unavailable */ }
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
})();

// Переключатель тем
var themeSelect = document.getElementById('theme-select');
var themeLink = document.getElementById('theme-link');

themeSelect.addEventListener('change', function() {
  if (themeSelect.value === 'dark') {
    themeLink.href = 'dark-style.css';
  } else {
    themeLink.href = 'style.css';
  }
});

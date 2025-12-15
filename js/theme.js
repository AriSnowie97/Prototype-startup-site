// ===================================================================
// ===== 1. ПЕРЕМИКАЧ ТЕМ (ОНОВЛЕНО: Кнопка в хедері) =====
// ===================================================================

export function initTheme() {
    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    const themeLink = document.getElementById("theme-link");
    const themeSelect = document.getElementById("theme-select"); // Для developmode.html

    // Файли тем
    const LIGHT_THEME = "style.css";
    const DARK_THEME = "dark-style.css";

    // 1. Завантаження збереженої теми
    let currentTheme = localStorage.getItem("themeFile") || LIGHT_THEME;
    
    if (themeLink) {
        themeLink.href = currentTheme;
    }
    updateThemeIcon(currentTheme);

    // Якщо ми на сторінці розробника і там є селект
    if (themeSelect) {
        themeSelect.value = currentTheme;
        themeSelect.addEventListener("change", () => {
             currentTheme = themeSelect.value;
             applyTheme(currentTheme);
        });
    }

    // 2. Обробка кліку по кнопці
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
        // Міняємо тему на протилежну
        if (currentTheme === LIGHT_THEME) {
            currentTheme = DARK_THEME;
        } else {
            currentTheme = LIGHT_THEME;
        }
        applyTheme(currentTheme);
        });
    }

    function applyTheme(themeName) {
        if (themeLink) themeLink.href = themeName;
        localStorage.setItem("themeFile", themeName);
        updateThemeIcon(themeName);
    }

    // Функція для зміни іконки (Сонце/Місяць)
    function updateThemeIcon(themeFileName) {
        if (!themeToggleBtn) return;
        
        if (themeFileName === DARK_THEME) {
            themeToggleBtn.textContent = "🌙"; // Іконка для темної теми
            themeToggleBtn.style.background = "rgba(0,0,0,0.5)"; 
        } else {
            themeToggleBtn.textContent = "☀️"; // Іконка для світлої теми
            themeToggleBtn.style.background = "rgba(255,255,255,0.5)"; 
        }
    }
}
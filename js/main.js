// ==========================================================
//           MAIN.JS (Головний файл, збірка модулів)
// ==========================================================
import { backendUrl, tg } from './config.js';
import { sendApiRequest } from './api.js';
import { initTheme } from './theme.js';
import { initAuth } from './auth.js';
import { initWeather } from './weather.js';
import { initTimer } from './timer.js';
import { initCalendar } from './calendar.js';
import { initTasks } from './tasks.js';

document.addEventListener("DOMContentLoaded", () => {
    // 1. Ініціалізація базових модулів
    initTheme();
    initAuth();
    initWeather();
    initTimer();

    // 2. Ініціалізація складних модулів (послідовність може мати значення)
    initCalendar();
    initTasks();

    // ==========================================================
    // ===== ЛОГІКА РЕЖИМУ РОЗРОБНИКА ТА ТЕСТУВАННЯ =====
    // ==========================================================
    
    // --- 1. Кнопка "Увімкнути" (яка є на index.html) ---
    const devModeBtn = document.getElementById("dev-mode-btn");
    if (devModeBtn) {
        devModeBtn.addEventListener("click", () => {
        const currentBackendUrl = backendUrl;
        let devPageUrl = "developmode.html";

        if (currentBackendUrl) {
            devPageUrl = `developmode.html?backendUrl=${encodeURIComponent(
            currentBackendUrl
            )}`;
        }
        window.location.href = devPageUrl;
        });
    }

    // --- 2. Кнопка "Вимкнути" (яка є на developmode.html) ---
    const exitDevModeBtn = document.getElementById("exit-dev-mode-btn");
    if (exitDevModeBtn) {
        exitDevModeBtn.addEventListener("click", () => {
        const currentBackendUrl = backendUrl;
        let indexPageUrl = "index.html";

        if (currentBackendUrl) {
            indexPageUrl = `index.html?backendUrl=${encodeURIComponent(
            currentBackendUrl
            )}`;
        }
        window.location.href = indexPageUrl;
        });
    }

    // --- Тестування Flask (для сторінки розробника) ---
    const testFlaskBtn = document.getElementById("test-flask-btn");
    const flaskStatus = document.getElementById("flask-status");

    if (testFlaskBtn && flaskStatus) {
        if (!backendUrl) {
        testFlaskBtn.disabled = true;
        flaskStatus.textContent =
            "❌ Помилка: Відкрийте додаток через кнопку в боті.";
        flaskStatus.style.color = "red";
        } else {
        testFlaskBtn.disabled = false;
        testFlaskBtn.addEventListener("click", () => {
            const payload = {
            message: "Це тестове повідомлення з сайту GitHub Pages!",
            };
            sendApiRequest(
            "/send_message",
            payload,
            flaskStatus,
            "Повідомлення надіслано!"
            );
        });
        }
    }
});
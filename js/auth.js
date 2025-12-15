// ==========================================================
//           AUTH.JS (Логіка входу, профілю, polling)
// ==========================================================
import { backendUrl, tg } from './config.js';
import { sendApiRequest } from './api.js';

const userNameDisplay = document.getElementById("user-name-display");
const userIdDisplay = document.getElementById("user-id-display");
const logoutBtn = document.getElementById("logout-btn");

// Оновлена функція завантаження профілю
export async function loadUserProfile() {
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) return false;

    if (userIdDisplay) userIdDisplay.textContent = `ID: ${userId}`;

    try {
        const response = await fetch(`${backendUrl}/api/get_profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: userId })
        });
        
        const result = await response.json();

        if (result.status === "success" && result.email) {
            if (userNameDisplay) userNameDisplay.textContent = result.email;
            // Колір тепер керується через CSS
            return true; 
        } else {
            if (userNameDisplay && !userNameDisplay.textContent.includes("@")) {
                userNameDisplay.textContent = "Google не підключено";
            }
            return false; 
        }
    } catch (error) {
        console.error("Не вдалося завантажити профіль:", error);
        return false;
    }
}

// === ЛОГІКА АВТОМАТИЧНОЇ СИНХРОНІЗАЦІЇ (POLLING) ===
let loginPollInterval = null;
let pollAttempts = 0;          // Лічильник спроб
const MAX_POLL_ATTEMPTS = 150; // Ліміт (150 * 4с = 600с = 10 хвилин)

export function startLoginPolling() {
    // Якщо опитування вже йде, не запускаємо друге
    if (loginPollInterval) return;

    pollAttempts = 0; // Скидаємо лічильник
    console.log("⏳ Починаю перевірку статусу входу...");
    
    // Кожні 4 секунди питаємо сервер
    loginPollInterval = setInterval(async () => {
      pollAttempts++; // Збільшуємо лічильник

      // 1. Перевірка ліміту
      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          console.warn("⚠️ Час очікування входу вичерпано. Зупиняю опитування.");
          clearInterval(loginPollInterval);
          loginPollInterval = null;
          
          // Можна змінити текст на сторінці
          const calendarGrid = document.getElementById("calendar-grid");
          if (calendarGrid) {
             const hintText = calendarGrid.querySelector("p[style*='opacity: 0.7']");
             if (hintText) {
                 hintText.textContent = "Час вийшов. Оновіть сторінку вручну.";
                 hintText.style.color = "red";
             }
          }
          return;
      }

      // 2. Сама перевірка
      const isLoggedIn = await loadUserProfile();
      
      if (isLoggedIn) {
        console.log("✅ Вхід виявлено! Перезавантажую сторінку...");
        clearInterval(loginPollInterval); // Зупиняємо таймер
        window.location.reload(); 
      }
    }, 4000); 
}

export function initAuth() {
    // Викликаємо цю функцію при старті
    if (tg.initDataUnsafe?.user) {
        loadUserProfile();
    }

    // =====================================================================
    // ЛОГІКА ВИХОДУ
    // =====================================================================
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
          
          if (confirm("Ви дійсно хочете вийти? Це відключить синхронізацію з Google Calendar.")) {
            
            const userId = tg.initDataUnsafe?.user?.id;
            
            // const originalText = logoutBtn.textContent;
            logoutBtn.textContent = "⏳ Вихід...";
            logoutBtn.disabled = true;
    
            try {
                await sendApiRequest("/api/logout", { chat_id: userId }, null, "Вихід успішний");
            } catch (error) {
                console.error("Помилка при виході:", error);
            }
    
            tg.close();
          }
        });
    }
}
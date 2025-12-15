// ==========================================================
//           API.JS (Функції запитів до сервера)
// ==========================================================
import { backendUrl, tg } from './config.js';

/**
 * ✅ ГОЛОВНА ФУНКЦІЯ для відправки будь-яких запитів на бекенд.
 */
export async function sendApiRequest(endpoint, payload, statusElement, successMessage) {
    if (!backendUrl) {
      if (statusElement) {
        statusElement.textContent = "❌ Помилка: URL бекенду не знайдено.";
        statusElement.style.color = "red";
      }
      return;
    }

    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
      const errorMsg = "❌ Помилка: Немає User ID! Відкрийте через Телеграм.";
      console.error(errorMsg);

      if (statusElement) {
        statusElement.textContent = errorMsg;
        statusElement.style.color = "red";
      } else {
        // alert(errorMsg); // Можна розкоментувати, якщо треба
      }
      return;
    }

    if (statusElement) {
      statusElement.textContent = "Обробка запиту...";
      statusElement.style.color = "orange";
    }

    try {
      const apiUrl = `${backendUrl}${endpoint}`;
      const body = { ...payload, userId };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        if (statusElement) {
          statusElement.textContent = `✅ ${successMessage}`;
          statusElement.style.color = "green";
        }
      } else {
        throw new Error(result.message || "Невідома помилка сервера");
      }
    } catch (error) {
      console.error(`API Request Error to ${endpoint}:`, error);
      if (statusElement) {
        statusElement.textContent = `❌ Помилка: ${error.message}`;
        statusElement.style.color = "red";
      }
      throw error; 
    }
}

/**
 * ✅ НОВА ФУНКЦІЯ для запитів, що повертають дані.
 */
export async function fetchApi(endpoint, payload) {
    if (!backendUrl) {
      throw new Error("URL бекенду не знайдено.");
    }
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
      throw new Error("Не вдалося отримати ID користувача.");
    }

    const apiUrl = `${backendUrl}${endpoint}`;
    const body = { ...payload, userId };

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (response.ok && result.status === "success") {
      return result; 
    } else {
      throw new Error(result.message || "Невідома помилка сервера");
    }
}
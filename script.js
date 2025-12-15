// ==========================================================
//           ПОВНИЙ SCRIPT.JS (v10, Google Calendar Sync)
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // ===== Отримання та збереження backendUrl =====
  const backendUrl =
    "https://notificationtgbotheavyapikitchen-production.up.railway.app/";

  // ===================================================================
  // ===== 1. ПЕРЕМИКАЧ ТЕМ (з localStorage) =====
  // ===================================================================
  const themeSelect = document.getElementById("theme-select");
  const themeLink = document.getElementById("theme-link");

  const savedThemeFile = localStorage.getItem("themeFile") || "style.css";

  if (themeLink) {
    themeLink.href = savedThemeFile;
  }
  if (themeSelect) {
    themeSelect.value = savedThemeFile;
  }

  if (themeSelect) {
    themeSelect.addEventListener("change", function () {
      const selectedThemeFile = this.value;
      if (themeLink) {
        themeLink.href = selectedThemeFile;
        localStorage.setItem("themeFile", selectedThemeFile);
      }
    });
  }
  // ===================================================================
  // ===== КІНЕЦЬ ЛОГІКИ ПЕРЕМИКАЧА ТЕМ =====
  // ===================================================================

  // ===== Інтеграція з Telegram Web App =====
  const tg = window.Telegram.WebApp;
  tg.ready();

  const userNameDisplay = document.getElementById("user-name-display");
  const userIdDisplay = document.getElementById("user-id-display");

  // Оновлена функція завантаження профілю
  async function loadUserProfile() {
      const userId = tg.initDataUnsafe?.user?.id;
      if (!userId) return false;

      userIdDisplay.textContent = `ID: ${userId}`;

      try {
          const response = await fetch(`${backendUrl}/api/get_profile`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: userId })
          });
          
          const result = await response.json();

          if (result.status === "success" && result.email) {
              userNameDisplay.textContent = result.email;
              userNameDisplay.style.color = "#4285F4"; 
              return true; // <--- ВАЖЛИВО: Повертаємо true, якщо вхід успішний
          } else {
              if (!userNameDisplay.textContent.includes("@")) {
                  userNameDisplay.textContent = "Google не підключено";
              }
              return false; // <--- Повертаємо false, якщо не залогінені
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

  function startLoginPolling() {
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
          
          // Можна (необов'язково) змінити текст на сторінці, щоб юзер знав
          const calendarGrid = document.getElementById("calendar-grid");
          if (calendarGrid) {
             // Шукаємо наш текст підказки і міняємо його
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

  // Викликаємо цю функцію при старті
  if (tg.initDataUnsafe?.user) {
      loadUserProfile();
  }

  // ===== Обробка переходу в/з режиму розробника =====

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

  // --- Отримуємо елементи для відображення статусу ---
  const testFlaskBtn = document.getElementById("test-flask-btn");
  const flaskStatus = document.getElementById("flask-status");

  const addTaskViaFlaskButton = document.getElementById("add-task-btn");
  const addTaskStatus = document.getElementById("add-task-status");

  /**
   * ✅ ГОЛОВНА ФУНКЦІЯ для відправки будь-яких запитів на бекенд.
   * (ОНОВЛЕНО: тепер безпечно працює, якщо statusElement = null)
   */
  async function sendApiRequest(
    endpoint,
    payload,
    statusElement,
    successMessage
  ) {
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
        // Якщо статусу немає (як у видаленні), кидаємо Alert
        alert(errorMsg);
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

      // АЛЕРТ ВИМКНЕНО
      // tg.showAlert(alertMessage);

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
      throw error; // Прокидаємо помилку далі
    }
  }

  // (Логіка кнопок режиму розробника...)
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

  /**
   * ✅ НОВА ФУНКЦІЯ для запитів, що повертають дані.
   * Очікує, що бекенд поверне { status: 'success', data: [...] } або { status: 'success', events: [...] }
   */
  async function fetchApi(endpoint, payload) {
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
      // Бекенд може повертати 'data' або 'events' або просто поля
      return result; 
    } else {
      throw new Error(result.message || "Невідома помилка сервера");
    }
  }

  // (Логіка кнопки Google Calendar "Додати завдання" - та що під календарем)
  if (addTaskViaFlaskButton && addTaskStatus) {
    if (!backendUrl) {
      addTaskViaFlaskButton.disabled = true;
    } else {
      addTaskViaFlaskButton.disabled = false;
      addTaskViaFlaskButton.addEventListener("click", () => {
        const taskText = prompt(
          "Введіть назву завдання для додавання в Google Calendar:",
          "Лабораторна з програмування"
        );

        if (!taskText || taskText.trim() === "") {
          return;
        }

        const payload = {
          text: taskText.trim(),
        };
        sendApiRequest(
          "/add_task",
          payload,
          addTaskStatus,
          "Завдання успішно додано!"
        );
      });
    }
  }

  // ==================================================
  //          ЛОГІКА: ПОГОДА (ОНОВЛЕНО)
  // ==================================================
  const weatherInput = document.getElementById("weather-input");
  const weatherBtn = document.getElementById("weather-btn");
  const weatherResultDiv = document.getElementById("weather-result");

  // === НОВИЙ КОД: Авто-завантаження погоди при старті ===
  // (Функція fetchWeather "спливає" (hoisted), тому ми можемо її тут викликати)
  const savedCity = localStorage.getItem("savedCity");
  if (savedCity && weatherInput) {
    weatherInput.value = savedCity;
    fetchWeather(); // Викликаємо одразу
  }
  // === КІНЕЦЬ НОВОГО КОДУ ===

  if (weatherBtn) {
    weatherBtn.addEventListener("click", fetchWeather);

    // (Для удобства, чтобы Enter тоже работал)
    weatherInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); // Запобігаємо надсиланню форми (якщо вона є)
        fetchWeather();
      }
    });
  }

  async function fetchWeather() {
    const city = weatherInput.value.trim();
    if (!city) {
      weatherResultDiv.innerHTML = "Будь ласка, введіть назву міста.";
      weatherResultDiv.style.color = "red";
      weatherResultDiv.style.display = "block";
      return;
    }

    const userId = tg.initDataUnsafe?.user?.id;
    if (!backendUrl || !userId) {
      weatherResultDiv.innerHTML =
        "❌ Помилка: Не вдалося отримати ID користувача.";
      weatherResultDiv.style.color = "red";
      weatherResultDiv.style.display = "block";
      return;
    }

    weatherResultDiv.innerHTML = "Завантаження...";
    weatherResultDiv.style.color = "orange"; // Цвет из твоих старых стилей
    weatherResultDiv.style.display = "block"; // ПОКАЗУЄМО БЛОК

    const payload = {
      userId: userId,
      city: city,
    };

    try {
      const response = await fetch(`${backendUrl}/get_weather_for_site`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Помилка мережі");
      }

      const result = await response.json();

      if (result.status === "success") {
        weatherResultDiv.innerHTML = result.formatted_weather;
        weatherResultDiv.style.color = ""; // Сбрасываем цвет ошибки

        // === НОВИЙ КОД: Збереження успішного міста ===
        localStorage.setItem("savedCity", city);
        // === КІНЕЦЬ НОВОГО КОДУ ===
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Помилка fetchWeather:", error);
      weatherResultDiv.innerHTML = `❌ Помилка: ${error.message}`;
      weatherResultDiv.style.color = "red";
    }
  }
  // ==================================================
  //          КІНЕЦЬ ЛОГІКИ ПОГОДИ
  // ==================================================

  // ===== Режим концентрації (Таймер Помодоро) =====
  const timerDisplay = document.getElementById("timer-display");
  if (timerDisplay) {
    const startBtn = document.getElementById("start-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const stopBtn = document.getElementById("stop-btn");

    let countdown;
    let timeLeft = 25 * 60;
    let isPaused = true;

    function updateTimerDisplay() {
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      timerDisplay.textContent = `${minutes
        .toString()
        .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    function startTimer() {
      if (isPaused) {
        isPaused = false;
        countdown = setInterval(() => {
          timeLeft--;
          updateTimerDisplay();
          if (timeLeft <= 0) {
            clearInterval(countdown);
            alert("Сесія концентрації завершена!");
          }
        }, 1000);
      }
    }

    function pauseTimer() {
      isPaused = true;
      clearInterval(countdown);
    }

    function stopTimer() {
      isPaused = true;
      clearInterval(countdown);
      timeLeft = 25 * 60;
      updateTimerDisplay();
    }

    startBtn.addEventListener("click", startTimer);
    pauseBtn.addEventListener("click", pauseTimer);
    stopBtn.addEventListener("click", stopTimer);

    updateTimerDisplay();
  }

  // ==================================================
  //          ЛОГІКА КАЛЕНДАРЯ (з часом закінчення)
  // ==================================================
  const monthYearDisplay = document.getElementById("month-year-display");
  if (monthYearDisplay) {
    // 1. Отримуємо елементи
    const calendarGrid = document.getElementById("calendar-grid");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");
    const addEventModalEl = document.getElementById("addEventModal");
    const addEventModal = new bootstrap.Modal(addEventModalEl);
    const saveEventBtn = document.getElementById("save-event-btn");

    // Елементи форми
    const eventTitleInput = document.getElementById("event-title");
    const eventDateInput = document.getElementById("event-date");
    const eventTimeInput = document.getElementById("event-time");
    const eventEndTimeInput = document.getElementById("event-end-time");
    const allDayCheckbox = document.getElementById("all-day-checkbox");

    const calendarStatus = document.getElementById("add-task-status");
    let currentDate = new Date();
    let isEditingMode = false;   // Чи ми зараз редагуємо?
    let editingEventId = null;   // ID події, яку редагуємо

    /**
     * 3. Головна функція рендеру (малювання) календаря
     */
    async function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const monthName = new Date(year, month).toLocaleString("uk-UA", {
        month: "long",
      });
      monthYearDisplay.textContent = `${
        monthName.charAt(0).toUpperCase() + monthName.slice(1)
      } ${year}`;

      // 1. Завантажуємо дати
      const busyDates = await fetchEventDates(year, month + 1);

      // === НОВА ПЕРЕВІРКА ===
      // Якщо повернувся null, значить ми показали кнопку логіну.
      // Зупиняємо функцію, щоб не стерти цю кнопку!
      if (busyDates === null) {
        return;
      }
      // ======================

      calendarGrid.innerHTML = "";

      // --- Магія розрахунку дат ---
      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      let startDayOfWeek = firstDayOfMonth.getDay();
      if (startDayOfWeek === 0) {
        startDayOfWeek = 7;
      }
      const paddingDays = startDayOfWeek - 1;

      const realToday = new Date();
      realToday.setHours(0, 0, 0, 0);

      // --- Малюємо "пусті" комірки ---
      for (let i = 0; i < paddingDays; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("calendar-day", "other-month");
        calendarGrid.appendChild(emptyCell);
      }

      // --- Малюємо комірки для поточного місяця ---
      for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.classList.add("calendar-day");
        dayCell.textContent = day;

        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);

        if (cellDate.getTime() === realToday.getTime()) {
          dayCell.classList.add("today");
        }

        const cellDateISO = `${year}-${String(month + 1).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;
        dayCell.dataset.date = cellDateISO;

        if (busyDates.includes(cellDateISO)) {
          dayCell.classList.add("busy-day");
        }

        dayCell.addEventListener("click", () => {
          openAddEventModal(cellDateISO);
        });

        calendarGrid.appendChild(dayCell);
      }
    }

    /**
     * 4. Функція відкриття модалки (Універсальна: Create або Edit)
     */
    async function openAddEventModal(dateStr, eventData = null) {
      const modalTitle = document.getElementById("addEventModalLabel");
      const saveBtn = document.getElementById("save-event-btn");
      const form = document.getElementById("add-event-form");
      
      form.reset(); // Очищуємо форму
      
      // Видаляємо старий список подій (якщо ми відкриваємо з календаря)
      const oldList = document.getElementById("modal-events-list");
      if (oldList) oldList.remove();

      if (eventData) {
        // === РЕЖИМ РЕДАГУВАННЯ ===
        isEditingMode = true;
        editingEventId = eventData.id;
        
        modalTitle.textContent = "Редагувати подію";
        saveBtn.textContent = "Зберегти зміни";
        
        // Заповнюємо поля
        document.getElementById("event-title").value = eventData.raw_title;
        document.getElementById("event-date").value = dateStr;
        document.getElementById("all-day-checkbox").checked = eventData.is_all_day;

        if (!eventData.is_all_day && eventData.raw_start) {
            // Витягуємо час з ISO рядка (YYYY-MM-DDTHH:MM:SS...)
            const dt = new Date(eventData.raw_start);
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            document.getElementById("event-time").value = `${hh}:${mm}`;
            
            // End time можна вирахувати або залишити пустим (сервіс сам додасть годину)
            document.getElementById("event-time").disabled = false;
            document.getElementById("event-end-time").disabled = false;
        } else {
            document.getElementById("event-time").disabled = true;
            document.getElementById("event-end-time").disabled = true;
        }

      } else {
        // === РЕЖИМ СТВОРЕННЯ ===
        isEditingMode = false;
        editingEventId = null;
        
        modalTitle.textContent = "Додати нову подію";
        saveBtn.textContent = "Зберегти";
        
        document.getElementById("event-date").value = dateStr;
        document.getElementById("event-time").disabled = false;
        document.getElementById("event-end-time").disabled = false;
        
        // Тут (опціонально) можна викликати завантаження списку подій, як було раніше
        // Щоб не перевантажувати код зараз, я це пропущу, але ти можеш залишити свій fetchApi("/api/get_day_events"...)
      }

      addEventModal.show();
    }

    /**
     * Логіка для чекбокса "На весь день"
     */
    allDayCheckbox.addEventListener("change", () => {
      if (allDayCheckbox.checked) {
        eventTimeInput.disabled = true;
        eventEndTimeInput.disabled = true;
        eventTimeInput.value = "";
        eventEndTimeInput.value = "";
      } else {
        eventTimeInput.disabled = false;
        eventEndTimeInput.disabled = false;
      }
    });

    /**
     * 5. Обробники кнопок "вперед/назад"
     */
    prevMonthBtn.addEventListener("click", async () => {
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() - 1);
      await renderCalendar();
    });

    nextMonthBtn.addEventListener("click", async () => {
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() + 1);
      await renderCalendar();
    });

    /**
     * 6. Обробник кнопки "Зберегти" в модалці
     */
    saveEventBtn.addEventListener("click", async () => {
      const title = eventTitleInput.value;
      const date = eventDateInput.value;
      const time = eventTimeInput.value;
      const endTime = eventEndTimeInput.value;
      const isAllDay = allDayCheckbox.checked;

      if (!title || !date) {
        tg.showAlert("Будь ласка, заповніть назву події та дату.");
        return;
      }

      // Базовий payload
      const payload = {
        title: title,
        date: date,
        time: isAllDay ? null : time || null,
        end_time: isAllDay ? null : endTime || null,
        all_day: isAllDay,
      };

      try {
        if (isEditingMode && editingEventId) {
            // === ОНОВЛЕННЯ ===
            payload.eventId = editingEventId;
            await sendApiRequest(
                "/api/update_event_full", // Новий ендпоінт
                payload,
                calendarStatus,
                "Подію оновлено!"
            );
        } else {
            // === СТВОРЕННЯ ===
            await sendApiRequest(
                "/add_event",
                payload,
                calendarStatus,
                "Подію створено!"
            );
        }

        addEventModal.hide();
        
        // Оновлюємо все
        await renderCalendar(); 
        initializeTasks(); // Оновлюємо список "Сьогодні"

      } catch (error) {
        console.error("Помилка збереження:", error);
      }
    });

    /**
     * 7. Функція для завантаження "зайнятих" дат
     */
    async function fetchEventDates(year, month) {
      const userId = tg.initDataUnsafe?.user?.id;
      if (!backendUrl || !userId) {
        console.warn(
          "Не можу завантажити події: відсутній backendUrl або userId."
        );
        return [];
      }

      const payload = {
        userId: userId,
        year: year,
        month: month,
      };

      try {
        const response = await fetch(`${backendUrl}/get_events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        // === ОБРОБКА 401 (ВІДСУТНІЙ ЛОГІН) ===
        if (response.status === 401) {
          const result = await response.json();
          console.warn("Потрібна авторизація Google:", result.login_url);

          const calendarGrid = document.getElementById("calendar-grid");
          if (calendarGrid) {
            calendarGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 30px 10px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                        <p style="margin-bottom: 15px; font-weight: bold;">⚠️ Для перегляду календаря потрібен доступ</p>
                        <button 
                            onclick="Telegram.WebApp.openLink('${result.login_url}')" 
                            class="btn btn-primary" 
                            style="padding: 10px 20px; border-radius: 8px; border: none; color: white; background: #4285F4;">
                            🔐 Увійти через Google
                        </button>
                        <p style="margin-top: 10px; font-size: 0.8em; opacity: 0.7;">
                           Після входу сторінка оновиться автоматично...
                        </p>
                    </div>
                `;
          }
          
          // === ОСЬ ТУТ ЗАПУСКАЄМО ПЕРЕВІРКУ ===
          startLoginPolling(); 
          // =====================================

          return null;
        }
        // =====================================

        if (!response.ok) {
          throw new Error("Помилка мережі при завантаженні подій");
        }

        const result = await response.json();

        if (result.status === "success" && Array.isArray(result.event_dates)) {
          return result.event_dates;
        } else {
          throw new Error(result.message || "Неправильний формат відповіді");
        }
      } catch (error) {
        console.error("Помилка fetchEventDates:", error);
        // Не показуємо алерт на кожен чих, просто в консоль
        return [];
      }
    }

    // 8. Перший запуск
    renderCalendar();
  }
  // ==================================================
  //          КІНЕЦЬ ЛОГІКИ КАЛЕНДАРЯ
  // ==================================================

  // ===================================================================
  // ===== 2. ЗАВДАННЯ ТА АНАЛІТИКА (ОНОВЛЕНО v10: Google Sync) =====
  // ===================================================================

  const taskListContainer = document.querySelector("#tasks ul");
  let tasks = []; // Глобальна змінна для цього блоку
  let initializeTasks; // Оголошуємо заздалегідь, щоб викликати з інших місць

  if (taskListContainer) {
    const progressFill = document.querySelector(".custom-progress-fill");
    const progressText = document.querySelector("#analytics p:last-of-type");
    const addTaskForm = document.getElementById("add-task-form");
    const newTaskInput = document.getElementById("new-task-input");

    // --- 1. Рендер завдань (З кнопками та стилями) ---
    function renderTasks() {
      taskListContainer.innerHTML = "";

      const counterEl = document.getElementById("task-counter");
      if (counterEl) {
        const count = tasks.length;
        // Ліміт Google Calendar інший, але залишимо візуал 100 для краси
        counterEl.textContent = `(${count}/100)`;
        counterEl.style.color = count >= 100 ? "red" : "gray";
      }

      if (tasks.length === 0) {
        taskListContainer.innerHTML =
          "<p style='opacity: 0.7; text-align: center;'>Сьогодні завдань в Google Календарі немає. 😎</p>";
      }

      taskListContainer.style.listStyleType = "none";
      taskListContainer.style.paddingLeft = "0";

      tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.dataset.taskId = task.id; // Це тепер ID Google (стрічка)
        li.classList.add("task-item");

        const contentDiv = document.createElement("div");
        contentDiv.style.display = "flex";
        contentDiv.style.alignItems = "center";
        contentDiv.style.width = "100%";

        // Чекбокс (для Google Events це лише візуально)
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.style.marginRight = "10px";
        checkbox.style.cursor = "pointer";

        // Текст
        const span = document.createElement("span");
        span.textContent = task.text;
        span.style.flexGrow = "1";
        span.style.marginLeft = "5px";
        if (task.done) {
          span.style.textDecoration = "line-through";
          span.style.opacity = "0.6";
        }

        // Блок кнопок (редагування/видалення)
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "task-actions";
        actionsDiv.style.display = "flex";
        actionsDiv.style.gap = "8px";

        // Кнопка Редагувати (✏️)
        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.className = "icon-btn";
        editBtn.title = "Редагувати";
        editBtn.onclick = (e) => {
          e.stopPropagation(); 
          editTask(task.id, task.text);
        };

        // Кнопка Видалити (🗑️)
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "🗑️";
        deleteBtn.className = "icon-btn delete-btn";
        deleteBtn.title = "Видалити";
        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          deleteTask(task.id);
        };

        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(deleteBtn);

        contentDiv.appendChild(checkbox);
        contentDiv.appendChild(span);
        contentDiv.appendChild(actionsDiv);
        li.appendChild(contentDiv);

        // Логіка чекбокса
        checkbox.addEventListener("change", () => {
          const isDone = checkbox.checked;
          const aTask = tasks.find((t) => t.id == task.id);
          if (aTask) aTask.done = isDone;
          renderTasks();
          // Примітка: update_webtask не спрацює для Google ID без оновлення бекенду.
          // Але для візуалу ми це лишаємо.
          console.log("Status changed locally (Google API sync needed for done status)");
        });

        taskListContainer.appendChild(li);
      });
      updateAnalytics();
    }

    // --- Логіка Редагування (ВІДКРИВАЄ МОДАЛКУ) ---
    function editTask(id, text) {
        // Знаходимо повний об'єкт завдання
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        // Визначаємо дату. 
        // В списку "Сьогодні" дата завжди сьогоднішня.
        const d = new Date();
        const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // Відкриваємо модалку в режимі редагування
        openAddEventModal(todayStr, task);
    }

    // --- Логіка Видалення (ОНОВЛЕНО ДЛЯ GOOGLE) ---
    async function deleteTask(id) {
      if (confirm("Видалити цю подію з Google Calendar назавжди?")) {
        // Видаляємо локально
        tasks = tasks.filter((t) => t.id != id);
        renderTasks();

        // Відправляємо запит на Google Calendar API
        await sendApiRequest(
            "/api/delete_event", 
            { eventId: id }, 
            null, 
            "Видалено"
        );
      }
    }

    // --- 2. Оновлення аналітики ---
    function updateAnalytics() {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => task.done).length;
      const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      const textOverlay = document.getElementById("progress-text-overlay");
      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        progressFill.setAttribute("aria-valuenow", percentage);
      }
      if (textOverlay) {
        textOverlay.textContent = `${percentage}%`;
      }
      if (progressText) {
        if (totalTasks === 0) {
          progressText.textContent = "У вас поки немає завдань на сьогодні";
        } else {
          progressText.textContent = `Виконано ${completedTasks} з ${totalTasks} завдань`;
        }
      }
    }

    // --- 3. Додавання завдання (ТЕПЕР В GOOGLE) ---
    if (addTaskForm && newTaskInput) {
      addTaskForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const taskText = newTaskInput.value.trim();
        if (taskText) {
          try {
            // Використовуємо ендпоінт Google Calendar
            await sendApiRequest("/add_task", { text: taskText }, null, "Додано в Google");
            newTaskInput.value = "";
            
            // Перезавантажуємо список, щоб отримати правильний ID від Google
            initializeTasks(); 

          } catch (error) {
            console.error("Помилка додавання завдання:", error);
            tg.showAlert(`Не вдалося додати: ${error.message}`);
          }
        }
      });
    }

    // --- 4. Початкове завантаження (ТЕПЕР З GOOGLE) ---
    initializeTasks = async function() {
      try {
        taskListContainer.innerHTML = "<p>Завантаження подій з Google...</p>";
        
        // Отримуємо сьогоднішню дату YYYY-MM-DD
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        // Викликаємо новий бекенд ендпоінт
        const response = await fetchApi("/api/get_day_events", { date: dateStr });
        
        if (response.events) {
            tasks = response.events.map(ev => ({
                id: ev.id,
                text: `${ev.time !== 'Весь день' ? '[' + ev.time + '] ' : ''}${ev.title}`,
                done: false,
                // === ЗБЕРІГАЄМО СИРІ ДАНІ ДЛЯ РЕДАГУВАННЯ ===
                raw_title: ev.title,
                raw_start: ev.raw_start, // ISO string або YYYY-MM-DD
                is_all_day: ev.is_all_day
            }));
        } else {
            tasks = [];
        }
        
        renderTasks();
      } catch (error) {
        console.error("Помилка завантаження завдань:", error);
        taskListContainer.innerHTML = `<p style="color: red;">❌ Не вдалося синхронізувати з Google.</p>`;
      }
    }

    initializeTasks(); // Запускається одразу при відкритті сторінки
  }

  // =====================================================================
  // ЛОГІКА ВИХОДУ (ОНОВЛЕНО)
  // =====================================================================
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      
      if (confirm("Ви дійсно хочете вийти? Це відключить синхронізацію з Google Calendar.")) {
        
        const userId = tg.initDataUnsafe?.user?.id;
        
        // Змінюємо текст кнопки, щоб видно було процес
        const originalText = logoutBtn.textContent;
        logoutBtn.textContent = "⏳ Вихід...";
        logoutBtn.disabled = true;

        try {
            // Викликаємо Backend, щоб стерти сесію
            // Backend чекає параметр 'chat_id' у /api/logout
            await sendApiRequest("/api/logout", { chat_id: userId }, null, "Вихід успішний");
        } catch (error) {
            console.error("Помилка при виході:", error);
            // Навіть якщо помилка, все одно закриваємо вікно, щоб не блокувати юзера
        }

        // Закриваємо WebApp
        tg.close();
      }
    });
  }
});
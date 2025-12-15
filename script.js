// ==========================================================
//           ПОВНИЙ SCRIPT.JS (v11, Theme Button & Sync)
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // ===== Отримання та збереження backendUrl =====
  const backendUrl =
    "https://notificationtgbotheavyapikitchen-production.up.railway.app/";

  // ===================================================================
  // ===== 1. ПЕРЕМИКАЧ ТЕМ (ОНОВЛЕНО: Кнопка в хедері) =====
  // ===================================================================
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const themeLink = document.getElementById("theme-link");

  // Файли тем
  const LIGHT_THEME = "style.css";
  const DARK_THEME = "dark-style.css";

  // 1. Завантаження збереженої теми
  let currentTheme = localStorage.getItem("themeFile") || LIGHT_THEME;
  
  if (themeLink) {
    themeLink.href = currentTheme;
  }
  updateThemeIcon(currentTheme);

  // 2. Обробка кліку по кнопці
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
      // Міняємо тему на протилежну
      if (currentTheme === LIGHT_THEME) {
        currentTheme = DARK_THEME;
      } else {
        currentTheme = LIGHT_THEME;
      }

      // Застосовуємо
      themeLink.href = currentTheme;
      localStorage.setItem("themeFile", currentTheme);
      updateThemeIcon(currentTheme);
    });
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
              // Колір тепер керується через CSS (id #user-name-display), 
              // тому прибираємо жорсткий стиль, або залишаємо як фолбек
              // userNameDisplay.style.color = "#4285F4"; 
              return true; 
          } else {
              if (!userNameDisplay.textContent.includes("@")) {
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

  // Цю кнопку ми видалили з HTML, але залишаємо змінну, щоб скрипт не ламався
  const addTaskViaFlaskButton = document.getElementById("add-task-btn"); 
  const addTaskStatus = document.getElementById("add-task-status");

  /**
   * ✅ ГОЛОВНА ФУНКЦІЯ для відправки будь-яких запитів на бекенд.
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
      return result; 
    } else {
      throw new Error(result.message || "Невідома помилка сервера");
    }
  }

  // (Ця логіка не спрацює, бо кнопки немає, але перевірка if() захищає від помилок)
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
  //          ЛОГІКА: ПОГОДА
  // ==================================================
  const weatherInput = document.getElementById("weather-input");
  const weatherBtn = document.getElementById("weather-btn");
  const weatherResultDiv = document.getElementById("weather-result");

  // Авто-завантаження погоди при старті
  const savedCity = localStorage.getItem("savedCity");
  if (savedCity && weatherInput) {
    weatherInput.value = savedCity;
    fetchWeather(); 
  }

  if (weatherBtn) {
    weatherBtn.addEventListener("click", fetchWeather);

    // Enter теж працює
    weatherInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault(); 
        fetchWeather();
      }
    });
  }

  async function fetchWeather() {
    const city = weatherInput.value.trim();
    if (!city) {
      if(weatherResultDiv) {
          weatherResultDiv.innerHTML = "Будь ласка, введіть назву міста.";
          weatherResultDiv.style.color = "red";
          weatherResultDiv.style.display = "block";
      }
      return;
    }

    const userId = tg.initDataUnsafe?.user?.id;
    if (!backendUrl || !userId) {
      if(weatherResultDiv) {
          weatherResultDiv.innerHTML = "❌ Помилка: Не вдалося отримати ID користувача.";
          weatherResultDiv.style.color = "red";
          weatherResultDiv.style.display = "block";
      }
      return;
    }

    if(weatherResultDiv) {
        weatherResultDiv.innerHTML = "Завантаження...";
        weatherResultDiv.style.color = "orange"; 
        weatherResultDiv.style.display = "block";
    }

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
        if(weatherResultDiv) {
            weatherResultDiv.innerHTML = result.formatted_weather;
            weatherResultDiv.style.color = ""; 
        }
        localStorage.setItem("savedCity", city);
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("Помилка fetchWeather:", error);
      if(weatherResultDiv) {
          weatherResultDiv.innerHTML = `❌ Помилка: ${error.message}`;
          weatherResultDiv.style.color = "red";
      }
    }
  }

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

    if(startBtn) startBtn.addEventListener("click", startTimer);
    if(pauseBtn) pauseBtn.addEventListener("click", pauseTimer);
    if(stopBtn) stopBtn.addEventListener("click", stopTimer);

    updateTimerDisplay();
  }

  // ==================================================
  //          ЛОГІКА КАЛЕНДАРЯ
  // ==================================================
  const monthYearDisplay = document.getElementById("month-year-display");
  if (monthYearDisplay) {
    const calendarGrid = document.getElementById("calendar-grid");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");
    const addEventModalEl = document.getElementById("addEventModal");
    const addEventModal = new bootstrap.Modal(addEventModalEl);
    const saveEventBtn = document.getElementById("save-event-btn");

    const eventTitleInput = document.getElementById("event-title");
    const eventDateInput = document.getElementById("event-date");
    const eventTimeInput = document.getElementById("event-time");
    const eventEndTimeInput = document.getElementById("event-end-time");
    const allDayCheckbox = document.getElementById("all-day-checkbox");

    const calendarStatus = document.getElementById("add-task-status");
    let currentDate = new Date();

    async function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const monthName = new Date(year, month).toLocaleString("uk-UA", {
        month: "long",
      });
      monthYearDisplay.textContent = `${
        monthName.charAt(0).toUpperCase() + monthName.slice(1)
      } ${year}`;

      const busyDates = await fetchEventDates(year, month + 1);

      if (busyDates === null) {
        return;
      }

      calendarGrid.innerHTML = "";

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

      for (let i = 0; i < paddingDays; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("calendar-day", "other-month");
        calendarGrid.appendChild(emptyCell);
      }

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

    async function openAddEventModal(dateStr) {
      document.getElementById("add-event-form").reset();
      eventDateInput.value = dateStr;

      eventTimeInput.disabled = false;
      eventEndTimeInput.disabled = false;

      const modalBody = document.querySelector("#addEventModal .modal-body");
      const oldList = document.getElementById("modal-events-list");
      if (oldList) oldList.remove();

      const listContainer = document.createElement("div");
      listContainer.id = "modal-events-list";
      listContainer.innerHTML = "<p>⏳ Завантаження подій...</p>";
      listContainer.style.marginBottom = "20px";
      listContainer.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
      listContainer.style.paddingBottom = "15px";

      modalBody.insertBefore(listContainer, document.getElementById("add-event-form"));

      addEventModal.show();
      saveEventBtn.disabled = true;

      try {
          const result = await fetchApi("/api/get_day_events", { date: dateStr });
          
          if (result.status === "success") {
              listContainer.innerHTML = `<h6>Події на ${dateStr}:</h6>`;
              
              if (result.events && result.events.length > 0) {
                  const ul = document.createElement("ul");
                  ul.style.listStyleType = "none";
                  ul.style.padding = "0";

                  result.events.forEach(ev => {
                      const li = document.createElement("li");
                      li.style.background = "rgba(255,255,255,0.1)";
                      li.style.marginBottom = "5px";
                      li.style.padding = "8px";
                      li.style.borderRadius = "8px";
                      li.innerHTML = `<strong>${ev.time || ''}</strong> ${ev.title}`;
                      ul.appendChild(li);
                  });
                  listContainer.appendChild(ul);
              } else {
                  listContainer.innerHTML += "<p style='opacity:0.7'>Подій немає</p>";
              }

              if (result.is_past) {
                  saveEventBtn.disabled = true;
                  saveEventBtn.textContent = "Минулий час";
                  saveEventBtn.classList.remove("btn-primary");
                  saveEventBtn.classList.add("btn-secondary");
                  document.getElementById("event-title").disabled = true;
              } else {
                  saveEventBtn.disabled = false;
                  saveEventBtn.textContent = "Зберегти";
                  saveEventBtn.classList.add("btn-primary");
                  saveEventBtn.classList.remove("btn-secondary");
                  document.getElementById("event-title").disabled = false;
              }
          }
      } catch (e) {
          console.error("Помилка завантаження подій дня:", e);
          listContainer.innerHTML = "<p style='color:red'>Помилка завантаження списку</p>";
          saveEventBtn.disabled = false;
      }
    }

    if(allDayCheckbox) {
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
    }

    if(prevMonthBtn) {
        prevMonthBtn.addEventListener("click", async () => {
          currentDate.setDate(1);
          currentDate.setMonth(currentDate.getMonth() - 1);
          await renderCalendar();
        });
    }

    if(nextMonthBtn) {
        nextMonthBtn.addEventListener("click", async () => {
          currentDate.setDate(1);
          currentDate.setMonth(currentDate.getMonth() + 1);
          await renderCalendar();
        });
    }

    if(saveEventBtn) {
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

          const payload = {
            title: title,
            date: date,
            time: isAllDay ? null : time || null,
            end_time: isAllDay ? null : endTime || null,
            all_day: isAllDay,
          };

          try {
            await sendApiRequest(
              "/add_event",
              payload,
              calendarStatus,
              "Подію успішно додано!"
            );
            addEventModal.hide();
            await renderCalendar(); 
            initializeTasks(); 

          } catch (error) {
            console.error("Помилка збереження:", error);
          }
        });
    }

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

        if (response.status === 401) {
          const result = await response.json();
          console.warn("Потрібна авторизація Google:", result.login_url);

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
          
          startLoginPolling(); 
          return null;
        }

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
        return [];
      }
    }

    renderCalendar();
  }

  // ===================================================================
  // ===== 2. ЗАВДАННЯ ТА АНАЛІТИКА (Google Sync) =====
  // ===================================================================

  const taskListContainer = document.querySelector("#tasks ul");
  let tasks = []; 
  let initializeTasks; 

  if (taskListContainer) {
    const progressFill = document.querySelector(".custom-progress-fill");
    const progressText = document.querySelector("#analytics p:last-of-type");
    const addTaskForm = document.getElementById("add-task-form");
    const newTaskInput = document.getElementById("new-task-input");

    function renderTasks() {
      taskListContainer.innerHTML = "";

      const counterEl = document.getElementById("task-counter");
      if (counterEl) {
        const count = tasks.length;
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
        li.dataset.taskId = task.id; 
        li.classList.add("task-item");

        const contentDiv = document.createElement("div");
        contentDiv.style.display = "flex";
        contentDiv.style.alignItems = "center";
        contentDiv.style.width = "100%";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.style.marginRight = "10px";
        checkbox.style.cursor = "pointer";

        const span = document.createElement("span");
        span.textContent = task.text;
        span.style.flexGrow = "1";
        span.style.marginLeft = "5px";
        if (task.done) {
          span.style.textDecoration = "line-through";
          span.style.opacity = "0.6";
        }

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "task-actions";
        actionsDiv.style.display = "flex";
        actionsDiv.style.gap = "8px";

        const editBtn = document.createElement("button");
        editBtn.textContent = "✏️";
        editBtn.className = "icon-btn";
        editBtn.title = "Редагувати";
        editBtn.onclick = (e) => {
          e.stopPropagation(); 
          editTask(task.id, task.text);
        };

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

        checkbox.addEventListener("change", () => {
          const isDone = checkbox.checked;
          const aTask = tasks.find((t) => t.id == task.id);
          if (aTask) aTask.done = isDone;
          renderTasks();
          console.log("Status changed locally");
        });

        taskListContainer.appendChild(li);
      });
      updateAnalytics();
    }

    async function editTask(id, oldText) {
      let cleanText = oldText;
      const timeMatch = oldText.match(/^\[\d{2}:\d{2}\]\s(.*)/);
      if (timeMatch && timeMatch[1]) {
          cleanText = timeMatch[1];
      }

      const newText = prompt("Змінити назву події:", cleanText);
      
      if (newText && newText.trim() !== "" && newText !== cleanText) {
        const task = tasks.find((t) => t.id == id);
        if (task) {
          const prefix = timeMatch ? `[${oldText.slice(1,6)}] ` : "";
          task.text = prefix + newText.trim();
          renderTasks();
        }

        await sendApiRequest(
          "/api/update_event_title", 
          { eventId: id, text: newText.trim() },
          null, 
          "Оновлено"
        );
      }
    }

    async function deleteTask(id) {
      if (confirm("Видалити цю подію з Google Calendar назавжди?")) {
        tasks = tasks.filter((t) => t.id != id);
        renderTasks();

        await sendApiRequest(
            "/api/delete_event", 
            { eventId: id }, 
            null, 
            "Видалено"
        );
      }
    }

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

    if (addTaskForm && newTaskInput) {
      addTaskForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const taskText = newTaskInput.value.trim();
        if (taskText) {
          try {
            await sendApiRequest("/add_task", { text: taskText }, null, "Додано в Google");
            newTaskInput.value = "";
            initializeTasks(); 

          } catch (error) {
            console.error("Помилка додавання завдання:", error);
            tg.showAlert(`Не вдалося додати: ${error.message}`);
          }
        }
      });
    }

    initializeTasks = async function() {
      try {
        taskListContainer.innerHTML = "<p>Завантаження подій з Google...</p>";
        
        const d = new Date();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

        const response = await fetchApi("/api/get_day_events", { date: dateStr });
        
        if (response.events) {
            tasks = response.events.map(ev => ({
                id: ev.id, 
                text: `${ev.time !== 'Весь день' ? '[' + ev.time + '] ' : ''}${ev.title}`,
                done: false 
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

    initializeTasks(); 
  }

  // =====================================================================
  // ЛОГІКА ВИХОДУ
  // =====================================================================
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      
      if (confirm("Ви дійсно хочете вийти? Це відключить синхронізацію з Google Calendar.")) {
        
        const userId = tg.initDataUnsafe?.user?.id;
        
        const originalText = logoutBtn.textContent;
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
});
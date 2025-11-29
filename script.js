// ==========================================================
//           ПОВНИЙ SCRIPT.JS (v9, з авто-погодою)
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
      if (statusElement) {
        statusElement.textContent =
          "❌ Помилка: Не вдалося отримати ID користувача.";
        statusElement.style.color = "red";
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
    }
  }

  /**
   * ✅ НОВА ФУНКЦІЯ для запитів, що повертають дані.
   * Очікує, що бекенд поверне { status: 'success', data: [...] }
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
      return result.data; // Повертаємо саме дані
    } else {
      throw new Error(result.message || "Невідома помилка сервера");
    }
  }

  // (Логіка кнопки Google Calendar "Додати завдання")
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

      const busyDates = await fetchEventDates(year, month + 1);

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
     * 4. Функція відкриття модалки
     */
    function openAddEventModal(date) {
      document.getElementById("add-event-form").reset();
      eventDateInput.value = date;

      eventTimeInput.disabled = false;
      eventEndTimeInput.disabled = false;

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

      const payload = {
        title: title,
        date: date,
        time: isAllDay ? null : time || null,
        end_time: isAllDay ? null : endTime || null,
        all_day: isAllDay,
      };

      sendApiRequest(
        "/add_event",
        payload,
        calendarStatus,
        "Подію успішно додано!"
      );

      addEventModal.hide();

      await renderCalendar();
    });

    /**
     * 7. Функція для завантаження "зайнятих" дат
     */
    async function fetchEventDates(year, month) {
      const userId = tg.initDataUnsafe?.user?.id;
      if (!backendUrl || !userId) {
        console.warn("Не можу завантажити події: відсутній backendUrl або userId.");
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
            
            // Варіант А: Показати кнопку прямо в календарі замість дат
            const calendarGrid = document.getElementById("calendar-grid");
            if(calendarGrid) {
                calendarGrid.innerHTML = `
                    <div style="grid-column: span 7; text-align: center; padding: 20px;">
                        <p>⚠️ Потрібен доступ до Google Calendar</p>
                        <a href="${result.login_url}" class="btn btn-primary" style="margin-top: 10px;">🔐 Увійти через Google</a>
                    </div>
                `;
            }
            // Повертаємо порожній масив, щоб решта коду не ламалася, 
            // але ми вже переписали HTML грідки, тому календар не буде пустим, він покаже кнопку.
            return [];
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
  // ===== 2. ЗАВДАННЯ ТА АНАЛІТИКА (ОНОВЛЕНО v2) =====
  // ===================================================================

  const taskListContainer = document.querySelector("#tasks ul");

  if (taskListContainer) {
    const progressFill = document.querySelector(".custom-progress-fill");
    const progressText = document.querySelector("#analytics p:last-of-type");
    const addTaskForm = document.getElementById("add-task-form");
    const newTaskInput = document.getElementById("new-task-input");

    let tasks = []; 

    // --- 1. Рендер завдань (З кнопками та стилями) ---
    function renderTasks() {
      taskListContainer.innerHTML = "";
      if (tasks.length === 0) {
        taskListContainer.innerHTML = "<p style='opacity: 0.7; text-align: center;'>Сьогодні завдань немає. Відпочивай! 😎</p>";
      }

      // Скидаємо стилі списку, щоб керувати ними через CSS/JS
      taskListContainer.style.listStyleType = "none";
      taskListContainer.style.paddingLeft = "0";

      tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.dataset.taskId = task.id;
        
        // Клас для стилізації
        li.classList.add("task-item");
        
        // Зебра (парні/непарні) - додаємо класи
        // index % 2 === 0 ? "even" : "odd"
        // Але краще це зробимо через CSS :nth-child, тут просто структура

        // Основний контейнер контенту
        const contentDiv = document.createElement("div");
        contentDiv.style.display = "flex";
        contentDiv.style.alignItems = "center";
        contentDiv.style.width = "100%";

        // Чекбокс
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.style.marginRight = "10px";
        checkbox.style.cursor = "pointer";
        
        // Текст
        const span = document.createElement("span");
        span.textContent = task.text;
        span.style.flexGrow = "1"; // Розтягує текст, штовхаючи кнопки вправо
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
            e.stopPropagation(); // Щоб не спрацював клік по li
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

        // Збираємо все до купи
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

          renderTasks(); // Перемальовуємо

          // Надсилаємо оновлення на бекенд "у фоні"
          sendApiRequest(
            "/api/update_webtask",
            { taskId: taskId, done: isDone },
            null,
            null
          );
        });

        li.appendChild(checkbox);
        li.append(` ${task.text}`);

        li.addEventListener("click", (e) => {
          if (e.target !== checkbox) {
            const taskId = li.dataset.taskId;
            const aTask = tasks.find((t) => t.id == taskId);
            if (aTask) {
              aTask.done = !aTask.done; // Інвертуємо стан
              renderTasks(); // Перемальовуємо

              // Надсилаємо оновлення на бекенд "у фоні"
              sendApiRequest(
                "/api/update_webtask",
                { taskId: taskId, done: aTask.done },
                null,
                null
              );
            }
          }
        });

        taskListContainer.appendChild(li);
      });
      updateAnalytics();
    }

    // --- Логіка Редагування ---
    async function editTask(id, oldText) {
        const newText = prompt("Відредагуйте завдання:", oldText);
        if (newText && newText.trim() !== "" && newText !== oldText) {
            // Оновлюємо локально
            const task = tasks.find(t => t.id == id);
            if (task) {
                task.text = newText.trim();
                renderTasks();
            }
            // Відправляємо на сервер
            await sendApiRequest("/api/edit_webtask", { taskId: id, text: newText.trim() }, null, null);
        }
    }

    // --- Логіка Видалення ---
    async function deleteTask(id) {
        if(confirm("Видалити це завдання?")) {
            // Видаляємо локально
            tasks = tasks.filter(t => t.id != id);
            renderTasks();
            
            // Відправляємо на сервер
            await sendApiRequest("/api/delete_webtask", { taskId: id }, null, null);
        }
    }

    // --- 2. Оновлення аналітики ---
    function updateAnalytics() {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => task.done).length;
      const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        progressFill.textContent = `${percentage}%`;
      }
      if (progressText) {
        progressText.textContent = `Виконано ${completedTasks} з ${totalTasks} завдань`;
      }
    }

    // --- 3. Додавання завдання ---
    if (addTaskForm && newTaskInput) {
      addTaskForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const taskText = newTaskInput.value.trim();
        if (taskText) {
          try {
            // Надсилаємо на бек і чекаємо на відповідь з новим завданням
            // Очікуємо, що бек поверне {id: ..., text: ..., done: ...}
            const newTask = await fetchApi("/api/add_webtask", { text: taskText });

            tasks.push(newTask);
            newTaskInput.value = "";
            renderTasks();
          } catch (error) {
            console.error("Помилка додавання завдання:", error);
            tg.showAlert(`Не вдалося додати: ${error.message}`);
          }
        }
      });
    }

    // --- 4. Початкове завантаження (як погода) ---
    async function initializeTasks() {
      try {
        taskListContainer.innerHTML = "<p>Завантаження завдань...</p>";
        // Очікуємо, що бек поверне масив завдань
        const fetchedTasks = await fetchApi("/api/get_webtasks", {});
        tasks = fetchedTasks || []; // На випадок, якщо data буде null
        renderTasks();
      } catch (error) {
        console.error("Помилка завантаження завдань:", error);
        taskListContainer.innerHTML = `<p style="color: red;">❌ Не вдалося завантажити.</p>`;
      }
    }

    initializeTasks(); // Запускається одразу при відкритті сторінки
  }
});
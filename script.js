// ==========================================================
//           ПОВНИЙ SCRIPT.JS (з завантаженням подій)
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // ===== Отримання та збереження backendUrl =====
  const backendUrl =
    "https://notificationtgbotheavyapikitchen-production.up.railway.app/";

  // ===================================================================
  // ===== 1. ПЕРЕМИКАЧ ТЕМ (ОНОВЛЕНА ЛОГІКА) =====
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
      let devPageUrl = "developomde.html";

      if (currentBackendUrl) {
        devPageUrl = `developomde.html?backendUrl=${encodeURIComponent(
          currentBackendUrl
        )}`;
      }
      window.location.href = devPageUrl;
    });
  }

  // --- 2. Кнопка "Вимкнути" (яка є на developomde.html) ---
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
      flaskStatus.textContent = "❌ Помилка: Відкрийте додаток через кнопку в боті.";
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
   * (Використовується і для календаря, і для завдань)
   */
  async function sendApiRequest(
    endpoint,
    payload,
    statusElement,
    successMessage
  ) {
    if (!backendUrl) {
      statusElement.textContent = "❌ Помилка: URL бекенду не знайдено.";
      statusElement.style.color = "red";
      return;
    }

    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
      statusElement.textContent = "❌ Помилка: Не вдалося отримати ID користувача.";
      statusElement.style.color = "red";
      return;
    }

    statusElement.textContent = "Обробка запиту...";
    statusElement.style.color = "orange";

    try {
      const apiUrl = `${backendUrl}${endpoint}`;
      const body = { ...payload, userId };

      // tg.showAlert(`Відправляємо запит: ${endpoint}`); // (Можна розкоментувати для дебагу)

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        statusElement.textContent = `✅ ${successMessage}`;
        statusElement.style.color = "green";
      } else {
        throw new Error(result.message || "Невідома помилка сервера");
      }
    } catch (error) {
      console.error(`API Request Error to ${endpoint}:`, error);
      statusElement.textContent = `❌ Помилка: ${error.message}`;
      statusElement.style.color = "red";
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
  //          ЛОГІКА КАЛЕНДАРЯ (ОНОВЛЕНО)
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
    const eventTitleInput = document.getElementById("event-title");
    const eventDateInput = document.getElementById("event-date");
    const eventTimeInput = document.getElementById("event-time");
    const calendarStatus = document.getElementById("add-task-status");

    let currentDate = new Date();

    /**
     * 3. (ОНОВЛЕНО) Головна функція рендеру (малювання) календаря
     * Тепер вона АСИНХРОННА, щоб чекати на дані з бекенду
     */
    async function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-11

      const monthName = new Date(year, month).toLocaleString("uk-UA", {
        month: "long",
      });
      monthYearDisplay.textContent = `${
        monthName.charAt(0).toUpperCase() + monthName.slice(1)
      } ${year}`;
      
      // === ДОДАНО: Завантажуємо дані ПЕРЕД малюванням ===
      // (month + 1) тому що month 0-11, а нам треба 1-12
      const busyDates = await fetchEventDates(year, month + 1);
      // === КІНЕЦЬ ===

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
        
        // === ДОДАНО: Перевірка на "зайнятість" ===
        // busyDates - це масив, який ми завантажили, напр. ["2025-11-20", "2025-11-25"]
        if (busyDates.includes(cellDateISO)) {
          dayCell.classList.add("busy-day");
        }
        // === КІНЕЦЬ ===

        dayCell.addEventListener("click", () => {
          openAddEventModal(cellDateISO);
        });

        calendarGrid.appendChild(dayCell);
      }
    }

    /**
     * 4. Функція відкриття модалки (без змін)
     */
    function openAddEventModal(date) {
      document.getElementById("add-event-form").reset();
      eventDateInput.value = date;
      addEventModal.show();
    }

    /**
     * 5. (ОНОВЛЕНО) Обробники кнопок "вперед/назад"
     * Тепер АСИНХРОННІ, щоб чекати на renderCalendar()
     */
    prevMonthBtn.addEventListener("click", async () => {
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() - 1);
      await renderCalendar(); // Чекаємо, поки новий місяць завантажиться
    });

    nextMonthBtn.addEventListener("click", async () => {
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() + 1);
      await renderCalendar(); // Чекаємо, поки новий місяць завантажиться
    });

    /**
     * 6. (ОНОВЛЕНО) Обробник кнопки "Зберегти"
     * Тепер він також викликає renderCalendar(), щоб точка з'явилася одразу
     */
    saveEventBtn.addEventListener("click", async () => { // <--- ЗМІНА: async
      const title = eventTitleInput.value;
      const date = eventDateInput.value;
      const time = eventTimeInput.value;

      if (!title || !date) {
        tg.showAlert("Будь ласка, заповніть назву події та дату.");
        return;
      }

      const payload = {
        title: title,
        date: date,
        time: time || null, 
      };

      // (Використовуємо стару функцію sendApiRequest, вона синхронна)
      // Вона просто покаже "Успіх", але ми не будемо її чекати
       sendApiRequest(
        "/add_event",
        payload,
        calendarStatus,
        "Подію успішно додано!"
      );
      
      addEventModal.hide();
      
      // === ДОДАНО: Оновлюємо календар, щоб одразу побачити точку ===
      await renderCalendar();
    });
    
    /**
     * 7. (НОВА) Функція для завантаження "зайнятих" дат
     * @param {number} year - Поточний рік (напр. 2025)
     * @param {number} month - Поточний МІСЯЦЬ (1-12)
     * @returns {Promise<string[]>} - Масив дат у форматі "YYYY-MM-DD"
     */
    async function fetchEventDates(year, month) {
      const userId = tg.initDataUnsafe?.user?.id;
      if (!backendUrl || !userId) {
        console.warn("Не можу завантажити події: відсутній backendUrl або userId.");
        return []; // Повертаємо порожній масив, щоб нічого не впало
      }

      const payload = {
        userId: userId,
        year: year,
        month: month
      };

      try {
        const response = await fetch(`${backendUrl}/get_events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Помилка мережі при завантаженні подій');
        }

        const result = await response.json();
        
        if (result.status === 'success' && Array.isArray(result.event_dates)) {
          return result.event_dates; // Напр. ["2025-11-20", "2025-11-25"]
        } else {
          throw new Error(result.message || 'Неправильний формат відповіді');
        }

      } catch (error) {
        console.error("Помилка fetchEventDates:", error);
        tg.showAlert(`Не вдалося завантажити події: ${error.message}`);
        return []; // Важливо повернути масив, щоб .includes() не впав
      }
    }


    // 8. Перший запуск
    renderCalendar();
  }
  // ==================================================
  //          КІНЕЦЬ ЛОГІКИ КАЛЕНДАРЯ
  // ==================================================

  // ===================================================================
  // ===== 2. ЗАВДАННЯ ТА АНАЛІТИКА (ВИПРАВЛЕНО) =====
  // ===================================================================
  
  const taskListContainer = document.querySelector("#tasks ul"); 

  if (taskListContainer) {
    const progressFill = document.querySelector(".custom-progress-fill"); 
    const progressText = document.querySelector("#analytics p:last-of-type");
    const addTaskForm = document.getElementById('add-task-form');
    const newTaskInput = document.getElementById('new-task-input');

    // Цей масив тепер буде керувати твоїм списком завдань
    let tasks = [
      { text: "Практична з математики", done: true },
      { text: "Реферат з історії", done: false },
      { text: "Підготуватись до семінару", done: false },
    ];

    function renderTasks() {
      taskListContainer.innerHTML = ""; 
      if (tasks.length === 0) {
        taskListContainer.innerHTML = "<p>Немає завдань. Чудовий день!</p>";
      }

      taskListContainer.style.listStyleType = "none";
      taskListContainer.style.paddingLeft = "0.5rem"; 

      tasks.forEach((task, index) => {
        const li = document.createElement("li");
        li.style.textDecoration = task.done ? "line-through" : "none";
        li.style.opacity = task.done ? 0.6 : 1;
        li.style.cursor = "pointer";
        li.style.margin = "5px 0";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = task.done;
        checkbox.style.marginRight = "10px";
        checkbox.addEventListener("change", () => {
          tasks[index].done = checkbox.checked;
          renderTasks(); // Перемалювати все
        });

        li.appendChild(checkbox);
        li.append(` ${task.text}`);
        
        li.addEventListener("click", (e) => {
            if (e.target !== checkbox) { 
                tasks[index].done = !tasks[index].done;
                renderTasks();
            }
        });

        taskListContainer.appendChild(li);
      });
      updateAnalytics();
    }

    function updateAnalytics() {
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((task) => task.done).length;
      const percentage =
        totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

      if (progressFill) {
        progressFill.style.width = `${percentage}%`;
        progressFill.textContent = `${percentage}%`;
      }
      if (progressText) {
        // === ВИПРАВЛЕНО: Кириллица ===
        progressText.textContent = `Виконано ${completedTasks} з ${totalTasks} завдань`;
      }
    }
    
    if (addTaskForm && newTaskInput) {
      addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault(); 
        const taskText = newTaskInput.value.trim();
        if (taskText) {
          tasks.push({ text: taskText, done: false }); 
          newTaskInput.value = ''; 
          renderTasks(); 
        }
      });
    }

    renderTasks(); // Перший запуск
  }
});
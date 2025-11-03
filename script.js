document.addEventListener("DOMContentLoaded", () => {
  // ===== Отримання та збереження backendUrl =====
  // function getBackendUrl() {
  //   // Спробуємо отримати URL з параметрів
  //   let url = new URLSearchParams(window.location.search).get("backendUrl");
  //   // Якщо немає в URL, спробуємо взяти з localStorage
  //   if (!url) {
  //     url = localStorage.getItem('backendUrl');
  //   }
  //   // Якщо знайшли в URL, зберігаємо в localStorage
  //   else {
  //     localStorage.setItem('backendUrl', url);
  //   }
  //   return url;
  // }

  // const backendUrl = getBackendUrl();
  // const backendUrl = process.env.backendUrl;
  const backendUrl =
    "https://notificationtgbotheavyapikitchen-production.up.railway.app/";

  // ===================================================================
  // ===== 1. ПЕРЕМИКАЧ ТЕМ (ОНОВЛЕНА ЛОГІКА) =====
  // ===================================================================
  const themeSelect = document.getElementById("theme-select");
  const themeLink = document.getElementById("theme-link");

  // 1. Завантажуємо збережену тему при завантаженні сторінки
  const savedThemeFile = localStorage.getItem("themeFile") || "style.css"; // 'style.css' - за замовчуванням

  if (themeLink) {
    themeLink.href = savedThemeFile;
  }
  if (themeSelect) {
    themeSelect.value = savedThemeFile;
  }

  // 2. Обробник на зміну <select>
  if (themeSelect) {
    themeSelect.addEventListener("change", function () {
      const selectedThemeFile = this.value;
      if (themeLink) {
        themeLink.href = selectedThemeFile;
        // Зберігаємо вибір в localStorage
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
      // Беремо URL, який ми вже отримали при завантаженні сторінки
      const currentBackendUrl = backendUrl;
      let devPageUrl = "developomde.html";

      if (currentBackendUrl) {
        // Додаємо URL як параметр
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
      // Так само беремо URL, який ми отримали
      const currentBackendUrl = backendUrl;
      let indexPageUrl = "index.html";

      if (currentBackendUrl) {
        // Додаємо URL як параметр при поверненні на index
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

  // Перевіряємо, чи елементи існують (вони можуть бути відсутні залежно від сторінки)
  if (testFlaskBtn && flaskStatus) {
    // Перевіряємо наявність backendUrl для тестової кнопки
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
   * @param {string} endpoint - Шлях до API (наприклад, '/send_message').
   * @param {object} payload - Дані для відправки в тілі запиту.
   * @param {HTMLElement} statusElement - Елемент для відображення статусу (успіх/помилка).
   * @param {string} successMessage - Повідомлення, яке буде показано у разі успіху.
   */
  async function sendApiRequest(
    endpoint,
    payload,
    statusElement,
    successMessage
  ) {
    // Перевіряємо наявність URL бекенду
    if (!backendUrl) {
      statusElement.textContent = "❌ Помилка: URL бекенду не знайдено.";
      statusElement.style.color = "red";
      return;
    }

    // Отримуємо ID користувача з Telegram
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
      statusElement.textContent = "❌ Помилка: Не вдалося отримати ID користувача.";
      statusElement.style.color = "red";
      return;
    }

    // Показуємо користувачу, що процес почався
    statusElement.textContent = "Обробка запиту...";
    statusElement.style.color = "orange";

    try {
      const apiUrl = `${backendUrl}${endpoint}`;

      // Формуємо тіло запиту, автоматично додаючи userId до будь-якого payload
      const body = { ...payload, userId };

      const alertMessage = `
Відправляємо запит:
Endpoint: ${endpoint}
User ID: ${userId}
Дані: ${JSON.stringify(payload, null, 2)}
    `;

      // Показуємо нативний алерт Telegram
      tg.showAlert(alertMessage);

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        statusElement.textContent = `✅ ${successMessage}`;
        statusElement.style.color = "green";
      } else {
        // Якщо сервер повернув помилку, викидаємо її
        throw new Error(result.message || "Невідома помилка сервера");
      }
    } catch (error) {
      console.error(`API Request Error to ${endpoint}:`, error);
      statusElement.textContent = `❌ Помилка: ${error.message}`;
      statusElement.style.color = "red";
    }
  }

  // Перевіряємо наявність кнопки додавання завдань
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

  // =======================================================================
  //                 КІНЕЦЬ ЧАСТИНИ, ЩО СТОСУЄТЬСЯ БОТА
  // =======================================================================

  // ===== Режим концентрації (Таймер Помодоро) =====
  // (Запускаємо, тільки якщо ми на index.html)
  const timerDisplay = document.getElementById("timer-display");
  if (timerDisplay) {
    // ID кнопок тепер правильні, завдяки виправленню в index.html
    const startBtn = document.getElementById("start-btn");
    const pauseBtn = document.getElementById("pause-btn");
    const stopBtn = document.getElementById("stop-btn");

    let countdown;
    let timeLeft = 25 * 60; // 25 хвилин
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
    
    // Ініціалізуємо дисплей
    updateTimerDisplay();
  }

  // ==================================================
  //          НОВА ЛОГІКА: КАЛЕНДАР
  // (Запускаємо, тільки якщо ми на index.html)
  // ==================================================
  const monthYearDisplay = document.getElementById("month-year-display");
  if (monthYearDisplay) {
    // 1. Отримуємо елементи
    const calendarGrid = document.getElementById("calendar-grid");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");

    // Елементи модального вікна
    const addEventModalEl = document.getElementById("addEventModal");
    const addEventModal = new bootstrap.Modal(addEventModalEl);

    const saveEventBtn = document.getElementById("save-event-btn");
    const eventTitleInput = document.getElementById("event-title");
    const eventDateInput = document.getElementById("event-date");
    const eventTimeInput = document.getElementById("event-time");

    const calendarStatus = document.getElementById("add-task-status");

    // 2. Поточна дата, яку ми відображаємо
    let currentDate = new Date(); // Сьогоднішня дата

    /**
     * 3. Головна функція рендеру (малювання) календаря
     */
    function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-11

      const monthName = new Date(year, month).toLocaleString("uk-UA", {
        month: "long",
      });
      monthYearDisplay.textContent = `${
        monthName.charAt(0).toUpperCase() + monthName.slice(1)
      } ${year}`;

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
      
      // === ДОДАНО: Виділення сьогоднішнього дня ===
      const realToday = new Date();
      realToday.setHours(0, 0, 0, 0); 
      // === КІНЕЦЬ ===

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

        // === ДОДАНО: Виділення сьогоднішнього дня ===
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0); 

        if (cellDate.getTime() === realToday.getTime()) {
          dayCell.classList.add("today");
        }
        // === КІНЕЦЬ ===

        const cellDateISO = `${year}-${String(month + 1).padStart(
          2,
          "0"
        )}-${String(day).padStart(2, "0")}`;
        dayCell.dataset.date = cellDateISO;

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
      addEventModal.show();
    }

    // 5. Обробники кнопок "вперед/назад"
    prevMonthBtn.addEventListener("click", () => {
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
    });

    nextMonthBtn.addEventListener("click", () => {
      currentDate.setDate(1);
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
    });

    /**
     * 6. Обробник кнопки "Зберегти" в модалці
     */
    saveEventBtn.addEventListener("click", () => {
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

      sendApiRequest(
        "/add_event",
        payload,
        calendarStatus,
        "Подію успішно додано!"
      );
      
      addEventModal.hide();
    });

    // 7. Перший запуск
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
    
    // === ДОДАНО: Підключення форми додавання ===
    const addTaskForm = document.getElementById('add-task-form');
    const newTaskInput = document.getElementById('new-task-input');
    // === КІНЕЦЬ ===

    // Цей масив тепер буде керувати твоїм списком завдань
    let tasks = [
      { text: "Практична з математики", done: true },
      { text: "Реферат з історії", done: false },
      { text: "Підготуватись до семінару", done: false },
    ];

    function renderTasks() {
      taskListContainer.innerHTML = ""; // Очищуємо статичний HTML
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
    
    // === ДОДАНО: Обробник форми ===
    if (addTaskForm && newTaskInput) {
      addTaskForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Зупиняємо перезавантаження сторінки
        const taskText = newTaskInput.value.trim();
        if (taskText) {
          tasks.push({ text: taskText, done: false }); // Додаємо нове завдання
          newTaskInput.value = ''; // Очищуємо поле вводу
          renderTasks(); // Перемальовуємо список
        }
      });
    }
    // === КІНЕЦЬ ===

    renderTasks(); // Перший запуск, щоб замінити статичний HTML на динамічний
  }
});
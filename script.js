document.addEventListener("DOMContentLoaded", () => {
  // ===== Перемикач тем =====
  const themeSelect = document.getElementById("theme-select");
  const themeLink = document.getElementById("theme-link");

  themeSelect.addEventListener("change", function () {
    themeLink.href = this.value === "dark" ? "dark-style.css" : "style.css";
  });

  // ===== Інтеграція з Telegram Web App =====
  const tg = window.Telegram.WebApp;
  tg.ready();

  // =======================================================================
  //                      ГОЛОВНА ЧАСТИНА РЕФАКТОРИНГУ
  // =======================================================================

  // --- Отримуємо URL бекенду один раз при завантаженні ---
  const urlParams = new URLSearchParams(window.location.search);
  const backendUrl = urlParams.get("backendUrl");

  // --- Отримуємо елементи для відображення статусу ---
  const testFlaskBtn = document.getElementById("test-flask-btn");
  const flaskStatus = document.getElementById("flask-status");
  const addTaskViaFlaskButton = document.getElementById("add-task-btn");
  const addTaskStatus = document.getElementById("add-task-status");

  /**
   * ✅ ГОЛОВНА ФУНКЦІЯ для відправки будь-яких запитів на бекенд.
   * @param {string} endpoint - Шлях до API (наприклад, '/send_message').
   * @param {object} payload - Дані для відправки в тілі запиту.
   * @param {HTMLElement} statusElement - Елемент для відображення статусу (успіх/помилка).
   * @param {string} successMessage - Повідомлення, яке буде показано у разі успіху.
   */
  async function sendApiRequest(endpoint, payload, statusElement, successMessage) {
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

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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

  // --- Перевірка URL та блокування кнопок, якщо його немає ---
  if (!backendUrl) {
    testFlaskBtn.disabled = true;
    addTaskViaFlaskButton.disabled = true;
    flaskStatus.textContent = "❌ Помилка: Відкрийте додаток через кнопку в боті.";
    flaskStatus.style.color = "red";
  }

  // --- ОНОВЛЕНИЙ Обробник для тестової кнопки ---
  testFlaskBtn.addEventListener("click", () => {
    const payload = {
      message: "Це тестове повідомлення з сайту GitHub Pages!"
    };
    sendApiRequest('/send_message', payload, flaskStatus, "Повідомлення надіслано!");
  });
  
  // --- ОНОВЛЕНИЙ Обробник для кнопки додавання завдань ---
  addTaskViaFlaskButton.addEventListener("click", () => {
    const taskText = prompt(
      "Введіть назву завдання для додавання в Google Calendar:",
      "Лабораторна з програмування"
    );

    if (!taskText || taskText.trim() === "") {
      return; // Нічого не робимо, якщо користувач скасував ввід
    }
    
    const payload = { 
      text: taskText.trim() 
    };
    sendApiRequest('/add_task', payload, addTaskStatus, "Завдання успішно додано!");
  });

  // =======================================================================
  //                 КІНЕЦЬ ЧАСТИНИ, ЩО СТОСУЄТЬСЯ БОТА
  // =======================================================================


  // ===== Режим концентрації (Таймер Помодоро) =====
  const timerDisplay = document.getElementById("timer-display");
  const startBtn = document.getElementById("start-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const stopBtn = document.getElementById("stop-btn");

  let countdown;
  let timeLeft = 25 * 60; // 25 хвилин
  let isPaused = true;

  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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

  // ===== Завдання та Аналітика (Клієнтська сторона) - БЕЗ ЗМІН =====
  const taskListContainer = document.getElementById("task-list");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

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

    const ul = document.createElement("ul");
    tasks.forEach((task, index) => {
      const li = document.createElement("li");
      li.style.textDecoration = task.done ? "line-through" : "none";
      li.style.cursor = "pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.addEventListener("change", () => {
        tasks[index].done = checkbox.checked;
        renderTasks(); // Перемалювати все
      });

      li.appendChild(checkbox);
      li.append(` ${task.text}`);
      ul.appendChild(li);
    });
    taskListContainer.appendChild(ul);
    updateAnalytics();
  }

  function updateAnalytics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.done).length;
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    progressFill.style.width = `${percentage}%`;
    progressFill.textContent = `${percentage}%`;
    progressText.textContent = `Виконано ${completedTasks} з ${totalTasks} завдань`;
  }
  
  renderTasks();
});
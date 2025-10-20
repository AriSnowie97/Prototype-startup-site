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

  // ✅ ================== ОНОВЛЕНА ЛОГІКА ДЛЯ FLASK ==================

  // 1. Отримуємо URL бекенду з параметра ?backendUrl=...
  const urlParams = new URLSearchParams(window.location.search);
  const backendUrl = urlParams.get("backendUrl");

  // --- Тестова кнопка ---
  const testFlaskBtn = document.getElementById("test-flask-btn");
  const flaskStatus = document.getElementById("flask-status");

  // --- Кнопка додавання завдань ---
  const addTaskViaFlaskButton = document.getElementById("add-task-btn");
  const addTaskStatus = document.getElementById("add-task-status"); // Потрібно додати в HTML

  if (!backendUrl) {
    // Якщо URL не передано, блокуємо обидві кнопки
    testFlaskBtn.disabled = true;
    addTaskViaFlaskButton.disabled = true;
    flaskStatus.textContent =
      "❌ Помилка: URL бекенду не знайдено. Відкрийте додаток через кнопку в боті.";
    flaskStatus.style.color = "red";
  }

  // Обробник для тестової кнопки (без змін)
  testFlaskBtn.addEventListener("click", async () => {
    // ... (код для тестової кнопки залишається без змін) ...
    flaskStatus.textContent = "Відправка запиту...";
    flaskStatus.style.color = "orange";

    try {
      // 2. Формуємо повний шлях до нашого API
      const apiUrl = `${backendUrl}/send_message`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Це тестове повідомлення з сайту GitHub Pages!",
        }),
      });

      const result = await response.json();

      if (response.ok) {
        flaskStatus.textContent = "✅ Успіх! Повідомлення надіслано в Telegram.";
        flaskStatus.style.color = "green";
      } else {
        throw new Error(result.message || "Невідома помилка сервера");
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      flaskStatus.textContent = `❌ Помилка відправки: ${error.message}`;
      flaskStatus.style.color = "red";
    }
  });
  
  // ✅ НОВИЙ обробник для кнопки додавання завдань через Flask
  addTaskViaFlaskButton.addEventListener("click", async () => {
    const taskText = prompt(
      "Введіть назву завдання для додавання в Google Calendar:",
      "Лабораторна з програмування"
    );

    if (!taskText || taskText.trim() === "") {
      return; // Користувач скасував ввід або ввів порожній рядок
    }
    
    // ✅ ДОДАНО: Отримуємо дані користувача з Telegram
    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id;

    if (!userId) {
        addTaskStatus.textContent = "❌ Помилка: Не вдалося отримати ID користувача Telegram.";
        addTaskStatus.style.color = "red";
        return;
    }

    addTaskStatus.textContent = "Додаю завдання...";
    addTaskStatus.style.color = "orange";
    
    try {
      const apiUrl = `${backendUrl}/add_task`; // Новий маршрут
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ✅ ЗМІНЕНО: Надсилаємо і текст, і ID користувача
        body: JSON.stringify({ 
            text: taskText.trim(),
            userId: userId 
        })
      });

      const result = await response.json();

      if (response.ok) {
        addTaskStatus.textContent = "✅ Успіх! Завдання додано. Перевірте Telegram.";
        addTaskStatus.style.color = "green";
      } else {
        throw new Error(result.message || "Невідома помилка сервера");
      }
    } catch (error) {
      console.error("Add Task Fetch Error:", error);
      addTaskStatus.textContent = `❌ Помилка: ${error.message}`;
      addTaskStatus.style.color = "red";
    }
  });

  // ✅ ==========================================================

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
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
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

  // ===== Завдання та Аналітика (Клієнтська сторона) =====
  const taskListContainer = document.getElementById("task-list");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");

  // Початковий список завдань (для демонстрації)
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

    const percentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    progressFill.style.width = `${percentage}%`;
    progressFill.textContent = `${percentage}%`;
    progressText.textContent = `Виконано ${completedTasks} з ${totalTasks} завдань`;
  }

  // Перший рендер завдань при завантаженні сторінки
  renderTasks();
});

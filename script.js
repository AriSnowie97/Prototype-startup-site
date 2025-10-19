document.addEventListener('DOMContentLoaded', () => {

  // ===== Перемикач тем =====
  const themeSelect = document.getElementById('theme-select');
  const themeLink = document.getElementById('theme-link');

  themeSelect.addEventListener('change', function() {
    themeLink.href = this.value === 'dark' ? 'dark-style.css' : 'style.css';
  });

  // ===== Інтеграція з Telegram Web App =====
  const tg = window.Telegram.WebApp;
  tg.ready();

  const addTaskViaBotButton = document.getElementById('add-task-btn');

  addTaskViaBotButton.addEventListener('click', () => {
    const taskText = prompt("Введіть назву завдання для додавання в Google Calendar через бота:", "Лабораторна з програмування");
    if (taskText && taskText.trim() !== "") {
      const dataToSend = {
        action: "addTask",
        text: taskText.trim()
      };
      tg.sendData(JSON.stringify(dataToSend));
      tg.close();
    }
  });

  // ===== Режим концентрації (Таймер Помодоро) =====
  const timerDisplay = document.getElementById('timer-display');
  const startBtn = document.getElementById('start-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const stopBtn = document.getElementById('stop-btn');

  let countdown;
  let timeLeft = 25 * 60; // 25 хвилин
  let isPaused = true;

  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  function startTimer() {
    if (isPaused) {
      isPaused = false;
      countdown = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
          clearInterval(countdown);
          alert('Сесія концентрації завершена!');
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

  startBtn.addEventListener('click', startTimer);
  pauseBtn.addEventListener('click', pauseTimer);
  stopBtn.addEventListener('click', stopTimer);

  // ===== Завдання та Аналітика (Клієнтська сторона) =====
  const taskListContainer = document.getElementById('task-list');
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');

  // Початковий список завдань (для демонстрації)
  let tasks = [
    { text: 'Практична з математики', done: true },
    { text: 'Реферат з історії', done: false },
    { text: 'Підготуватись до семінару', done: false }
  ];

  function renderTasks() {
    taskListContainer.innerHTML = '';
    if (tasks.length === 0) {
        taskListContainer.innerHTML = '<p>Немає завдань. Чудовий день!</p>';
    }

    const ul = document.createElement('ul');
    tasks.forEach((task, index) => {
      const li = document.createElement('li');
      li.style.textDecoration = task.done ? 'line-through' : 'none';
      li.style.cursor = 'pointer';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.addEventListener('change', () => {
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
    const completedTasks = tasks.filter(task => task.done).length;
    
    const percentage = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    
    progressFill.style.width = `${percentage}%`;
    progressFill.textContent = `${percentage}%`;
    progressText.textContent = `Виконано ${completedTasks} з ${totalTasks} завдань`;
  }

  // Перший рендер завдань при завантаженні сторінки
  renderTasks();
});

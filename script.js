// ==========================================================
//           ПОВНИЙ SCRIPT.JS (v11 - Fix Scope & Edit)
// ==========================================================

document.addEventListener("DOMContentLoaded", () => {
  // ===== Отримання та збереження backendUrl =====
  const backendUrl =
    "https://notificationtgbotheavyapikitchen-production.up.railway.app/";

  // ===================================================================
  // ===== 1. ПЕРЕМИКАЧ ТЕМ =====
  // ===================================================================
  const themeSelect = document.getElementById("theme-select");
  const themeLink = document.getElementById("theme-link");
  const savedThemeFile = localStorage.getItem("themeFile") || "style.css";

  if (themeLink) themeLink.href = savedThemeFile;
  if (themeSelect) {
    themeSelect.value = savedThemeFile;
    themeSelect.addEventListener("change", function () {
      const selectedThemeFile = this.value;
      if (themeLink) {
        themeLink.href = selectedThemeFile;
        localStorage.setItem("themeFile", selectedThemeFile);
      }
    });
  }

  // ===================================================================
  // ===== TELEGRAM AUTH & POLLING =====
  // ===================================================================
  const tg = window.Telegram.WebApp;
  tg.ready();

  const userNameDisplay = document.getElementById("user-name-display");
  const userIdDisplay = document.getElementById("user-id-display");

  async function loadUserProfile() {
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
              if (userNameDisplay) {
                  userNameDisplay.textContent = result.email;
                  userNameDisplay.style.color = "#4285F4";
              }
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

  let loginPollInterval = null;
  let pollAttempts = 0;
  const MAX_POLL_ATTEMPTS = 150;

  function startLoginPolling() {
    if (loginPollInterval) return;
    pollAttempts = 0;
    
    loginPollInterval = setInterval(async () => {
      pollAttempts++;
      if (pollAttempts >= MAX_POLL_ATTEMPTS) {
          clearInterval(loginPollInterval);
          loginPollInterval = null;
          return;
      }
      const isLoggedIn = await loadUserProfile();
      if (isLoggedIn) {
        clearInterval(loginPollInterval);
        window.location.reload(); 
      }
    }, 4000); 
  }

  if (tg.initDataUnsafe?.user) {
      loadUserProfile();
  }

  // ===================================================================
  // ===== API FUNCTIONS =====
  // ===================================================================
  async function sendApiRequest(endpoint, payload, statusElement, successMessage) {
    if (!backendUrl) return;
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) {
        console.error("No user ID");
        return;
    }
    if (statusElement) {
      statusElement.textContent = "Обробка...";
      statusElement.style.color = "orange";
    }

    try {
      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, userId }),
      });
      const result = await response.json();

      if (response.ok && result.status === "success") {
        if (statusElement) {
          statusElement.textContent = `✅ ${successMessage}`;
          statusElement.style.color = "green";
        }
      } else {
        throw new Error(result.message || "Error");
      }
    } catch (error) {
      console.error(`API Error ${endpoint}:`, error);
      if (statusElement) {
        statusElement.textContent = `❌ ${error.message}`;
        statusElement.style.color = "red";
      }
      throw error;
    }
  }

  async function fetchApi(endpoint, payload) {
    if (!backendUrl) throw new Error("No Backend URL");
    const userId = tg.initDataUnsafe?.user?.id;
    if (!userId) throw new Error("No User ID");

    const response = await fetch(`${backendUrl}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, userId }),
    });
    const result = await response.json();

    if (response.status === 401) {
        // Якщо не авторизований, повертаємо спеціальний об'єкт
        return { status: 'auth_required', login_url: result.login_url };
    }
    
    if (response.ok && result.status === "success") {
      return result;
    } else {
      throw new Error(result.message || "Error");
    }
  }

  // ===================================================================
  // ===== 2. GLOBAL VARIABLES FOR MODAL & TASKS =====
  // ===================================================================
  // Ми виносимо ці змінні нагору, щоб їх бачили і Календар, і Список завдань.
  
  let tasks = [];
  let isEditingMode = false;
  let editingEventId = null;
  let renderCalendarReference = null; // Посилання на функцію рендеру календаря
  let initializeTasksReference = null; // Посилання на функцію оновлення списку

  // Елементи модалки (перевіряємо їх наявність, бо на сторінці розробника їх може не бути)
  const addEventModalEl = document.getElementById("addEventModal");
  let addEventModal = null;
  if (addEventModalEl) {
      addEventModal = new bootstrap.Modal(addEventModalEl);
  }

  const eventTitleInput = document.getElementById("event-title");
  const eventDateInput = document.getElementById("event-date");
  const eventTimeInput = document.getElementById("event-time");
  const eventEndTimeInput = document.getElementById("event-end-time");
  const allDayCheckbox = document.getElementById("all-day-checkbox");
  const saveEventBtn = document.getElementById("save-event-btn");
  const calendarStatus = document.getElementById("add-task-status");

  // ===================================================================
  // ===== 3. GLOBAL OPEN MODAL FUNCTION =====
  // ===================================================================
  // Ця функція тепер доступна всюди!

  async function openAddEventModal(dateStr, eventData = null) {
      if (!addEventModal) return;

      const modalTitle = document.getElementById("addEventModalLabel");
      const form = document.getElementById("add-event-form");
      
      form.reset(); // Очищуємо форму
      
      // Логіка для списку подій в модалці
      const modalBody = document.querySelector("#addEventModal .modal-body");
      const oldList = document.getElementById("modal-events-list");
      if (oldList) oldList.remove();

      // Створюємо контейнер для списку подій цього дня
      const listContainer = document.createElement("div");
      listContainer.id = "modal-events-list";
      listContainer.innerHTML = "<p>⏳ Завантаження подій...</p>";
      listContainer.style.marginBottom = "20px";
      listContainer.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
      listContainer.style.paddingBottom = "15px";
      // Вставляємо ПЕРЕД формою
      modalBody.insertBefore(listContainer, form);


      if (eventData) {
        // === РЕЖИМ РЕДАГУВАННЯ ===
        isEditingMode = true;
        editingEventId = eventData.id;
        
        modalTitle.textContent = "Редагувати подію";
        saveEventBtn.textContent = "Зберегти зміни";
        saveEventBtn.classList.add("btn-primary");
        saveEventBtn.classList.remove("btn-secondary");
        saveEventBtn.disabled = false;

        eventTitleInput.value = eventData.raw_title || eventData.text; // Fallback
        eventDateInput.value = dateStr;
        allDayCheckbox.checked = eventData.is_all_day;

        if (!eventData.is_all_day && eventData.raw_start) {
            const dt = new Date(eventData.raw_start);
            const hh = String(dt.getHours()).padStart(2, '0');
            const mm = String(dt.getMinutes()).padStart(2, '0');
            eventTimeInput.value = `${hh}:${mm}`;
            eventTimeInput.disabled = false;
            eventEndTimeInput.disabled = false;
        } else {
            eventTimeInput.disabled = true;
            eventEndTimeInput.disabled = true;
        }

      } else {
        // === РЕЖИМ СТВОРЕННЯ ===
        isEditingMode = false;
        editingEventId = null;
        
        modalTitle.textContent = "Додати нову подію";
        saveEventBtn.textContent = "Зберегти";
        saveEventBtn.classList.add("btn-primary");
        saveEventBtn.classList.remove("btn-secondary");
        
        eventDateInput.value = dateStr;
        eventTimeInput.disabled = false;
        eventEndTimeInput.disabled = false;
        saveEventBtn.disabled = true; // Блокуємо, поки вантажиться список
      }

      addEventModal.show();

      // === ЗАВАНТАЖУЄМО СПИСОК ПОДІЙ ДЛЯ ЦЬОГО ДНЯ ===
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
                      li.style.fontSize = "0.9em";
                      li.innerHTML = `<strong>${ev.time || ''}</strong> ${ev.title}`;
                      ul.appendChild(li);
                  });
                  listContainer.appendChild(ul);
              } else {
                  listContainer.innerHTML += "<p style='opacity:0.7'>Подій немає</p>";
              }

              // Перевірка на минулий час (блокуємо кнопку тільки при створенні, при редагуванні дозволяємо)
              if (result.is_past && !isEditingMode) {
                  saveEventBtn.disabled = true;
                  saveEventBtn.textContent = "Минулий час";
                  saveEventBtn.classList.remove("btn-primary");
                  saveEventBtn.classList.add("btn-secondary");
              } else {
                  saveEventBtn.disabled = false;
              }
          }
      } catch (e) {
          console.error("List fetch error:", e);
          listContainer.innerHTML = "<p>Не вдалося завантажити список.</p>";
          saveEventBtn.disabled = false;
      }
  }

  // === ОБРОБНИКИ МОДАЛКИ ===
  if (saveEventBtn) {
      // Чекбокс "Весь день"
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

      // Кнопка Зберегти
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
            if (isEditingMode && editingEventId) {
                // UPDATE
                payload.eventId = editingEventId;
                await sendApiRequest(
                    "/api/update_event_full", 
                    payload,
                    calendarStatus,
                    "Подію оновлено!"
                );
            } else {
                // CREATE
                await sendApiRequest(
                    "/add_event",
                    payload,
                    calendarStatus,
                    "Подію створено!"
                );
            }

            addEventModal.hide();
            
            // Оновлюємо інтерфейс
            if (renderCalendarReference) await renderCalendarReference();
            if (initializeTasksReference) initializeTasksReference();

          } catch (error) {
            console.error("Save error:", error);
          }
      });
  }


  // ===================================================================
  // ===== 4. CALENDAR LOGIC =====
  // ===================================================================
  const monthYearDisplay = document.getElementById("month-year-display");
  
  if (monthYearDisplay) {
    const calendarGrid = document.getElementById("calendar-grid");
    const prevMonthBtn = document.getElementById("prev-month-btn");
    const nextMonthBtn = document.getElementById("next-month-btn");
    let currentDate = new Date();

    async function renderCalendar() {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      const monthName = new Date(year, month).toLocaleString("uk-UA", { month: "long" });
      monthYearDisplay.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

      const busyDates = await fetchEventDates(year, month + 1);
      if (busyDates === null) return; // Auth required

      calendarGrid.innerHTML = "";

      const firstDayOfMonth = new Date(year, month, 1);
      const lastDayOfMonth = new Date(year, month + 1, 0);
      const daysInMonth = lastDayOfMonth.getDate();
      let startDayOfWeek = firstDayOfMonth.getDay();
      if (startDayOfWeek === 0) startDayOfWeek = 7;
      const paddingDays = startDayOfWeek - 1;

      const realToday = new Date();
      realToday.setHours(0, 0, 0, 0);

      // Empty cells
      for (let i = 0; i < paddingDays; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("calendar-day", "other-month");
        calendarGrid.appendChild(emptyCell);
      }

      // Day cells
      for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = document.createElement("div");
        dayCell.classList.add("calendar-day");
        dayCell.textContent = day;

        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);

        if (cellDate.getTime() === realToday.getTime()) dayCell.classList.add("today");

        const cellDateISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        dayCell.dataset.date = cellDateISO;

        if (busyDates.includes(cellDateISO)) dayCell.classList.add("busy-day");

        // CLICK: OPEN MODAL (Create Mode)
        dayCell.addEventListener("click", () => {
          openAddEventModal(cellDateISO);
        });

        calendarGrid.appendChild(dayCell);
      }
    }

    renderCalendarReference = renderCalendar; // Зберігаємо посилання

    async function fetchEventDates(year, month) {
      if (!backendUrl) return [];
      const userId = tg.initDataUnsafe?.user?.id;
      
      try {
        const result = await fetchApi("/get_events", { year, month });
        if (result.status === 'auth_required') {
             // Show login prompt
             calendarGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                    <p>Потрібен доступ</p>
                    <button onclick="Telegram.WebApp.openLink('${result.login_url}')" class="btn btn-primary">Увійти через Google</button>
                </div>`;
             startLoginPolling();
             return null;
        }
        return result.event_dates || [];
      } catch (error) {
        console.error("fetchEventDates error:", error);
        return [];
      }
    }

    prevMonthBtn.addEventListener("click", async () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      await renderCalendar();
    });
    nextMonthBtn.addEventListener("click", async () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      await renderCalendar();
    });

    // Start
    renderCalendar();
  }

  // ===================================================================
  // ===== 5. TASKS LOGIC (Today) =====
  // ===================================================================
  const taskListContainer = document.querySelector("#tasks ul");

  if (taskListContainer) {
      const addTaskForm = document.getElementById("add-task-form");
      const newTaskInput = document.getElementById("new-task-input");
      const progressFill = document.querySelector(".custom-progress-fill");
      const progressText = document.querySelector("#analytics p:last-of-type");

      function renderTasks() {
          taskListContainer.innerHTML = "";
          const counterEl = document.getElementById("task-counter");
          if (counterEl) {
             counterEl.textContent = `(${tasks.length}/100)`;
             counterEl.style.color = tasks.length >= 100 ? "red" : "gray";
          }

          if (tasks.length === 0) {
              taskListContainer.innerHTML = "<p style='opacity:0.7; text-align:center;'>На сьогодні завдань немає.</p>";
          }

          tasks.forEach(task => {
              const li = document.createElement("li");
              li.classList.add("task-item");
              
              const contentDiv = document.createElement("div");
              contentDiv.style.display = "flex"; 
              contentDiv.style.alignItems = "center";
              contentDiv.style.width = "100%";

              const checkbox = document.createElement("input");
              checkbox.type = "checkbox";
              checkbox.checked = task.done;
              checkbox.style.marginRight = "10px";
              
              const span = document.createElement("span");
              span.textContent = task.text;
              span.style.flexGrow = "1";
              if (task.done) {
                  span.style.textDecoration = "line-through";
                  span.style.opacity = "0.6";
              }

              // Actions
              const actionsDiv = document.createElement("div");
              actionsDiv.className = "task-actions";
              actionsDiv.style.display = "flex";
              actionsDiv.style.gap = "8px";

              // EDIT BUTTON
              const editBtn = document.createElement("button");
              editBtn.textContent = "✏️";
              editBtn.className = "icon-btn";
              editBtn.onclick = (e) => {
                  e.stopPropagation();
                  editTaskFromList(task.id);
              };

              // DELETE BUTTON
              const deleteBtn = document.createElement("button");
              deleteBtn.textContent = "🗑️";
              deleteBtn.className = "icon-btn delete-btn";
              deleteBtn.onclick = (e) => {
                  e.stopPropagation();
                  deleteTaskFromList(task.id);
              };

              actionsDiv.appendChild(editBtn);
              actionsDiv.appendChild(deleteBtn);

              contentDiv.appendChild(checkbox);
              contentDiv.appendChild(span);
              contentDiv.appendChild(actionsDiv);
              li.appendChild(contentDiv);

              // Checkbox Logic (Visual only for now for Google)
              checkbox.addEventListener("change", () => {
                  task.done = checkbox.checked;
                  renderTasks();
              });

              taskListContainer.appendChild(li);
          });
          updateAnalytics();
      }

      function updateAnalytics() {
        const total = tasks.length;
        const done = tasks.filter(t => t.done).length;
        const pct = total === 0 ? 0 : Math.round((done / total) * 100);
        
        if (progressFill) progressFill.style.width = `${pct}%`;
        const txt = document.getElementById("progress-text-overlay");
        if (txt) txt.textContent = `${pct}%`;
        if (progressText) progressText.textContent = total === 0 ? "Немає завдань" : `Виконано ${done} з ${total}`;
      }

      // ADD TASK (To Today)
      if (addTaskForm) {
          addTaskForm.addEventListener("submit", async (e) => {
              e.preventDefault();
              const text = newTaskInput.value.trim();
              if (text) {
                  try {
                      await sendApiRequest("/add_task", { text }, null, "Додано!");
                      newTaskInput.value = "";
                      initializeTasks();
                  } catch (err) {
                      tg.showAlert("Error adding task");
                  }
              }
          });
      }

      // === EDIT & DELETE FUNCTIONS ===
      
      // Відкриває модалку в режимі редагування
      window.editTaskFromList = function(id) {
          const task = tasks.find(t => t.id === id);
          if (!task) return;
          
          const d = new Date();
          const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          
          // Викликаємо глобальну функцію
          openAddEventModal(todayStr, task);
      }

      window.deleteTaskFromList = async function(id) {
          if (confirm("Видалити цю подію з Google Calendar?")) {
              tasks = tasks.filter(t => t.id !== id); // Optimistic update
              renderTasks();
              await sendApiRequest("/api/delete_event", { eventId: id }, null, "Видалено");
              initializeTasks(); // Refresh to be sure
          }
      }

      // INITIALIZE
      async function initializeTasks() {
          try {
              taskListContainer.innerHTML = "<p>Завантаження...</p>";
              const d = new Date();
              const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
              
              const result = await fetchApi("/api/get_day_events", { date: dateStr });
              if (result.status === 'auth_required') {
                  taskListContainer.innerHTML = "<p>Потрібен вхід в Google (див. Календар)</p>";
                  return;
              }

              if (result.events) {
                  tasks = result.events.map(ev => ({
                      id: ev.id,
                      text: `${ev.time !== 'Весь день' ? '[' + ev.time + '] ' : ''}${ev.title}`,
                      done: false,
                      raw_title: ev.title,
                      raw_start: ev.raw_start,
                      is_all_day: ev.is_all_day
                  }));
              } else {
                  tasks = [];
              }
              renderTasks();
          } catch (e) {
              console.error(e);
              taskListContainer.innerHTML = "<p style='color:red'>Помилка завантаження.</p>";
          }
      }
      
      initializeTasksReference = initializeTasks; // Зберігаємо посилання
      initializeTasks();
  }

  // ===================================================================
  // ===== 6. WEATHER & MISC =====
  // ===================================================================
  const weatherInput = document.getElementById("weather-input");
  const weatherBtn = document.getElementById("weather-btn");
  const weatherResultDiv = document.getElementById("weather-result");

  const savedCity = localStorage.getItem("savedCity");
  if (savedCity && weatherInput) {
    weatherInput.value = savedCity;
    fetchWeather();
  }

  if (weatherBtn) weatherBtn.addEventListener("click", fetchWeather);
  if (weatherInput) {
      weatherInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
              e.preventDefault();
              fetchWeather();
          }
      });
  }

  async function fetchWeather() {
      const city = weatherInput.value.trim();
      if (!city || !backendUrl) return;
      
      weatherResultDiv.innerHTML = "Завантаження...";
      weatherResultDiv.style.display = "block";
      
      try {
          const result = await fetchApi("/get_weather_for_site", { city });
          weatherResultDiv.innerHTML = result.formatted_weather;
          localStorage.setItem("savedCity", city);
      } catch (e) {
          weatherResultDiv.innerHTML = `Помилка: ${e.message}`;
      }
  }

  // Timer logic...
  const timerDisplay = document.getElementById("timer-display");
  if (timerDisplay) {
      // (Той самий код таймера, що й був раніше, скорочено для зручності)
      let timeLeft = 25 * 60;
      let interval;
      
      function updateDisplay() {
          const m = Math.floor(timeLeft / 60).toString().padStart(2,'0');
          const s = (timeLeft % 60).toString().padStart(2,'0');
          timerDisplay.textContent = `${m}:${s}`;
      }
      
      document.getElementById("start-btn").addEventListener("click", () => {
          if (interval) return;
          interval = setInterval(() => {
              timeLeft--;
              updateDisplay();
              if (timeLeft <= 0) { clearInterval(interval); alert("Час вийшов!"); }
          }, 1000);
      });
      document.getElementById("pause-btn").addEventListener("click", () => {
          clearInterval(interval); interval = null;
      });
      document.getElementById("stop-btn").addEventListener("click", () => {
          clearInterval(interval); interval = null; timeLeft = 25 * 60; updateDisplay();
      });
  }

  // Logout
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
          if (confirm("Вийти?")) {
              await sendApiRequest("/api/logout", { chat_id: tg.initDataUnsafe?.user?.id }, null, "OK");
              tg.close();
          }
      });
  }
});
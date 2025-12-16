// ==================================================
//          ЛОГІКА КАЛЕНДАРЯ (FINAL: Silent Auto-Refresh)
// ==================================================
import { backendUrl, tg } from './config.js';
import { sendApiRequest, fetchApi } from './api.js';
import { startLoginPolling } from './auth.js';
import { initializeTasks } from './tasks.js'; 

export function initCalendar() {
    const monthYearDisplay = document.getElementById("month-year-display");
    if (monthYearDisplay) {
        const calendarGrid = document.getElementById("calendar-grid");
        const prevMonthBtn = document.getElementById("prev-month-btn");
        const nextMonthBtn = document.getElementById("next-month-btn");
        const addEventModalEl = document.getElementById("addEventModal");
        
        let autoRefreshInterval = null; 
        let autoRefreshTimeout = null;  

        let addEventModal;
        if (addEventModalEl) {
            addEventModal = new bootstrap.Modal(addEventModalEl);
            
            addEventModalEl.addEventListener('hidden.bs.modal', () => {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
                if (autoRefreshTimeout) {
                    clearTimeout(autoRefreshTimeout);
                    autoRefreshTimeout = null;
                }
                console.log("🛑 Модальне вікно закрито: всі оновлення зупинено.");
            });
        }

        const eventTitleInput = document.getElementById("event-title");
        const eventDateInput = document.getElementById("event-date");
        const eventTimeInput = document.getElementById("event-time");
        const eventEndTimeInput = document.getElementById("event-end-time");
        const allDayCheckbox = document.getElementById("all-day-checkbox");
        const calendarStatus = document.getElementById("add-task-status");
        
        let currentDate = new Date();

        // --- Render Calendar ---
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

            if (busyDates === null) return;

            calendarGrid.innerHTML = "";

            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);
            const daysInMonth = lastDayOfMonth.getDate();
            let startDayOfWeek = firstDayOfMonth.getDay();
            if (startDayOfWeek === 0) startDayOfWeek = 7;
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

                const cellDateISO = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2, "0")}`;
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

        // --- Open Modal Logic ---
        async function openAddEventModal(dateStr) {
            if (!addEventModal) return;

            // 1. Скидаємо форму
            document.getElementById("add-event-form").reset();
            eventDateInput.value = dateStr;
            eventTimeInput.disabled = false;
            eventEndTimeInput.disabled = false;

            // 2. Кнопка "Зберегти" (FIX з клонуванням)
            const oldBtn = document.getElementById("save-event-btn");
            const saveEventBtn = oldBtn.cloneNode(true); 
            oldBtn.parentNode.replaceChild(saveEventBtn, oldBtn);

            // Підготовка контейнера списку
            const modalBody = document.querySelector("#addEventModal .modal-body");
            const oldList = document.getElementById("modal-events-list");
            if (oldList) oldList.remove();

            const listContainer = document.createElement("div");
            listContainer.id = "modal-events-list";
            // Початковий текст (тільки для першого відкриття)
            listContainer.innerHTML = "<p>⏳ Завантаження подій...</p>";
            listContainer.style.marginBottom = "20px";
            listContainer.style.borderBottom = "1px solid rgba(255,255,255,0.2)";
            listContainer.style.paddingBottom = "15px";

            modalBody.insertBefore(listContainer, document.getElementById("add-event-form"));

            addEventModal.show();

            // --- Load Events (З параметром isBackgroundUpdate) ---
            async function loadEventsForDay(isBackgroundUpdate = false) {
                try {
                    if (!document.querySelector("#addEventModal.show")) return;
                    
                    // Якщо це ПЕРШЕ завантаження - блокуємо кнопку. 
                    // Якщо це АВТО-ОНОВЛЕННЯ - НЕ чіпаємо кнопку і інтерфейс.
                    if (!isBackgroundUpdate) {
                        saveEventBtn.disabled = true;
                        listContainer.style.opacity = "0.6"; // Легкий візуальний ефект
                    }

                    const result = await fetchApi("/api/get_day_events", { date: dateStr });
                    
                    if (result.status === "success") {
                        // Формуємо новий HTML для списку
                        let newContent = `<h6>Події на ${dateStr}:</h6>`;
                        
                        if (result.events && result.events.length > 0) {
                            const ul = document.createElement("ul");
                            ul.style.listStyleType = "none";
                            ul.style.padding = "0";

                            result.events.forEach(ev => {
                                const li = document.createElement("li");
                                li.style.background = "rgba(255,255,255,0.1)";
                                li.style.marginBottom = "5px";
                                li.style.padding = "8px 12px";
                                li.style.borderRadius = "8px";
                                li.style.display = "flex";
                                li.style.justifyContent = "space-between";
                                li.style.alignItems = "center";

                                const textSpan = document.createElement("span");
                                textSpan.innerHTML = `<strong>${ev.time || ''}</strong> ${ev.title}`;
                                textSpan.style.flexGrow = "1";
                                textSpan.style.marginRight = "10px";

                                const actionsDiv = document.createElement("div");
                                actionsDiv.style.display = "flex";
                                actionsDiv.style.gap = "5px";

                                // Edit
                                const editBtn = document.createElement("button");
                                editBtn.textContent = "✏️";
                                editBtn.className = "icon-btn"; 
                                editBtn.onclick = async () => {
                                    const newText = prompt("Змінити назву події:", ev.title);
                                    if (newText && newText.trim() !== "" && newText !== ev.title) {
                                        li.style.opacity = "0.5"; 
                                        try {
                                            await sendApiRequest("/api/update_event_title", { eventId: ev.id, text: newText.trim() });
                                            await loadEventsForDay(true); // Тихе оновлення
                                            if (typeof initializeTasks === 'function') initializeTasks(); 
                                        } catch (e) {
                                            alert("Помилка редагування: " + e.message);
                                            li.style.opacity = "1";
                                        }
                                    }
                                };

                                // Delete
                                const deleteBtn = document.createElement("button");
                                deleteBtn.textContent = "🗑️";
                                deleteBtn.className = "icon-btn delete-btn"; 
                                deleteBtn.onclick = async () => {
                                    if (confirm("Видалити цю подію?")) {
                                        li.style.opacity = "0.5";
                                        try {
                                            await sendApiRequest("/api/delete_event", { eventId: ev.id });
                                            await loadEventsForDay(true); // Тихе оновлення
                                            await renderCalendar();   
                                            if (typeof initializeTasks === 'function') initializeTasks();
                                        } catch (e) {
                                            alert("Помилка видалення: " + e.message);
                                            li.style.opacity = "1";
                                        }
                                    }
                                };

                                if (result.is_past) {
                                    editBtn.disabled = true;
                                    deleteBtn.disabled = true;
                                    editBtn.style.opacity = "0.3";
                                }

                                actionsDiv.appendChild(editBtn);
                                actionsDiv.appendChild(deleteBtn);
                                li.appendChild(textSpan);
                                li.appendChild(actionsDiv);
                                ul.appendChild(li);
                            });
                            // Тут ми не можемо просто додати string, треба вставити елемент
                            // Тому трохи змінимо логіку: очистимо контейнер і додамо
                            listContainer.innerHTML = "";
                            listContainer.innerHTML = `<h6>Події на ${dateStr}:</h6>`;
                            listContainer.appendChild(ul);
                        } else {
                            listContainer.innerHTML = `<h6>Події на ${dateStr}:</h6><p style='opacity:0.7'>Подій немає</p>`;
                        }

                        // Повертаємо прозорість
                        listContainer.style.opacity = "1";

                        // Логіка кнопки Зберегти
                        // Ми змінюємо стан кнопки ТІЛЬКИ якщо це не фонове оновлення АБО якщо час реально вийшов
                        if (result.is_past) {
                            saveEventBtn.disabled = true;
                            saveEventBtn.textContent = "Минулий час";
                            saveEventBtn.classList.remove("btn-primary");
                            saveEventBtn.classList.add("btn-secondary");
                            document.getElementById("event-title").disabled = true;
                        } else {
                            // Якщо це фонове оновлення, ми НЕ ВМИКАЄМО кнопку примусово, якщо користувач її натиснув
                            // Але якщо це ініціалізація - вмикаємо.
                            if (!saveEventBtn.disabled || !isBackgroundUpdate) {
                                saveEventBtn.disabled = false;
                                saveEventBtn.textContent = "Зберегти";
                                saveEventBtn.classList.add("btn-primary");
                                saveEventBtn.classList.remove("btn-secondary");
                                document.getElementById("event-title").disabled = false;
                            }
                        }
                    }
                } catch (e) {
                    console.error("Помилка списку подій:", e);
                    // При помилці в фоні - просто ігноруємо, не ламаємо інтерфейс
                }
            }

            // 1. ПЕРШЕ ЗАВАНТАЖЕННЯ (З блокуванням)
            await loadEventsForDay(false);

            // 2. Таймери
            if (autoRefreshInterval) clearInterval(autoRefreshInterval);
            if (autoRefreshTimeout) clearTimeout(autoRefreshTimeout);

            // 3. АВТО-ОНОВЛЕННЯ (Без блокування, параметр true)
            autoRefreshInterval = setInterval(() => {
                loadEventsForDay(true);
            }, 30000); 

            autoRefreshTimeout = setTimeout(() => {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }, 120000);

            // --- Click Listener for Button ---
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

                // Візуальна реакція
                const originalText = saveEventBtn.textContent;
                saveEventBtn.textContent = "⏳...";
                saveEventBtn.disabled = true; // Блокуємо, щоб не клікали двічі

                const payload = {
                    title: title,
                    date: date,
                    time: isAllDay ? null : time || null,
                    end_time: isAllDay ? null : endTime || null,
                    all_day: isAllDay,
                };

                try {
                    await sendApiRequest("/add_event", payload, calendarStatus, "Подію додано!");
                    
                    document.getElementById("add-event-form").reset();
                    eventDateInput.value = dateStr; 
                    
                    // Оновлюємо список тихо, щоб не блимало
                    await loadEventsForDay(true); 
                    await renderCalendar(); 
                    if (typeof initializeTasks === 'function') initializeTasks(); 

                } catch (error) {
                    console.error("Помилка збереження:", error);
                    alert(`❌ Помилка: ${error.message}`);
                } finally {
                    saveEventBtn.textContent = originalText;
                    saveEventBtn.disabled = false; // Розблоковуємо
                }
            });
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

        async function fetchEventDates(year, month) {
            const userId = tg.initDataUnsafe?.user?.id;
            if (!backendUrl || !userId) return [];

            const payload = { userId: userId, year: year, month: month };

            try {
                const response = await fetch(`${backendUrl}/get_events`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                if (response.status === 401) {
                    const result = await response.json();
                    if (calendarGrid) {
                        calendarGrid.innerHTML = `
                            <div style="grid-column: 1 / -1; text-align: center; padding: 30px 10px;">
                                <p>⚠️ Потрібен доступ</p>
                                <button onclick="Telegram.WebApp.openLink('${result.login_url}')" class="btn btn-primary">🔐 Увійти через Google</button>
                            </div>`;
                    }
                    startLoginPolling(); 
                    return null;
                }
                const result = await response.json();
                return (result.status === "success" && Array.isArray(result.event_dates)) ? result.event_dates : [];
            } catch (error) {
                console.error("Помилка fetchEventDates:", error);
                return [];
            }
        }

        renderCalendar();
    }
}
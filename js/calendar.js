// ==================================================
//          ЛОГІКА КАЛЕНДАРЯ
// ==================================================
import { backendUrl, tg } from './config.js';
import { sendApiRequest, fetchApi } from './api.js';
import { startLoginPolling } from './auth.js';
import { initializeTasks } from './tasks.js'; // Імпортуємо функцію оновлення завдань

export function initCalendar() {
    const monthYearDisplay = document.getElementById("month-year-display");
    if (monthYearDisplay) {
        const calendarGrid = document.getElementById("calendar-grid");
        const prevMonthBtn = document.getElementById("prev-month-btn");
        const nextMonthBtn = document.getElementById("next-month-btn");
        const addEventModalEl = document.getElementById("addEventModal");
        
        // Ініціалізація Bootstrap Modal (безпечна перевірка)
        let addEventModal;
        if (addEventModalEl) {
            addEventModal = new bootstrap.Modal(addEventModalEl);
        }

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
            if (!addEventModal) return;

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
                    if(addEventModal) addEventModal.hide();
                    await renderCalendar(); 
                    
                    // Оновлюємо список завдань, якщо функція доступна
                    if (typeof initializeTasks === 'function') {
                        initializeTasks(); 
                    }

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
                
                // Запускаємо поллінг (з auth.js)
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
}
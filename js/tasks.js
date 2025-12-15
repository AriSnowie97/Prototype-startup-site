// ===================================================================
// ===== 2. ЗАВДАННЯ ТА АНАЛІТИКА (Google Sync) =====
// ===================================================================
import { sendApiRequest, fetchApi } from './api.js';
import { tg } from './config.js';

let tasks = []; 
export let initializeTasks; // Експортуємо функцію, щоб її міг викликати календар

export function initTasks() {
  const taskListContainer = document.querySelector("#tasks ul");

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

    // Присвоюємо значення змінній initializeTasks
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
}
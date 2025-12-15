// ==================================================
//          РЕЖИМ КОНЦЕНТРАЦІЇ (TIMER)
// ==================================================

export function initTimer() {
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

        if(startBtn) startBtn.addEventListener("click", startTimer);
        if(pauseBtn) pauseBtn.addEventListener("click", pauseTimer);
        if(stopBtn) stopBtn.addEventListener("click", stopTimer);

        updateTimerDisplay();
    }
}
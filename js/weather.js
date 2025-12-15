// ==================================================
//          ЛОГІКА: ПОГОДА
// ==================================================
import { backendUrl, tg } from './config.js';

export function initWeather() {
    const weatherInput = document.getElementById("weather-input");
    const weatherBtn = document.getElementById("weather-btn");
    const weatherResultDiv = document.getElementById("weather-result");

    // Авто-завантаження погоди при старті
    const savedCity = localStorage.getItem("savedCity");
    if (savedCity && weatherInput) {
        weatherInput.value = savedCity;
        fetchWeather(); 
    }

    if (weatherBtn) {
        weatherBtn.addEventListener("click", fetchWeather);

        // Enter теж працює
        weatherInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault(); 
            fetchWeather();
        }
        });
    }

    async function fetchWeather() {
        const city = weatherInput.value.trim();
        if (!city) {
        if(weatherResultDiv) {
            weatherResultDiv.innerHTML = "Будь ласка, введіть назву міста.";
            weatherResultDiv.style.color = "red";
            weatherResultDiv.style.display = "block";
        }
        return;
        }

        const userId = tg.initDataUnsafe?.user?.id;
        if (!backendUrl || !userId) {
        if(weatherResultDiv) {
            weatherResultDiv.innerHTML = "❌ Помилка: Не вдалося отримати ID користувача.";
            weatherResultDiv.style.color = "red";
            weatherResultDiv.style.display = "block";
        }
        return;
        }

        if(weatherResultDiv) {
            weatherResultDiv.innerHTML = "Завантаження...";
            weatherResultDiv.style.color = "orange"; 
            weatherResultDiv.style.display = "block";
        }

        const payload = {
            userId: userId,
            city: city,
        };

        try {
        const response = await fetch(`${backendUrl}/get_weather_for_site`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error("Помилка мережі");
        }

        const result = await response.json();

        if (result.status === "success") {
            if(weatherResultDiv) {
                weatherResultDiv.innerHTML = result.formatted_weather;
                weatherResultDiv.style.color = ""; 
            }
            localStorage.setItem("savedCity", city);
        } else {
            throw new Error(result.message);
        }
        } catch (error) {
        console.error("Помилка fetchWeather:", error);
        if(weatherResultDiv) {
            weatherResultDiv.innerHTML = `❌ Помилка: ${error.message}`;
            weatherResultDiv.style.color = "red";
        }
        }
    }
}
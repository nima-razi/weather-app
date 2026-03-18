// Clear the input field on page load
window.onload = function() {
    document.getElementById('city').value = '';
};

const cityInput = document.getElementById('city');
const datalist = document.getElementById('city-list');
const apiKey = 'a2ed853528c8c6416f230af509878eac';

// We'll store the Lat/Lon of the results here to use in getWeather
let cityCoords = {}; 

// 1. Live Autocomplete via OpenWeather Geocoding API
let debounceTimer;
cityInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    const selection = this.value.trim();

    // IMMEDIATE ACTION: Trigger weather search if user clicks a suggestion
    if (cityCoords[selection]) {
        getWeather();
        return; 
    }

    if (selection.length < 3) {
        datalist.innerHTML = ''; // Clear suggestions if input is too short
        return; 
    }

    debounceTimer = setTimeout(async () => {
        try {
            // Use OpenWeather Geocoding API (more reliable with your existing key)
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/direct?q=${selection}&limit=5&appid=${apiKey}`
            );
            
            if (!response.ok) throw new Error('Network response was not ok');
            
            const cities = await response.json();

            datalist.innerHTML = '';
            const newCoords = {}; 

            const fragment = document.createDocumentFragment();
            cities.forEach(city => {
                // Create a readable name: "City Name, State (if exists), Country"
                const displayName = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`;
                
                newCoords[displayName] = { lat: city.lat, lon: city.lon };

                const option = document.createElement('option');
                option.value = displayName;
                fragment.appendChild(option);
            });

            cityCoords = newCoords; 
            datalist.appendChild(fragment);
            
        } catch (err) {
            console.error('Geocoding error:', err);
        }
    }, 400); 
});

// 2. Main Weather Fetch
async function getWeather() {
    const selection = cityInput.value;
    
    // Hide keyboard/datalist once a selection is made
    cityInput.blur();

    let url, forecastUrl;

    if (cityCoords[selection]) {
        const { lat, lon } = cityCoords[selection];
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    } else {
        const cityName = selection.split(',')[0].trim();
        if (!cityName) return;
        url = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${apiKey}`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=metric&appid=${apiKey}`;
    }

    try {
        const [weatherRes, forecastRes] = await Promise.all([fetch(url), fetch(forecastUrl)]);
        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        if (weatherData.cod !== 200) throw new Error(weatherData.message);

        displayWeather(weatherData);
        displayHourlyForecast(forecastData.list);
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function displayWeather(data) {
    const tempDivInfo = document.getElementById('temp-div');
    const weatherInfoDiv = document.getElementById('weather-info');
    const weatherIcon = document.getElementById('weather-icon');
    const hourlyForecastDiv = document.getElementById('hourly-forecast');

    // Clear prevoius content
    weatherInfoDiv.innerHTML = '';
    hourlyForecastDiv.innerHTML = '';
    tempDivInfo.innerHTML = '';

    if (data.cod === '404') {
        weatherInfoDiv.innerHTML = `<p>${data.message}</p>`;
    } else {
        const cityName = data.name;
        const temperature = Math.round(data.main.temp);
        const description = data.weather[0].description;
        const iconCode = data.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
        const temperatureHTML = `<h1>${temperature}°C</h1>`;
        const weatherHTML = `<div class="hstack gap-2 pb-4"><h3 class="text-secondary">${cityName} - </h3><h3 class="text-capitalize text-secondary">${description}</h3></div>`;

        tempDivInfo.innerHTML = temperatureHTML;
        weatherInfoDiv.innerHTML = weatherHTML;
        weatherIcon.src = iconUrl;
        weatherIcon.alt = description;

        showImage();
    }
}

function displayHourlyForecast(hourlyData) {
    const hourlyForecastDiv = document.getElementById('hourly-forecast');
    const next24Hours = hourlyData.slice(0, 8);

    next24Hours.forEach(item => {
        const dateTime = new Date(item.dt * 1000);
        const hour = dateTime.getHours();
        const temperature = Math.round(item.main.temp);
        const iconCode = item.weather[0].icon;
        const iconUrl = `https://openweathermap.org/img/wn/${iconCode}.png`;

        const hourlyItemHTML = `<div class="hourly-item text-center px-2">
                                    <span>${hour}:00</span><br>
                                    <img class="img-fluid" src="${iconUrl}" alt="Hourly Weather Icon"><br>
                                    <span>${temperature}°C</span>
                                </div>`;
        hourlyForecastDiv.innerHTML += hourlyItemHTML;
    });
}

function showImage() {
    const weatherIcon = document.getElementById('weather-icon');
    weatherIcon.style.display = 'block';
}
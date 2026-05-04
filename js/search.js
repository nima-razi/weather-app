const apiKey = 'a2ed853528c8c6416f230af509878eac';

// Elements - will be initialized when DOM is ready
let historyContainer;
let cityInput;
let datalist;

// Initialize DOM elements and render history on page load
window.addEventListener('DOMContentLoaded', async function() {
    historyContainer = document.getElementById('search-history');
    cityInput = document.getElementById('city');
    datalist = document.getElementById('city-list');
    
    cityInput.value = '';
    await loadLocalCities();
    renderHistory();
    setupInputListener();
});

// We'll store the Lat/Lon of the results here to use in getWeather
let cityCoords = {};
let localCities = [];

async function loadLocalCities() {
    try {
        const response = await fetch('js/cities.json');
        if (!response.ok) throw new Error('Failed to load local cities');
        localCities = await response.json();
    } catch (err) {
        console.error('Failed to load local cities:', err);
        localCities = [];
    }
}

// Function to set up input listener
function getLocalCityMatches(query) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    return localCities
        .filter(city => {
            const label = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`.toLowerCase();
            return label.startsWith(normalized) || label.includes(` ${normalized}`) || city.name.toLowerCase().includes(normalized);
        })
        .slice(0, 8);
}

function showCitySuggestions(cities) {
    const fragment = document.createDocumentFragment();
    const newCoords = {};

    cities.forEach(city => {
        const displayName = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`;
        newCoords[displayName] = { lat: city.lat, lon: city.lon };

        const option = document.createElement('option');
        option.value = displayName;
        fragment.appendChild(option);
    });

    cityCoords = newCoords;
    datalist.innerHTML = '';
    datalist.appendChild(fragment);
}

function setupInputListener() {
    let debounceTimer;
    
    cityInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        const selection = this.value.trim();

        // IMMEDIATE ACTION: Trigger weather search if user clicks a suggestion
        if (cityCoords[selection]) {
            getWeather();
            return; 
        }

        if (!selection) {
            datalist.innerHTML = '';
            cityCoords = {};
            return;
        }

        const localMatches = getLocalCityMatches(selection);
        if (localMatches.length > 0) {
            showCitySuggestions(localMatches);
            return;
        }

        if (selection.length < 3) {
            datalist.innerHTML = ''; // Clear suggestions if input is too short
            cityCoords = {};
            return; 
        }

        debounceTimer = setTimeout(async () => {
            try {
                // Use OpenWeather Geocoding API when local matches are not available
                const response = await fetch(
                    `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(selection)}&limit=5&appid=${apiKey}`
                );
                
                if (!response.ok) throw new Error('Network response was not ok');
                
                const cities = await response.json();

                const fragment = document.createDocumentFragment();
                const newCoords = {}; 

                cities.forEach(city => {
                    // Create a readable name: "City Name, State (if exists), Country"
                    const displayName = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`;
                    
                    newCoords[displayName] = { lat: city.lat, lon: city.lon };

                    const option = document.createElement('option');
                    option.value = displayName;
                    fragment.appendChild(option);
                });

                cityCoords = newCoords; 
                datalist.innerHTML = '';
                datalist.appendChild(fragment);
                
            } catch (err) {
                console.error('Geocoding error:', err);
            }
        }, 400);
    });
}

// 1. Function to render badges from LocalStorage
function renderHistory() {
    if (!historyContainer) return; // Exit if DOM not ready
    
    const history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    historyContainer.innerHTML = ''; // Clear current badges

    history.forEach((city, index) => {
        const badge = document.createElement('button');
        badge.className = 'badge search-history-badge bg-light text-dark border-0 me-1 mb-1';
        badge.type = 'button';
        badge.title = `Click to search: ${city}`;
        badge.innerHTML = `${city} <span class="badge-close">&times;</span>`;

        // When clicked on city name, search
        badge.addEventListener('click', (e) => {
            // If close button was clicked, delete instead
            if (e.target.classList.contains('badge-close') || e.target.closest('.badge-close')) {
                e.preventDefault();
                e.stopPropagation();
                removeFromHistory(index);
            } else {
                // Otherwise, search for the city
                e.preventDefault();
                cityInput.value = city;
                getWeather();
            }
        });

        historyContainer.appendChild(badge);
    });
}

// 1.5 Function to remove a city from history by index
function removeFromHistory(index) {
    let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];
    history.splice(index, 1);
    localStorage.setItem('weatherHistory', JSON.stringify(history));
    renderHistory();
}

// 2. Function to save a new city to the list
function saveToHistory(city) {
    if (!city) return;

    let history = JSON.parse(localStorage.getItem('weatherHistory')) || [];

    // Clean up: Remove city if it already exists (to avoid duplicates)
    history = history.filter(item => item.toLowerCase() !== city.toLowerCase());

    // Add to the beginning of the array
    history.unshift(city);

    // Limit to the last 5 or 6 searches
    history = history.slice(0, 5);

    localStorage.setItem('weatherHistory', JSON.stringify(history));
    renderHistory();
}

async function resolveCityCoordinates(selection) {
    const query = selection.trim();
    if (!query) return null;

    if (cityCoords[query]) {
        return {
            lat: cityCoords[query].lat,
            lon: cityCoords[query].lon,
            label: query,
        };
    }

    const normalized = query.toLowerCase();
    const cachedKey = Object.keys(cityCoords).find(key => {
        const lowerKey = key.toLowerCase();
        return lowerKey.startsWith(normalized) || lowerKey.includes(normalized);
    });
    if (cachedKey) {
        return {
            lat: cityCoords[cachedKey].lat,
            lon: cityCoords[cachedKey].lon,
            label: cachedKey,
        };
    }

    const localMatch = localCities.find(city => {
        const label = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`.toLowerCase();
        return label.startsWith(normalized) || label.includes(normalized);
    });
    if (localMatch) {
        const label = `${localMatch.name}${localMatch.state ? ', ' + localMatch.state : ''}, ${localMatch.country}`;
        return {
            lat: localMatch.lat,
            lon: localMatch.lon,
            label,
        };
    }

    try {
        const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${apiKey}`
        );
        if (!response.ok) throw new Error('Network response was not ok');

        const cities = await response.json();
        if (!cities || cities.length === 0) return null;

        const city = cities[0];
        const label = `${city.name}${city.state ? ', ' + city.state : ''}, ${city.country}`;
        return {
            lat: city.lat,
            lon: city.lon,
            label,
        };
    } catch (err) {
        console.error('Geocoding fallback error:', err);
        return null;
    }
}

// 2. Main Weather Fetch
async function getWeather() {
    const selection = cityInput.value.trim();
    if (!selection) return;

    cityInput.blur();
    let url, forecastUrl;
    const resolved = await resolveCityCoordinates(selection);

    if (resolved) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${resolved.lat}&lon=${resolved.lon}&units=metric&appid=${apiKey}`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${resolved.lat}&lon=${resolved.lon}&units=metric&appid=${apiKey}`;
        saveToHistory(resolved.label);
    } else {
        const cityName = selection.split(',')[0].trim();
        if (!cityName) return;
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cityName)}&units=metric&appid=${apiKey}`;
        forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cityName)}&units=metric&appid=${apiKey}`;
        saveToHistory(selection);
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
let citiesData = {};
const cityInput = document.getElementById('city');
cityInput.disabled = true;

fetch('scripts/countries.min.json')
    .then(response => response.json())
    .then(data => {
        citiesData = data;
        cityInput.disabled = false; // Enable input once data is loaded
    })
    .catch(error => console.error('Error loading cities:', error));

let debounceTimer;
cityInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const input = this.value.toLowerCase();
        const datalist = document.getElementById('city-list');
        datalist.innerHTML = ''; // Clear previous options

        if (input.length > 1 && Object.keys(citiesData).length) { // Check for loaded data
            const fragment = document.createDocumentFragment(); // Use fragment for performance
            for (let country in citiesData) {
                if (citiesData.hasOwnProperty(country)) {
                    citiesData[country].forEach(city => {
                        if (city.toLowerCase().startsWith(input)) {
                            const option = document.createElement('option');
                            option.value = `${city}, ${country}`;
                            fragment.appendChild(option);
                        }
                    });
                }
            }
            datalist.appendChild(fragment); // Append all options at once
        }
    }, 300); // 300ms debounce delay
});
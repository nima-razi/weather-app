let citiesData = {};
const cityInput = document.getElementById('city');
cityInput.disabled = true;

fetch('data/countries.min.json')
    .then(response => response.json())
    .then(data => {
        citiesData = data;
        cityInput.disabled = false; // Enable input once data is loaded
    })
    .catch(error => console.error('Error loading cities:', error));

let debounceTimer;
cityInput.addEventListener('input', function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const input = this.value.toLowerCase();
        const datalist = document.getElementById('city-list');
        datalist.innerHTML = '';

        if (input.length > 1 && Object.keys(citiesData).length) {
            const fragment = document.createDocumentFragment();
            let matchCount = 0;

            outer: for (let country in citiesData) {
                if (citiesData.hasOwnProperty(country)) {
                    for (let city of citiesData[country]) {
                        if (city.toLowerCase().includes(input)) {
                            const option = document.createElement('option');
                            option.value = `${city}, ${country}`;
                            fragment.appendChild(option);
                            matchCount++;

                            if (matchCount >= 10) break outer;
                        }
                    }
                }
            }

            datalist.appendChild(fragment);
        }
    }, 300);
});
function getLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(showPosition, showError);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showPosition(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;

    // Use reverse geocoding to get the city name
    reverseGeocode(latitude, longitude);
}

function reverseGeocode(latitude, longitude) {
    // Using OpenStreetMap's Nominatim reverse geocoding service
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data && data.address) {
                // Set the city input field with the city name or town/village if city is unavailable
                const city = data.address.city || data.address.town || data.address.village || data.address.hamlet;
                if (city) {
                    document.getElementById("city").value = city;
                } else {
                    alert("City not found.");
                }
            } else {
                alert("City not found.");
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert("Unable to retrieve location.");
        });
}

function showError(error) {
    switch(error.code) {
        case error.PERMISSION_DENIED:
            alert("User denied the request for Geolocation.");
            break;
        case error.POSITION_UNAVAILABLE:
            alert("Location information is unavailable.");
            break;
        case error.TIMEOUT:
            alert("The request to get user location timed out.");
            break;
        case error.UNKNOWN_ERROR:
            alert("An unknown error occurred.");
            break;
    }
}
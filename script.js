// ---------- Step 1: Grab the page elements we need ----------
const form = document.getElementById("search-form");
const input = document.getElementById("city-input");
const button = document.getElementById("search-button");
const messageBox = document.getElementById("message");
const resultBox = document.getElementById("result");

// ---------- Step 2: Weather codes -> readable text ----------
// The API returns a number (WMO weather code). This table turns it into words.
const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Freezing fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  56: "Freezing drizzle", 57: "Heavy freezing drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  66: "Freezing rain", 67: "Heavy freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light rain showers", 81: "Rain showers", 82: "Violent rain showers",
  85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm with hail"
};

// ---------- Step 3: Small helper functions to show/hide messages ----------
function showMessage(text, type) {
  messageBox.textContent = text;
  messageBox.className = type;        // "error" or "info" (styled in style.css)
  messageBox.hidden = false;
}

function hideMessage() {
  messageBox.hidden = true;
}

// ---------- Step 4: Check what the user typed ----------
// Returns an error text if the input is bad, or "" if it is fine.
function validateCity(city) {
  if (city === "") return "Please enter a city name.";
  if (city.length < 2) return "City name is too short.";
  if (/\d/.test(city)) return "City names should not contain numbers.";
  return "";
}

// ---------- Step 5: Ask the API where the city is ----------
// Open-Meteo's geocoding API turns a city name into latitude/longitude.
async function findCity(city) {
  const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" +
              encodeURIComponent(city);

  const response = await fetch(url);
  if (!response.ok) throw new Error("SERVER");

  const data = await response.json();

  // When nothing matches, the API leaves out "results" completely.
  if (!data.results || data.results.length === 0) throw new Error("NOT_FOUND");

  return data.results[0];
}

// ---------- Step 6: Ask the API for the weather at that location ----------
async function getWeather(latitude, longitude) {
  const url = "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + latitude +
    "&longitude=" + longitude +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m" +
    "&timezone=auto";

  const response = await fetch(url);
  if (!response.ok) throw new Error("SERVER");

  const data = await response.json();

  if (!data.current) throw new Error("NO_DATA");

  return data;
}

// ---------- Step 7: Put the weather on the page ----------
function showWeather(place, weather) {
  const current = weather.current;
  const units = weather.current_units;

  // If a value is missing, show "N/A" instead of "undefined".
  const read = (value, unit) =>
    value === undefined || value === null ? "N/A" : value + unit;

  document.getElementById("city-name").textContent = place.name;
  document.getElementById("country-name").textContent =
    [place.admin1, place.country].filter(Boolean).join(", ");

  document.getElementById("temperature").textContent =
    read(current.temperature_2m, units.temperature_2m);

  document.getElementById("condition").textContent =
    WEATHER_CODES[current.weather_code] || "Conditions unavailable";

  document.getElementById("feels-like").textContent =
    read(current.apparent_temperature, units.apparent_temperature);
  document.getElementById("humidity").textContent =
    read(current.relative_humidity_2m, units.relative_humidity_2m);
  document.getElementById("wind").textContent =
    read(current.wind_speed_10m, " " + units.wind_speed_10m);

  resultBox.hidden = false;
}

// ---------- Step 8: Run everything when the form is submitted ----------
form.addEventListener("submit", async function (event) {
  event.preventDefault();             // stop the page from reloading

  const city = input.value.trim();
  resultBox.hidden = true;

  // Check the input first
  const problem = validateCity(city);
  if (problem) {
    showMessage(problem, "error");
    return;
  }

  showMessage("Loading weather...", "info");
  button.disabled = true;

  try {
    const place = await findCity(city);
    const weather = await getWeather(place.latitude, place.longitude);
    hideMessage();
    showWeather(place, weather);
  } catch (error) {
    // Show a friendly message for each kind of failure
    if (error.message === "NOT_FOUND") {
      showMessage('We could not find "' + city + '". Check the spelling and try again.', "error");
    } else if (error.message === "SERVER") {
      showMessage("The weather service had a problem. Please try again in a moment.", "error");
    } else if (error.message === "NO_DATA") {
      showMessage("Weather data is not available for this location right now.", "error");
    } else {
      // fetch() itself fails (TypeError) when there is no internet
      showMessage("Could not connect. Check your internet connection and try again.", "error");
    }
  } finally {
    button.disabled = false;          // always re-enable the button
  }
});
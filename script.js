const CACHE_KEY = "movies_cache";
const CSV_URL =
    "https://docs.google.com/spreadsheets/d/1d34tKIHhvrtr1XP4iEjRDZrxMYpmwr7b123JzaOyyWo/export?format=csv&gid=991143387";

function setCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function getCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
}

let movies = [];

async function loadMoviesFromCSV() {
    const response = await fetch(
    `${CSV_URL}&t=${Date.now()}`
);
    
    const text = await response.text();

    const rows = text.trim().split(/\r?\n/);

    const data = rows.slice(1).map(row => {
        const values = row.split(",");

        return {
            title: values[1]?.trim() || "",
            year: values[2]?.trim() || "",
            medium: values[3]?.trim() || "",
            length: parseInt(values[4]) || 0,
            vibes: (values[5] || "")
                .split("|")
                .map(v => v.trim())
                .filter(Boolean)
        };
    });

    setCache(data);
    return data;
}

async function loadMovies() {
    const cached = getCache();

    if (cached) {
        movies = cached;
    } else {
        movies = await loadMoviesFromCSV();
    }

    populateMediums();
    populateVibes();
}

function populateMediums() {
    const mediums = [...new Set(movies.map(m => m.medium))].sort();
    const select = document.getElementById("medium");

    mediums.forEach(medium => {
        const option = document.createElement("option");
        option.value = medium;
        option.textContent = medium;
        select.appendChild(option);
    });
}

function populateVibes() {
    const allVibes = [...new Set(
        movies.flatMap(movie => movie.vibes)
    )].sort();

    const container = document.getElementById("vibesContainer");

    allVibes.forEach(vibe => {
        const label = document.createElement("label");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = vibe;
        checkbox.className = "vibe-checkbox";

        label.appendChild(checkbox);
        label.append(" " + vibe);

        container.appendChild(label);
    });
}

document.getElementById("pickMovie").addEventListener("click", () => {

    const medium = document.getElementById("medium").value;
    const maxLength = parseInt(document.getElementById("length").value);

    const selectedVibes = [...document.querySelectorAll(".vibe-checkbox:checked")]
        .map(cb => cb.value);

    const filtered = movies.filter(movie => {

        const mediumMatch =
            !medium || movie.medium === medium;

    const lengthMatch =
            movie.length <= maxLength;

        const vibesMatch =
            selectedVibes.every(vibe =>
                movie.vibes.includes(vibe)
            );

        return mediumMatch && lengthMatch && vibesMatch;
    });

    const result = document.getElementById("result");

    if (filtered.length === 0) {
        result.textContent = "change your search and try again.";
        return;
    }

    const movie =
        filtered[Math.floor(Math.random() * filtered.length)];

    result.textContent =
        movie.year
            ? `${movie.title} (${movie.year})`
            : movie.title;
});

let lastRandomIndex = -1;

document.getElementById("randomMovie").addEventListener("click", () => {
    const result = document.getElementById("result");

    if (!movies || movies.length === 0) {
        result.textContent = "movies still loading...";
        return;
    }

    let index = Math.floor(Math.random() * movies.length);

    const movie = movies[index];

    result.textContent =
        movie.year
            ? `${movie.title} (${movie.year})`
            : movie.title;
});

document.getElementById("refreshData").addEventListener("click", async (e) => {
    e.preventDefault();

    localStorage.removeItem(CACHE_KEY);

    movies = await loadMoviesFromCSV();

    document.getElementById("medium").innerHTML =
        '<option value="">any medium</option>';

    document.getElementById("vibesContainer").innerHTML = "";

    populateMediums();
    populateVibes();

    document.getElementById("result").textContent = "mmm... fresh data.";
});


loadMovies();

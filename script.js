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
let selectedVibes = new Set();
let selectedDecades = new Set();

async function loadMoviesFromCSV() {
    console.log("fetching...");
    const response = await fetch(
    `${CSV_URL}&t=${Date.now()}`
);
    
    const text = await response.text();

    console.log("done!");

const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true
});

const data = parsed.data.map(row => {
    return {
        title: row.title?.trim() || "",
        year: row.year || "",
        medium: row.medium || "",
        length: Number(row.length) || 0,
        vibes: (row.vibes || "")
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

function populateDecades() {
    const container = document.getElementById("decadesContainer");

    const decades = [...new Set(
        movies
            .map(m => Number(m.year))
            .filter(y => !isNaN(y))
            .map(year => Math.floor(year / 10) * 10)
    )].sort((a, b) => a - b);

    container.innerHTML = "";

    decades.forEach(decadeStart => {
        const chip = document.createElement("button");
        chip.className = "decade-chip";
        chip.textContent = `${decadeStart}s`;
        chip.dataset.decade = decadeStart;

        chip.addEventListener("click", () => {
            chip.classList.toggle("active");

            if (selectedDecades.has(decadeStart)) {
                selectedDecades.delete(decadeStart);
            } else {
                selectedDecades.add(decadeStart);
            }
        });

        container.appendChild(chip);
    });
}

function populateVibes() {
    const allVibes = [...new Set(
        movies.flatMap(movie => movie.vibes)
    )].sort();

    const container = document.getElementById("vibesContainer");
    container.innerHTML = "";

    allVibes.forEach(vibe => {
        const chip = document.createElement("button");
        chip.className = "vibe-chip";
        chip.textContent = vibe;
        chip.dataset.vibe = vibe;

        chip.addEventListener("click", () => {
            chip.classList.toggle("active");

            if (selectedVibes.has(vibe)) {
                selectedVibes.delete(vibe);
            } else {
                selectedVibes.add(vibe);
            }
        });

        container.appendChild(chip);
    });
}

document.getElementById("pickMovie").addEventListener("click", () => {

    const medium = document.getElementById("medium").value;
    const maxLength = parseInt(document.getElementById("length").value);

    const selectedVibesArray = [...selectedVibes];

    const selectedDecadesArray = [...selectedDecades];

    const filtered = movies.filter(movie => {

        const mediumMatch =
            !medium || movie.medium === medium;

    const lengthMatch =
            movie.length <= maxLength;

        const vibesMatch =
    selectedVibesArray.every(vibe =>
        movie.vibes.includes(vibe)
    );

        const decadeMatch =
    selectedDecades.size === 0 ||
    selectedDecadesArray.some(decadeStart => {
        const year = Number(movie.year);
        if (!year) return false;

        return year >= decadeStart && year < decadeStart + 10;
    });

        return mediumMatch && lengthMatch && vibesMatch && decadeMatch;
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

    try {
        localStorage.removeItem(CACHE_KEY);

        movies = await loadMoviesFromCSV();

        document.getElementById("medium").innerHTML =
            '<option value="">any medium</option>';

        document.getElementById("vibesContainer").innerHTML = "";

        populateMediums();
        populateDecades();
        populateVibes();

        document.getElementById("result").textContent = "mmm... fresh data.";
    } catch (err) {
        console.error("refresh failed:", err);
        document.getElementById("result").textContent =
            "hmm... something's broken.";
    }
});


loadMovies();

const CACHE_KEY = "movies_cache";
const WATCHED_KEY = "movies_watched_cooldown";
const COOLDOWN_LIMIT = 50;
const CSV_URL =
    "https://docs.google.com/spreadsheets/d/1d34tKIHhvrtr1XP4iEjRDZrxMYpmwr7b123JzaOyyWo/export?format=csv&gid=991143387";

function setCache(data) {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
}

function getCache() {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
}

function getWatchedCooldown() {
    const raw = localStorage.getItem(WATCHED_KEY);
    return raw ? JSON.parse(raw) : [];
}

function setWatchedCooldown(data) {
    localStorage.setItem(WATCHED_KEY, JSON.stringify(data));
}

function renderCooldownList() {
    const container = document.getElementById("cooldownList");
    const cooldown = getWatchedCooldown();

    if (!cooldown.length) {
        container.textContent = "no recently watched yet.";
        return;
    }

    container.innerHTML = cooldown.map((item, index) => `
        <div class="cooldown-item">
            <span>${item.title} ${item.year ? `(${item.year})` : ""}</span>
            <button data-index="${index}">remove</button>
        </div>
    `).join("");

    container.querySelectorAll("button").forEach(btn => {
        btn.addEventListener("click", () => {
            let list = getWatchedCooldown();
            list.splice(btn.dataset.index, 1);
            setWatchedCooldown(list);
            renderCooldownList();
        });
    });
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
    console.log("loadMovies started");
    try {
        const cached = getCache();

        if (cached) {
            movies = cached;
        } else {
            movies = await loadMoviesFromCSV();
        }

        console.log("movies loaded:", movies.length);

        const maxRuntime = Math.max(...movies.map(m => Number(m.length) || 0));
        const roundedMax = Math.ceil(maxRuntime / 10) * 10;

        const lengthSlider = document.getElementById("length");
        const runtimeDisplay = document.getElementById("runtimeDisplay");

        if (lengthSlider) {
            lengthSlider.min = 0;
            lengthSlider.max = roundedMax;
            lengthSlider.value = roundedMax;
        }

        if (runtimeDisplay) {
            runtimeDisplay.textContent = roundedMax;
        }

        populateMediums();
        populateDecades();
        populateVibes();

    } catch (err) {
        console.error("loadMovies crashed:", err);
    }
}

function populateMediums() {
    const mediums = [...new Set(movies.map(m => m.medium))].sort();
    const select = document.getElementById("medium");
    if (!select) return;

    mediums.forEach(medium => {
        const option = document.createElement("option");
        option.value = medium;
        option.textContent = medium;
        select.appendChild(option);
    });
}

function populateDecades() {
    const container = document.getElementById("decadesContainer");
    if (!container) return;
    container.innerHTML = "";

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
    if (!container) return;
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

function isInCooldown(movie) {
    const cooldown = getWatchedCooldown();
    return cooldown.some(item =>
        item.title === movie.title && item.year === movie.year
    );
}

document.getElementById("pickMovie").addEventListener("click", () => {

    const medium = document.getElementById("medium").value;
    const maxLength = Number(document.getElementById("length").value);

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

const cooldownMatch = !isInCooldown(movie);

        const decadeMatch =
    selectedDecades.size === 0 ||
    selectedDecadesArray.some(decadeStart => {
        const year = Number(movie.year);
        if (!year) return false;

        return year >= decadeStart && year < decadeStart + 10;
    });

        return cooldownMatch && mediumMatch && lengthMatch && vibesMatch && decadeMatch;
    });

    const result = document.getElementById("result");

    if (filtered.length === 0) {
        result.textContent = "change your search and try again.";
        return;
    }

    const movie =
        filtered[Math.floor(Math.random() * filtered.length)];

result.innerHTML = `
  <div>
    <div>${movie.year ? `${movie.title} (${movie.year})` : movie.title}</div>
    <button id="watchingBtn">i'm watching this!</button>
  </div>
`;

const btn = document.getElementById("watchingBtn");

btn.onclick = () => {
    let cooldown = getWatchedCooldown();

    cooldown.push({
        title: movie.title,
        year: movie.year
    });

    if (cooldown.length > COOLDOWN_LIMIT) {
        cooldown = cooldown.slice(-COOLDOWN_LIMIT);
    }

    setWatchedCooldown(cooldown);

    result.textContent = "it’s out of rotation for a while.";
};
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
        document.getElementById("decadesContainer").innerHTML = "";

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

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM ready");

    loadMovies();

    document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM ready");

    loadMovies();

    const lengthSlider = document.getElementById("length");
    const runtimeDisplay = document.getElementById("runtimeDisplay");

    function updateRuntimeDisplay() {
        runtimeDisplay.textContent = `${lengthSlider.value} min`;
    }

    lengthSlider.addEventListener("input", updateRuntimeDisplay);

    updateRuntimeDisplay();

    const cooldownDrawer = document.getElementById("cooldownDrawer");
const cooldownToggle = document.getElementById("cooldownToggle");
const closeDrawer = document.getElementById("closeDrawer");

console.log("drawer check:", cooldownDrawer, cooldownToggle, closeDrawer);

if (cooldownToggle && cooldownDrawer) {
    cooldownToggle.addEventListener("click", (e) => {
        e.preventDefault();
        renderCooldownList();
        cooldownDrawer.classList.remove("hidden");
    });
}

if (closeDrawer && cooldownDrawer) {
    closeDrawer.addEventListener("click", () => {
        cooldownDrawer.classList.add("hidden");
    });
}

    const refreshBtn = document.getElementById("refreshData");

    if (refreshBtn) {
        refreshBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            try {
                localStorage.removeItem(CACHE_KEY);

                movies = await loadMoviesFromCSV();

                document.getElementById("medium").innerHTML =
                    '<option value="">any medium</option>';

                document.getElementById("vibesContainer").innerHTML = "";
                document.getElementById("decadesContainer").innerHTML = "";

                populateMediums();
                populateDecades();
                populateVibes();

                document.getElementById("result").textContent = "mmm... fresh data.";
            } catch (err) {
                console.error("refresh failed:", err);
            }
        });
    }
});

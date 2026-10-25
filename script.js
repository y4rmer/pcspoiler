// ================================================
// GAMEVAULT - GAME COLLECTION SCRIPT
// Categories: Action, Racing, Shooter, Stealth
// Data source: json.js
// ================================================

const state = {
  games: [],
  sort: "latest",
  query: ""
};

const elements = {
  featured: document.getElementById("featured-grid"),
  search: document.getElementById("game-search"),
  status: document.getElementById("search-status"),
  count: document.getElementById("collection-count"),
  tabs: [...document.querySelectorAll(".tab")]
};

// Only the four supported categories.
const categoryTracks = {
  Action: document.getElementById("action-track"),
  Racing: document.getElementById("racing-track"),
  Shooter: document.getElementById("shooter-track"),
  Stealth: document.getElementById("stealth-track")
};

const sortConfig = {
  hot: {
    label: "Hot",
    score: game => Number(game.hotScore) || 0
  },

  trending: {
    label: "Trending",
    score: game => Number(game.trendingScore) || 0
  },

  latest: {
    label: "Latest",
    score: game => Date.parse(game.releaseDate) || 0
  },

  mostPlayed: {
    label: "Most played",
    score: game => Number(game.plays) || 0
  }
};

// Escape HTML characters in game data.
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

// Allow only HTTP and HTTPS URLs.
function safeURL(value, fallback = "") {
  try {
    const url = new URL(String(value), window.location.href);

    if (!["http:", "https:"].includes(url.protocol)) {
      return fallback;
    }

    return url.href;
  } catch {
    return fallback;
  }
}

// Format game play counts.
function formatPlays(value) {
  const plays = Number(value) || 0;

  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(plays);
}

// Search by game name, description, category, or tags.
function matchesQuery(game) {
  const query = state.query.trim().toLowerCase();

  if (!query) return true;

  const searchable = [
    game.name,
    game.description,
    game.category,
    ...(Array.isArray(game.tags) ? game.tags : [])
  ].join(" ").toLowerCase();

  return searchable.includes(query);
}

// Sort games by the selected sort option.
function getSortedGames(games, sort = state.sort) {
  const config = sortConfig[sort] || sortConfig.hot;

  return [...games].sort((a, b) => {
    const scoreDifference = config.score(b) - config.score(a);

    // Use game name to break ties consistently.
    return scoreDifference || a.name.localeCompare(b.name);
  });
}

// Match category names from json.js.
function getCategory(game) {
  const category = String(game.category || "")
    .trim()
    .toLowerCase();

  if (category === "action") return "Action";
  if (category === "racing") return "Racing";
  if (category === "shooter") return "Shooter";
  if (category === "stealth") return "Stealth";

  return null;
}

// Create a reusable game card.
function createGameCard(game) {
  const category = getCategory(game) || "Game";
  const image = safeURL(game.image);
  const download = safeURL(game.downloadpath);

  const badge = escapeHTML(game.badge || category);
  const name = escapeHTML(game.name || "Untitled game");

  const description = escapeHTML(
    game.description || "Discover this adventure."
  );

  const tags = Array.isArray(game.tags) ? game.tags : [];

  const tagLabel = escapeHTML(
    tags.length ? tags[0] : category
  );

  const downloadButton = download
    ? `<a
          class="download-button"
          href="${escapeHTML(download)}"
          download
          aria-label="Download ${name}">
          <span>↓</span> Download game
       </a>`
    : `<button class="download-button" disabled>
         Download unavailable
       </button>`;

  return `
    <article class="game-card">
      <div class="game-image-wrap">
        <img
          class="game-image"
          src="${escapeHTML(image)}"
          alt="${name} cover art"
          loading="lazy"
          decoding="async"
          data-fallback="true"
        />

        <span class="game-badge">${badge}</span>
      </div>

      <div class="game-body">
        <div class="game-category">
          ${escapeHTML(category)} · ${tagLabel}
        </div>

        <h3 class="game-title">${name}</h3>

        <p class="game-description">${description}</p>

        <div class="game-meta">
          <span>◉ ${formatPlays(game.plays)} plays</span>

          <span class="plays">
            ✦ ${escapeHTML(game.badge || "Explore")}
          </span>
        </div>

        ${downloadButton}
      </div>
    </article>
  `;
}

// Render the main featured collection.
function renderFeatured() {
  if (!elements.featured) return;

  const games = getSortedGames(
    state.games.filter(matchesQuery)
  );

  if (!games.length) {
    elements.featured.innerHTML = `
      <div class="empty-state">
        <div style="font-size:30px;margin-bottom:10px">⌕</div>
        <strong>No games found</strong>
        <p>Try a different title, category, or keyword.</p>
      </div>
    `;

    return;
  }

  // Show up to eight games in the featured section.
  elements.featured.innerHTML = games
    .slice(0, 8)
    .map(createGameCard)
    .join("");
}

// Render all four category sliders.
function renderCategories() {
  for (const [category, track] of Object.entries(categoryTracks)) {
    if (!track) continue;

    const games = getSortedGames(
      state.games.filter(game =>
        getCategory(game) === category && matchesQuery(game)
      )
    );

    if (!games.length) {
      track.innerHTML = "";
      continue;
    }

    track.innerHTML = games
      .map(createGameCard)
      .join("");
  }
}

// Refresh the displayed content.
function render() {
  renderFeatured();
  renderCategories();

  const total = state.games.length;

  const matching = state.games.filter(
    matchesQuery
  ).length;

  if (elements.count) {
    elements.count.textContent =
      `${matching} of ${total} games`;
  }

  if (elements.status) {
    elements.status.textContent = state.query.trim()
      ? `${matching} game${matching === 1 ? "" : "s"} matching "${state.query.trim()}"`
      : "";
  }
}

// Change the featured collection sorting.
function setSort(sort) {
  if (!sortConfig[sort]) return;

  state.sort = sort;

  elements.tabs.forEach(tab => {
    const active = tab.dataset.sort === sort;

    tab.classList.toggle("active", active);

    tab.setAttribute(
      "aria-selected",
      String(active)
    );
  });

  renderFeatured();
}

// Connect sorting tabs.
elements.tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    setSort(tab.dataset.sort);
  });
});

// Search filters featured games and all category sliders.
if (elements.search) {
  elements.search.addEventListener("input", event => {
    state.query = event.target.value;
    render();
  });
}

// Connect the category slider arrow buttons.
document.querySelectorAll(".arrow-button").forEach(button => {
  button.addEventListener("click", () => {
    const track = document.getElementById(
      button.dataset.target
    );

    if (!track) return;

    const direction =
      Number(button.dataset.direction) || 1;

    const card = track.querySelector(".game-card");
    const gap = 17;

    const distance = card
      ? card.getBoundingClientRect().width + gap
      : 250;

    track.scrollBy({
      left: direction * distance * 2,
      behavior: "smooth"
    });
  });
});

// Ctrl/Cmd + K focuses the search box.
// Escape clears the search.
document.addEventListener("keydown", event => {
  if (
    (event.ctrlKey || event.metaKey) &&
    event.key.toLowerCase() === "k"
  ) {
    event.preventDefault();
    elements.search?.focus();
  }

  if (
    event.key === "Escape" &&
    document.activeElement === elements.search
  ) {
    elements.search.value = "";
    state.query = "";

    render();
    elements.search.blur();
  }
});

// Hide images that fail to load.
document.addEventListener("error", event => {
  const img = event.target;

  if (
    img instanceof HTMLImageElement &&
    img.dataset.fallback === "true"
  ) {
    img.dataset.fallback = "used";
    img.removeAttribute("src");
    img.alt = "Game artwork unavailable";
    img.style.display = "none";

    const wrapper = img.closest(".game-image-wrap");

    if (wrapper) {
      wrapper.style.background =
        "radial-gradient(circle at 70% 30%, #43356b, #171724 65%)";
    }
  }
}, true);

// Load the game collection from json.js.
async function init() {
  try {
    if (
      typeof GAME_INDEX === "undefined" ||
      !Array.isArray(GAME_INDEX)
    ) {
      throw new Error(
        "GAME_INDEX must be an array defined in json.js."
      );
    }

    state.games = GAME_INDEX.filter(game =>
      game &&
      typeof game === "object" &&
      typeof game.name === "string" &&
      typeof game.description === "string" &&
      typeof game.image === "string" &&
      typeof game.downloadpath === "string"
    );

    const year = document.getElementById("year");

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    render();
  } catch (error) {
    console.error(
      "GameVault initialization error:",
      error
    );

    if (elements.count) {
      elements.count.textContent = "Unable to load";
    }

    if (elements.featured) {
      elements.featured.innerHTML = `
        <div class="empty-state">
          <strong>Unable to load games.</strong>
          <p>Check that json.js defines GAME_INDEX correctly.</p>
        </div>
      `;
    }
  }
}

// Start GameVault.
init();

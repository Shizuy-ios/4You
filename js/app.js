const STORAGE_KEYS = {
  favorites: 'para-ti-favorites',
  theme: 'para-ti-theme',
  localPoems: 'para-ti-local-poems'
};

const state = {
  poems: [],
  currentIndex: 0,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  filteredPoems: []
};

const elements = {
  poemDate: document.getElementById('poem-date'),
  poemTitle: document.getElementById('poem-title'),
  poemText: document.getElementById('poem-text'),
  poemAuthor: document.getElementById('poem-author'),
  poemImage: document.getElementById('poem-image'),
  prevBtn: document.getElementById('prev-btn'),
  nextBtn: document.getElementById('next-btn'),
  shareBtn: document.getElementById('share-btn'),
  favoriteToggle: document.getElementById('favorite-toggle'),
  poemCount: document.getElementById('poem-count'),
  daysSinceFirst: document.getElementById('days-since-first'),
  libraryList: document.getElementById('library-list'),
  favoritesList: document.getElementById('favorites-list'),
  searchInput: document.getElementById('search-input'),
  yearFilter: document.getElementById('year-filter'),
  monthFilter: document.getElementById('month-filter'),
  calendarLabel: document.getElementById('calendar-label'),
  calendarGrid: document.getElementById('calendar-grid'),
  themeToggle: document.getElementById('theme-toggle'),
  todayBtn: document.getElementById('today-btn'),
  navButtons: Array.from(document.querySelectorAll('.nav-btn')),
  panels: Array.from(document.querySelectorAll('.panel')),
  poemPage: document.getElementById('poem-page')
};

function init() {
  applyStoredTheme();
  bindEvents();
  loadPoems();
}

function bindEvents() {
  elements.prevBtn.addEventListener('click', () => changePoem(-1));
  elements.nextBtn.addEventListener('click', () => changePoem(1));
  elements.shareBtn.addEventListener('click', shareCurrentPoem);
  elements.favoriteToggle.addEventListener('click', toggleFavorite);
  elements.themeToggle.addEventListener('click', toggleTheme);
  elements.todayBtn.addEventListener('click', () => navigateToToday());

  elements.navButtons.forEach((button) => {
    button.addEventListener('click', () => activateSection(button.dataset.section));
  });

  elements.searchInput.addEventListener('input', renderLibrary);
  elements.yearFilter.addEventListener('change', renderLibrary);
  elements.monthFilter.addEventListener('change', renderLibrary);

  document.getElementById('calendar-prev').addEventListener('click', () => {
    state.currentMonth -= 1;
    renderCalendar();
  });

  document.getElementById('calendar-next').addEventListener('click', () => {
    state.currentMonth += 1;
    renderCalendar();
  });
}

async function loadPoems() {
  try {
    const manifestResponse = await fetch('data/manifest.json');
    const manifest = await manifestResponse.json();
    const files = manifest.poemas.map((entry) => entry.archivo);
    const remotePoems = await Promise.all(files.map((file) => fetchJson(`data/${file}`)));
    const localPoems = JSON.parse(localStorage.getItem(STORAGE_KEYS.localPoems) || '[]');

    const merged = [...remotePoems, ...localPoems];
    const unique = mergePoems(merged);
    state.poems = unique.sort((a, b) => a.fecha.localeCompare(b.fecha));

    const today = formatDate(new Date());
    const todayPoem = state.poems.find((poem) => poem.fecha === today);
    state.currentIndex = todayPoem ? state.poems.findIndex((poem) => poem.fecha === today) : state.poems.length - 1;

    renderAll();
  } catch (error) {
    console.error('No se pudieron cargar los poemas.', error);
    elements.poemText.textContent = 'Todavía no hay páginas disponibles.';
  }
}

function fetchJson(url) {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`No se pudo cargar ${url}`);
    return response.json();
  });
}

function mergePoems(items) {
  const map = new Map();
  items.forEach((item) => {
    if (!item || !item.fecha) return;
    map.set(item.fecha, item);
  });
  return Array.from(map.values());
}

function renderAll() {
  renderCurrentPoem();
  renderLibrary();
  renderFavorites();
  renderCalendar();
  updateStats();
  populateFilters();
}

function renderCurrentPoem() {
  const poem = state.poems[state.currentIndex];
  if (!poem) return;

  elements.poemDate.textContent = formatDisplayDate(poem.fecha);
  elements.poemTitle.textContent = poem.titulo;
  elements.poemAuthor.textContent = poem.autor || 'Brandon';
  elements.poemImage.src = poem.imagen || 'images/diary-cover.svg';
  elements.poemImage.alt = `Ilustración de ${poem.titulo}`;
  elements.poemPage.style.borderColor = poem.color || '#b48a62';
  elements.poemPage.classList.remove('page-turn');
  void elements.poemPage.offsetWidth;
  elements.poemPage.classList.add('page-turn');
  renderPoemText(poem.poema || '');
  updateFavoriteButton(poem.fecha);
}

function renderPoemText(text) {
  elements.poemText.textContent = '';
  const typeSpeed = 20;
  let index = 0;
  const interval = setInterval(() => {
    elements.poemText.textContent += text[index] || '';
    index += 1;
    if (index >= text.length) {
      clearInterval(interval);
    }
  }, typeSpeed);
}

function changePoem(direction) {
  if (!state.poems.length) return;

  state.currentIndex = (state.currentIndex + direction + state.poems.length) % state.poems.length;
  renderCurrentPoem();
  activateSection('home');
}

function navigateToToday() {
  const today = formatDate(new Date());
  const index = state.poems.findIndex((poem) => poem.fecha === today);
  if (index >= 0) {
    state.currentIndex = index;
  } else {
    state.currentIndex = state.poems.length - 1;
  }
  renderCurrentPoem();
  activateSection('home');
}

function shareCurrentPoem() {
  const poem = state.poems[state.currentIndex];
  if (!poem) return;
  const text = `${poem.titulo}\n${formatDisplayDate(poem.fecha)}\n\n${poem.poema}`;

  if (navigator.share) {
    navigator.share({
      title: poem.titulo,
      text: text
    }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => {
      elements.shareBtn.textContent = '¡Listo!';
      setTimeout(() => {
        elements.shareBtn.textContent = 'Compartir';
      }, 1200);
    });
  }
}

function toggleFavorite() {
  const poem = state.poems[state.currentIndex];
  if (!poem) return;

  const favorites = getFavorites();
  const exists = favorites.includes(poem.fecha);
  const nextFavorites = exists ? favorites.filter((date) => date !== poem.fecha) : [...favorites, poem.fecha];
  localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(nextFavorites));
  updateFavoriteButton(poem.fecha);
  renderFavorites();
}

function getFavorites() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.favorites) || '[]');
}

function updateFavoriteButton(date) {
  const favorites = getFavorites();
  const isFavorited = favorites.includes(date);
  elements.favoriteToggle.classList.toggle('active', isFavorited);
  elements.favoriteToggle.setAttribute('aria-pressed', String(isFavorited));
  elements.favoriteToggle.textContent = isFavorited ? '♥' : '♡';
}

function activateSection(section) {
  elements.panels.forEach((panel) => {
    panel.classList.toggle('active', panel.id === `${section}-section`);
  });

  elements.navButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.section === section);
  });
}

function renderLibrary() {
  const query = elements.searchInput.value.trim().toLowerCase();
  const year = elements.yearFilter.value;
  const month = elements.monthFilter.value;

  const filtered = state.poems.filter((poem) => {
    const poemYear = poem.fecha.slice(0, 4);
    const poemMonth = poem.fecha.slice(5, 7);
    const matchesQuery = !query || poem.titulo.toLowerCase().includes(query) || poem.poema.toLowerCase().includes(query);
    const matchesYear = year === 'all' || poemYear === year;
    const matchesMonth = month === 'all' || poemMonth === month;
    return matchesQuery && matchesYear && matchesMonth;
  });

  state.filteredPoems = filtered;

  if (!filtered.length) {
    elements.libraryList.innerHTML = '<div class="library-card"><p>No hay poemas que coincidan con la búsqueda.</p></div>';
    return;
  }

  elements.libraryList.innerHTML = filtered
    .slice()
    .reverse()
    .map((poem) => {
      const preview = poem.poema.split('\n').slice(0, 2).join(' ');
      return `
        <article class="library-card">
          <button type="button" data-date="${poem.fecha}">
            <h3>${poem.titulo}</h3>
            <p>${formatDisplayDate(poem.fecha)}</p>
            <p>${preview}</p>
          </button>
        </article>
      `;
    })
    .join('');

  elements.libraryList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => openPoemByDate(button.dataset.date));
  });
}

function renderFavorites() {
  const favorites = getFavorites();
  const cards = state.poems.filter((poem) => favorites.includes(poem.fecha));

  if (!cards.length) {
    elements.favoritesList.innerHTML = '<div class="library-card"><p>Aún no has marcado favoritos.</p></div>';
    return;
  }

  elements.favoritesList.innerHTML = cards
    .slice()
    .reverse()
    .map((poem) => `
      <article class="library-card">
        <button type="button" data-date="${poem.fecha}">
          <h3>${poem.titulo}</h3>
          <p>${formatDisplayDate(poem.fecha)}</p>
          <p>${poem.poema.split('\n')[0]}</p>
        </button>
      </article>
    `)
    .join('');

  elements.favoritesList.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => openPoemByDate(button.dataset.date));
  });
}

function openPoemByDate(date) {
  const index = state.poems.findIndex((poem) => poem.fecha === date);
  if (index >= 0) {
    state.currentIndex = index;
    renderCurrentPoem();
    activateSection('home');
  }
}

function renderCalendar() {
  const date = new Date(state.currentYear, state.currentMonth, 1);
  const firstDay = date.getDay();
  const daysInMonth = new Date(state.currentYear, state.currentMonth + 1, 0).getDate();
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthLabel = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  elements.calendarLabel.textContent = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const calendarDays = [];
  dayNames.forEach((name) => {
    calendarDays.push(`<div class="day-name">${name}</div>`);
  });

  for (let i = 0; i < firstDay; i += 1) {
    calendarDays.push('<div></div>');
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const year = state.currentYear;
    const month = String(state.currentMonth + 1).padStart(2, '0');
    const dayValue = String(day).padStart(2, '0');
    const value = `${year}-${month}-${dayValue}`;
    const hasPoem = state.poems.some((poem) => poem.fecha === value);
    const isToday = value === formatDate(new Date());
    calendarDays.push(`<button class="calendar-day ${hasPoem ? 'has-poem' : ''} ${isToday ? 'today' : ''}" data-date="${value}">${day}</button>`);
  }

  elements.calendarGrid.innerHTML = calendarDays.join('');
  elements.calendarGrid.querySelectorAll('.calendar-day').forEach((button) => {
    button.addEventListener('click', () => {
      if (button.dataset.date) {
        openPoemByDate(button.dataset.date);
      }
    });
  });
}

function updateStats() {
  elements.poemCount.textContent = state.poems.length;
  if (!state.poems.length) return;
  const firstDate = new Date(state.poems[0].fecha);
  const today = new Date(formatDate(new Date()));
  const diff = Math.floor((today - firstDate) / (1000 * 60 * 60 * 24));
  elements.daysSinceFirst.textContent = diff;
}

function populateFilters() {
  const years = Array.from(new Set(state.poems.map((poem) => poem.fecha.slice(0, 4)))).sort((a, b) => b - a);
  const months = Array.from(new Set(state.poems.map((poem) => poem.fecha.slice(5, 7)))).sort();

  elements.yearFilter.innerHTML = '<option value="all">Todos los años</option>' + years.map((year) => `<option value="${year}">${year}</option>`).join('');
  elements.monthFilter.innerHTML = '<option value="all">Todos los meses</option>' + months.map((month) => `<option value="${month}">${monthName(month)}</option>`).join('');
}

function monthName(value) {
  const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return names[Number(value) - 1] || value;
}

function formatDisplayDate(dateValue) {
  const date = new Date(`${dateValue}T12:00:00`);
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function applyStoredTheme() {
  const saved = localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  document.body.dataset.theme = saved;
  elements.themeToggle.textContent = saved === 'dark' ? '☀' : '☾';
}

function toggleTheme() {
  const current = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  document.body.dataset.theme = current;
  localStorage.setItem(STORAGE_KEYS.theme, current);
  elements.themeToggle.textContent = current === 'dark' ? '☀' : '☾';
}

window.addEventListener('DOMContentLoaded', init);

// ================================================
// DATA - MODIFY THIS SECTION TO UPDATE CONTENT
// ================================================
const siteData = {
  roles: [
    {
      id: 'impostor',
      name: 'Impostor',
      description: 'El traidor que sabotea la nave y elimina a los crewmates.',
      color: 'red',
      image: 'https://placehold.co/400x300/c70d3a/ffffff?text=Impostor',
      related: 'El Juego',
    },
    {
      id: 'crewmate',
      name: 'Crewmate',
      description: 'Completa tareas y trabaja en equipo para encontrar al impostor.',
      color: 'blue',
      image: 'https://placehold.co/400x300/2e86de/ffffff?text=Crewmate',
      related: 'Objetivos',
    },
    {
      id: 'sheriff',
      name: 'Sheriff',
      description: 'Puede disparar a quien crea que es el impostor.',
      color: 'purple',
      image: 'https://placehold.co/400x300/9b59b6/ffffff?text=Sheriff',
      related: 'Impostor',
    },
    {
      id: 'engineer',
      name: 'Engineer',
      description: 'Puede usar los respiraderos y arreglar sabotajes más rápido.',
      color: 'green',
      image: 'https://placehold.co/400x300/27ae60/ffffff?text=Engineer',
      related: 'Sabotajes',
    },
  ],
  maps: [
    {
      id: 'skeld',
      name: 'The Skeld',
      description: 'La nave espacial original, con pasillos y salas para explorar.',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=The+Skeld',
      related: 'Nave espacial',
    },
    {
      id: 'mira',
      name: 'Mira HQ',
      description: 'La sede central de la empresa, situada en las alturas.',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=Mira+HQ',
      related: 'Sede central',
    },
    {
      id: 'polus',
      name: 'Polus',
      description: 'Una base de investigación en un planeta helado.',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=Polus',
      related: 'Base polar',
    },
    {
      id: 'airship',
      name: 'The Airship',
      description: 'Un gran dirigible con varias plantas y rutas alternativas.',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=The+Airship',
      related: 'Dirigible',
    },
  ],
}

const FAVORITES_KEY = 'among-us-wiki-favorites'
let favorites = new Set()
let favoritesOnly = false
let storageNotice = ''

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character])
}

function loadFavorites() {
  try {
    const saved = localStorage.getItem(FAVORITES_KEY)
    if (!saved) return new Set()

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed) || !parsed.every((item) => typeof item === 'string')) {
      throw new Error('El formato de favoritos no es válido.')
    }
    return new Set(parsed)
  } catch (error) {
    storageNotice = `No se pudieron cargar los favoritos: ${error.message}`
    return new Set()
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favorites]))
  } catch (error) {
    storageNotice = `No se pudieron guardar los favoritos: ${error.message}`
  }
}

function renderRoles(roles) {
  const container = document.getElementById('roles-container')
  if (!container) return

  container.innerHTML = roles.map((role) => {
    const favoriteKey = `role:${role.id}`
    const isFavorite = favorites.has(favoriteKey)
    return `
      <article class="role-card ${escapeHTML(role.color)} searchable-card"
        data-content-type="role" data-favorite-key="${favoriteKey}">
        <button class="favorite-button ${isFavorite ? 'is-favorite' : ''}"
          type="button" aria-label="${isFavorite ? 'Quitar' : 'Añadir'} ${escapeHTML(role.name)} ${isFavorite ? 'de' : 'a'} favoritos"
          aria-pressed="${isFavorite}" data-favorite="${favoriteKey}">
          <span aria-hidden="true">${isFavorite ? '★' : '☆'}</span>
        </button>
        <div class="role-image-wrapper">
          <img src="${escapeHTML(role.image)}" alt="${escapeHTML(role.name)}" class="role-image" loading="lazy">
        </div>
        <h3>${escapeHTML(role.name)}</h3>
        <p>${escapeHTML(role.description)}</p>
        <p class="related-content">Relacionado: <a href="#game">${escapeHTML(role.related)}</a></p>
      </article>
    `
  }).join('')
}

function renderMaps(maps) {
  const container = document.getElementById('maps-container')
  if (!container) return

  container.innerHTML = maps.map((map) => {
    const favoriteKey = `map:${map.id}`
    const isFavorite = favorites.has(favoriteKey)
    return `
      <article class="map-card searchable-card" data-content-type="map"
        data-favorite-key="${favoriteKey}">
        <button class="favorite-button ${isFavorite ? 'is-favorite' : ''}"
          type="button" aria-label="${isFavorite ? 'Quitar' : 'Añadir'} ${escapeHTML(map.name)} ${isFavorite ? 'de' : 'a'} favoritos"
          aria-pressed="${isFavorite}" data-favorite="${favoriteKey}">
          <span aria-hidden="true">${isFavorite ? '★' : '☆'}</span>
        </button>
        <div class="map-image-wrapper">
          <img src="${escapeHTML(map.image)}" alt="${escapeHTML(map.name)}" class="map-image" loading="lazy">
        </div>
        <h3>${escapeHTML(map.name)}</h3>
        <p>${escapeHTML(map.description)}</p>
        <p class="related-content">Relacionado: <a href="#game">${escapeHTML(map.related)}</a></p>
      </article>
    `
  }).join('')
}

function updateFavoriteCount() {
  const count = document.getElementById('favorites-count')
  if (count) count.textContent = String(favorites.size)
}

function filterContent() {
  const search = document.getElementById('content-search')
  const category = document.getElementById('content-category')
  const status = document.getElementById('content-results')
  if (!search || !category || !status) return

  const normalize = (value) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
  const query = normalize(search.value.trim())
  const selectedCategory = category.value
  const cards = [...document.querySelectorAll('.searchable-card')]
  let visibleCount = 0

  cards.forEach((card) => {
    const matchesText = normalize(card.textContent).includes(query)
    const matchesCategory = selectedCategory === 'all'
      || card.dataset.contentType === selectedCategory
    const favoriteKey = card.dataset.favoriteKey
    const matchesFavorite = !favoritesOnly || (favoriteKey && favorites.has(favoriteKey))
    const isVisible = matchesText && matchesCategory && matchesFavorite
    card.hidden = !isVisible
    if (isVisible) visibleCount += 1
  })

  document.querySelectorAll('main > .section').forEach((section) => {
    const sectionCards = [...section.querySelectorAll('.searchable-card')]
    if (sectionCards.length > 0) {
      section.hidden = sectionCards.every((card) => card.hidden)
    }
  })

  const hasFilters = query || selectedCategory !== 'all' || favoritesOnly
  if (storageNotice) {
    status.textContent = storageNotice
  } else if (favoritesOnly && favorites.size === 0) {
    status.textContent = 'Aún no tienes favoritos. Marca una estrella en un rol o mapa para guardarlo.'
  } else if (hasFilters && visibleCount === 0) {
    status.textContent = 'No encontramos contenido con esos filtros. Prueba otra búsqueda o categoría.'
  } else if (hasFilters) {
    status.textContent = `${visibleCount} ${visibleCount === 1 ? 'resultado' : 'resultados'}`
  } else {
    status.textContent = `${cards.length} artículos para explorar`
  }
}

function initMobileNavigation() {
  const toggle = document.querySelector('.nav-toggle')
  const navigation = document.getElementById('primary-navigation')
  if (!toggle || !navigation) return

  const closeMenu = () => {
    toggle.setAttribute('aria-expanded', 'false')
    toggle.querySelector('.nav-toggle-icon').textContent = '☰'
    toggle.querySelector('.visually-hidden').textContent = 'Abrir menú de navegación'
    navigation.classList.remove('is-open')
  }

  const mediaQuery = window.matchMedia('(max-width: 768px)')
  mediaQuery.addEventListener('change', (event) => {
    if (!event.matches) closeMenu()
  })

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true'
    toggle.setAttribute('aria-expanded', String(!isOpen))
    toggle.querySelector('.nav-toggle-icon').textContent = isOpen ? '☰' : '×'
    toggle.querySelector('.visually-hidden').textContent = isOpen
      ? 'Abrir menú de navegación'
      : 'Cerrar menú de navegación'
    navigation.classList.toggle('is-open', !isOpen)
  })

  navigation.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMenu)
  })

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu()
  })
}

function initContentTools() {
  const search = document.getElementById('content-search')
  const category = document.getElementById('content-category')
  const favoriteFilter = document.getElementById('favorites-filter')
  if (!search || !category || !favoriteFilter) return

  search.addEventListener('input', filterContent)
  category.addEventListener('change', filterContent)
  favoriteFilter.addEventListener('click', () => {
    favoritesOnly = !favoritesOnly
    favoriteFilter.setAttribute('aria-pressed', String(favoritesOnly))
    favoriteFilter.classList.toggle('is-active', favoritesOnly)
    favoriteFilter.querySelector('span').textContent = favoritesOnly ? '★' : '☆'
    filterContent()
  })

  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-favorite]')
    if (!button) return

    const favoriteKey = button.dataset.favorite
    if (favorites.has(favoriteKey)) {
      favorites.delete(favoriteKey)
    } else {
      favorites.add(favoriteKey)
    }
    saveFavorites()
    renderRoles(siteData.roles)
    renderMaps(siteData.maps)
    updateFavoriteCount()
    filterContent()
  })

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault()
      search.focus()
    }
  })
}

// ================================================
// INITIALIZATION
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  favorites = loadFavorites()
  renderRoles(siteData.roles)
  renderMaps(siteData.maps)
  updateFavoriteCount()
  initMobileNavigation()
  initContentTools()
  filterContent()
})

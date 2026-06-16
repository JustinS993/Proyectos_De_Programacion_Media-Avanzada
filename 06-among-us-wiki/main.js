// ================================================
// DATA - MODIFY THIS SECTION TO UPDATE CONTENT
// ================================================
const siteData = {
  roles: [
    { 
      id: 'impostor', 
      name: 'Impostor', 
      description: 'El traidor que sabotear y matar crewmates', 
      color: 'red',
      image: 'https://placehold.co/400x300/c70d3a/ffffff?text=Impostor'
    },
    { 
      id: 'crewmate', 
      name: 'Crewmate', 
      description: 'Completa tareas y encuentra al impostor', 
      color: 'blue',
      image: 'https://placehold.co/400x300/2e86de/ffffff?text=Crewmate'
    },
    { 
      id: 'sheriff', 
      name: 'Sheriff', 
      description: 'Puede disparar a quien crea que es el impostor', 
      color: 'purple',
      image: 'https://placehold.co/400x300/9b59b6/ffffff?text=Sheriff'
    },
    { 
      id: 'engineer', 
      name: 'Engineer', 
      description: 'Puede usar los respiraderos y arreglar sabotajes más rápido', 
      color: 'green',
      image: 'https://placehold.co/400x300/27ae60/ffffff?text=Engineer'
    }
  ],
  maps: [
    { 
      id: 'skeld', 
      name: 'The Skeld', 
      description: 'La nave espacial original',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=The+Skeld'
    },
    { 
      id: 'mira', 
      name: 'Mira HQ', 
      description: 'La sede central de la empresa',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=Mira+HQ'
    },
    { 
      id: 'polus', 
      name: 'Polus', 
      description: 'La base polar',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=Polus'
    },
    { 
      id: 'airship', 
      name: 'The Airship', 
      description: 'El dirigible',
      image: 'https://placehold.co/600x400/1a1a2e/e0e0e0?text=The+Airship'
    }
  ]
};

// ================================================
// RENDER FUNCTIONS
// ================================================
function renderRoles(roles) {
  const container = document.getElementById('roles-container');
  if (!container) return;

  container.innerHTML = roles.map(role => `
    <div class="role-card ${role.color}">
      <div class="role-image-wrapper">
        <img src="${role.image}" alt="${role.name}" class="role-image" loading="lazy">
      </div>
      <h3>${role.name}</h3>
      <p>${role.description}</p>
    </div>
  `).join('');
}

function renderMaps(maps) {
  const container = document.getElementById('maps-container');
  if (!container) return;

  container.innerHTML = maps.map(map => `
    <div class="map-card">
      <div class="map-image-wrapper">
        <img src="${map.image}" alt="${map.name}" class="map-image" loading="lazy">
      </div>
      <h3>${map.name}</h3>
      <p>${map.description}</p>
    </div>
  `).join('');
}

// ================================================
// UTILITY FUNCTIONS
// ================================================
function initScrollAnimations() {
  // Add intersection observer for cards if needed later
}

// ================================================
// INITIALIZATION
// ================================================
document.addEventListener('DOMContentLoaded', () => {
  renderRoles(siteData.roles);
  renderMaps(siteData.maps);
  initScrollAnimations();
});

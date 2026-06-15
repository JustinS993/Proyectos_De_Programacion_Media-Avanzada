// ================================================
// DATA - MODIFY THIS SECTION TO UPDATE CONTENT
// ================================================
const siteData = {
  roles: [
    { id: 'impostor', name: 'Impostor', description: 'El traidor que sabotear y matar crewmates', color: 'red' },
    { id: 'crewmate', name: 'Crewmate', description: 'Completa tareas y encuentra al impostor', color: 'blue' },
    { id: 'sheriff', name: 'Sheriff', description: 'Puede disparar a quien crea que es el impostor', color: 'purple' },
    { id: 'engineer', name: 'Engineer', description: 'Puede usar los respiraderos y arreglar sabotajes más rápido', color: 'green' }
  ],
  maps: [
    { id: 'skeld', name: 'The Skeld', description: 'La nave espacial original' },
    { id: 'mira', name: 'Mira HQ', description: 'La sede central de la empresa' },
    { id: 'polus', name: 'Polus', description: 'La base polar' },
    { id: 'airship', name: 'The Airship', description: 'El dirigible' }
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

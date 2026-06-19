# Assets Folder - Spot the Impostor!

## Cómo Reemplazar las Imágenes:

Actualmente el juego usa placeholders de Placehold.co y Unsplash. Para usar tus propios assets:

1. **Crewmate (azul):**
   - Guarda tu imagen como `crewmate.png` en esta carpeta
   - Tamaño recomendado: 96x96px (PNG con fondo transparente)
   - Actualiza la línea en `game.js` (PreloadScene):
     ```javascript
     this.load.image('crewmate', './assets/crewmate.png');
     ```

2. **Impostor (rojo):**
   - Guarda tu imagen como `impostor.png` en esta carpeta
   - Tamaño recomendado: 96x96px (PNG con fondo transparente)
   - Actualiza la línea en `game.js`:
     ```javascript
     this.load.image('impostor', './assets/impostor.png');
     ```

3. **Fondo (espacio):**
   - Guarda tu imagen como `space-bg.png` o `space-bg.jpg` en esta carpeta
   - Tamaño recomendado: 800x600px
   - Actualiza la línea en `game.js`:
     ```javascript
     this.load.image('space-bg', './assets/space-bg.jpg');
     ```

## Donde Conseguir Assets Gratuitos:
- **OpenGameArt.org**: Busca "among us" o "space crewmate"
- **Itch.io**: Muchos assets gratuitos de juegos indie
- **Kenney.nl**: Assets de juegos pixel art de alta calidad

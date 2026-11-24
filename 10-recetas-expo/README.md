# Recetas App

La app móvil se comunica con el proxy de `server/`; la clave de Spoonacular solo se configura en ese servidor.

## Desarrollo local

1. En `server/`, copia `.env.example` a `.env` y configura `SPOONACULAR_API_KEY`.
2. Instala y ejecuta el proxy:

   ```sh
   cd server
   npm install
   npm start
   ```

3. En la raíz del proyecto, copia `.env.example` a `.env` y configura `EXPO_PUBLIC_RECIPES_API_URL`.
   - Usa `http://localhost:3002/api` para un simulador que comparte el host.
   - En un dispositivo físico, sustituye `localhost` por la IP local del equipo que ejecuta el proxy.
4. Instala las dependencias de la app y arranca Expo:

   ```sh
   npm install
   npm start
   ```

En producción, despliega el proxy en un host HTTPS y configura `CORS_ORIGINS` con los orígenes web permitidos. No publiques los archivos `.env`.

El proxy valida los parámetros, limita solicitudes y páginas, y almacena respuestas en memoria durante un periodo corto. La app almacena páginas y detalles localmente durante seis horas para acelerar consultas y permitir el uso de resultados guardados sin conexión.

El proyecto fija `minimatch` en una versión corregida para las dependencias transitivas de Expo. Al actualizar el SDK, vuelve a validar el override con `npm audit` y `npx expo install --check`.

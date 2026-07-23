# Proyectos de Programación Media-Avanzada

Repositorio con ejercicios prácticos de **Electiva V**, enfocados en interfaces web con **React**, **TypeScript** y **Vite**, y desarrollo móvil con **React Native** y **Expo**. Cada carpeta es un proyecto independiente que puedes clonar, instalar y ejecutar por separado.

## Contenido del repositorio

| Carpeta | Descripción breve |
|--------|-------------------|
| [`02-ejercicio-contador`](./02-ejercicio-contador) | Contador interactivo con `useState` |
| [`03-ejercicio-lista-tareas`](./03-ejercicio-lista-tareas) | Lista de tareas (CRUD en memoria) con tipado e interfaces |
| [`04-mi-primera-app`](./04-mi-primera-app) | Mi primera aplicación móvil con Expo y React Native |
| [`app-calculator`](./app-calculator) | Aplicación de calculadora completa con Expo, Hooks y Haptics |
| [`SyntaxQuest`](./SyntaxQuest) | Videojuego educativo 2D mejorado con React, TypeScript, Phaser y modo carrera |
| [`13-rastreo-habitos`](./13-rastreo-habitos) | App de seguimiento de hábitos con dashboard, progreso y persistencia local |
| [`05-sorting-simulator`](./05-sorting-simulator) | Visualizador interactivo de algoritmos de ordenamiento con React y Framer Motion |
| [`06-among-us-wiki`](./06-among-us-wiki) | Wiki web sobre Among Us (juego y serie) con HTML y CSS |
| [`07-spot-the-impostor`](./07-spot-the-impostor) | Juego de "Encuentra al Impostor" de Among Us con Phaser 3 |
| [`08-finanzas-personales`](./08-finanzas-personales) | App de finanzas personales con React y TypeScript |
| [`09-ahorcado-pwa`](./09-ahorcado-pwa) | Juego del Ahorcado como PWA con Vanilla JS |
| [`10-recetas-expo`](./10-recetas-expo) | App de recetas con React Native, Expo y Spoonacular API |
| [`11-notas-markdown`](./11-notas-markdown) | App de notas con Markdown, autenticación y Supabase |
| [`12-red-social`](./12-red-social) | Red social profesional con React, Node, PostgreSQL, Redis y Socket.io |

## Stack común

- **React 19** y **React DOM** (Web)
- **React Native** y **Expo** (Móvil)
- **TypeScript**
- **Vite 8** (desarrollo web)
- **ESLint** para calidad de código

Los `node_modules` y la carpeta `dist` no se versionan; en cada proyecto debes ejecutar `npm install` antes de desarrollar o compilar.

---

## 13 — Rastreo de Hábitos (Web - React & TypeScript)

Aplicación para registrar hábitos diarios, visualizar progreso y mantener motivación con un tablero claro y persistencia local.

### Qué practica

- **React + TypeScript**: estructura de componentes y tipado fuerte.
- **Estados dinámicos**: seguimiento de hábitos, metas y avances diarios.
- **Persistencia local**: los datos se guardan en `localStorage` para conservarse tras recargar la página.
- **Visualización de progreso**: indicadores visuales de cumplimiento y logros.

### Cómo ejecutarlo

```bash
cd 13-rastreo-habitos
npm install
npm run dev
```

---

## 02 — Ejercicio Contador

Aplicación mínima que muestra un **contador numérico** y tres acciones: incrementar, decrementar y volver a cero.

### Qué practica

- Estado local con **`useState`**
- Actualización del estado con la forma funcional (`setContador((valorActual) => …)`) para evitar condiciones de carrera en actualizaciones sucesivas
- Componente presentacional (`Contador`) integrado en `App`

---

## 03 — Ejercicio Lista de Tareas

Aplicación de **lista de tareas en memoria**: agregar, marcar como hecha, eliminar y vaciar la lista.

### Qué practica

- **`useState`** para el texto del input y para el arreglo de tareas
- **Interface `Tarea`** en TypeScript (`id`, `texto`, `completed`)
- Operaciones sobre listas: **map**, **filter**, inmutabilidad al actualizar ítems

---

## 04 — Mi primera APP (Móvil)

Aplicación móvil básica desarrollada con **Expo** y **React Native**. Incluye un contador con un botón flotante (FAB) y hooks personalizados.

---

## App Calculator (Móvil)

Aplicación de calculadora moderna y completa construida con **Expo**, **React Native** y **TypeScript**.

### Qué practica

- Lógica matemática avanzada con un **Custom Hook** (`useCalculator`).
- Gestión de estados complejos (fórmula, número actual, resultado previo).
- Interfaz de usuario oscura (Dark Mode) con estilos globales.
- Componentes altamente reutilizables y tipados.
- Integración de **Haptic Feedback** para una mejor experiencia táctil.
- Navegación basada en archivos con **Expo Router** (`Slot`).

### Cómo ejecutarlo

```bash
cd app-calculator
npm install
npx expo start
```

---

## SyntaxQuest (Web - React, TypeScript y Phaser)

Videojuego educativo web en 2D mejorado, donde los jugadores resuelven retos de sintaxis para escapar de un laberinto mientras compiten en modo carrera y gestionan progreso persistente.

### Qué practica

- **React + TypeScript**: estructura modular para menú, selección de niveles, editor y pantalla de juego.
- **Phaser**: lógica de movimiento, colisiones, retos y flujo de victoria.
- **Modo carrera**: competición contra un tiempo o contra una experiencia de desafío más rápida.
- **Editor de niveles**: creación y ajuste de mapas directamente desde la interfaz.
- **Persistencia**: niveles y progreso guardados en `localStorage` para continuar donde se quedó el jugador.
- **UX mejorada**: navegación clara entre pantallas y feedback visual más completo.

### Cómo ejecutarlo

```bash
cd SyntaxQuest
npm install
npm run dev
```

### Controles

- **W, A, S, D** o **Flechas**: mover al personaje.
- **Interacción**: activar retos al entrar en zonas especiales.
- **Ratón**: seleccionar la respuesta correcta en la terminal o interactuar con la interfaz.

---

## 05 — Sorting Simulator (Web - React)

Visualizador interactivo y completo de algoritmos de ordenamiento que permite entender cómo funcionan estructuras de datos fundamentales de forma gráfica, animada y comparativa.

### Qué practica

- **Visualización Asíncrona**: Uso de `async/await` y `Promise` para controlar el flujo de las animaciones en tiempo real.
- **Animaciones de Interfaz**: Implementación de **Framer Motion** para transiciones suaves entre estados de las barras.
- **Lógica de Algoritmos**: 7 algoritmos: Bubble, Selection, Insertion, Quick, Merge, Heap y Radix Sort.
- **Control de Estados Complejos**: Gestión de colores dinámicos y cancelación de procesos con `AbortController`.
- **Comparación Simultánea**: Ver dos algoritmos ejecutándose al mismo tiempo con arrays idénticos.
- **Exportación de GIF**: Capturar y guardar animaciones de tus sesiones de ordenamiento.
- **Historial de Ejecuciones**: Comparar tiempos y pasos de ejecuciones anteriores (almacenados en `localStorage`).
- **UI Moderna**: Diseño con **Tailwind CSS**, modo oscuro y controles interactivos de velocidad.

### Cómo ejecutarlo

```bash
cd 05-sorting-simulator
npm install
npm run dev
```

---

## 06 — Among Us Wiki (Web - HTML & CSS)

Página web estática estilo wiki dedicada a Among Us, cubriendo tanto el juego como la serie animada.

### Qué practica

- **HTML Semántico**: Uso de tags como `header`, `nav`, `section`, `article` y `footer`.
- **CSS Moderno**: Grid, Flexbox, gradients, sombras y animaciones.
- **Responsive Design**: Diseño adaptable a dispositivos móviles y desktop.
- **Tema Personalizado**: Estética inspirada en los colores y ambiente de Among Us.

### Cómo ejecutarlo

Solo necesitas abrir el archivo `index.html` en cualquier navegador web moderno.

---

## 07 — Spot the Impostor! (Web - Phaser 3)

Juego interactivo de Among Us donde tienes que hacer clic en los impostores rojos para ganar puntos antes de que se acabe el tiempo!

### Qué practica

- **Motor de Juego 2D**: Uso de **Phaser 3** para escenas, sprites y física.
- **Generación Dinámica de Gráficos**: Creación de sprites de crewmates/impostores directamente con código.
- **Gestión de Escenas**: Start, Play y Game Over.
- **Contadores y Temporizadores**: Score y tiempo limitado.
- **Interacción del Usuario**: Clics y estados de puntero.

### Cómo ejecutarlo

Solo necesitas un servidor web simple y abrir `index.html`!

---

## 09 — Ahorcado PWA (Web - Vanilla JS)

Juego clásico del ahorcado con diccionario por categorías, puntuación, récords y soporte PWA (instalable y offline).

### Qué practica

- **PWA**: `manifest.json`, Service Workers y caché offline.
- **Vanilla JavaScript**: Lógica del juego, canvas y DOM sin frameworks.
- **Diccionario por categorías**: Programación, videojuegos, animales, países y deportes.
- **Puntuación y récords**: Persistencia con `localStorage`.
- **Animaciones**: Feedback visual al acertar o fallar letras.
- **Diseño responsive**: Adaptado a móvil y escritorio.

### Cómo ejecutarlo

```bash
cd 09-ahorcado-pwa
npx serve .
```

Luego abre la URL que muestre el servidor (ej. `http://localhost:3000`).

---

## 10 — App de Recetas (Móvil - React Native & Expo)

Aplicación móvil de recetas con búsqueda, favoritos, filtros por dieta y lista de compras automática, integrada con la API de Spoonacular.

### Qué practica

- **React Native y Expo**: Desarrollo multiplataforma (iOS/Android) con componentes nativos.
- **Navegación**: Uso de `@react-navigation/native` con navegador de pestañas y stack.
- **Contexto Global**: `useContext` para gestionar favoritos y lista de compras.
- **Persistencia**: `AsyncStorage` para almacenar datos locales.
- **Integración con API**: Consumo de la API de Spoonacular para buscar recetas e ingredientes.
- **Diseño Responsive**: Interfaz moderna con estilos personalizados.

### Funcionalidades

- Búsqueda de recetas por nombre e ingredientes
- Filtros por dieta: vegetariano, vegano, sin gluten y sin lácteos
- Guardar recetas como favoritas
- Lista de compras automática (agregar/eliminar/verificar items)
- Vista detallada de recetas con instrucciones e ingredientes

### Cómo ejecutarlo

1. Obtén una API Key gratuita en [Spoonacular](https://spoonacular.com/food-api/console#Profile)
2. Agrega tu API Key en `src/services/spoonacular.ts`
3. Ejecuta:

```bash
cd 10-recetas-expo
npm install
npm run android  # Para Android
npm run ios      # Para iOS (solo macOS)
npm run web      # Para navegador web
```

---

## 11 — App de Notas con Markdown (Web - React & Supabase)

Aplicación de notas con autenticación, soporte para Markdown, carpetas y búsqueda, construida con React, TypeScript y Supabase.

### Qué practica

- **React 19 y TypeScript**: Componentes modernos y tipado fuerte.
- **Supabase**: Autenticación y base de datos en tiempo real.
- **Contexto Global**: `useContext` para gestión de estado y cliente de Supabase.
- **Markdown**: Renderizado de texto enriquecido con `react-markdown` y `remark-gfm`.
- **Tailwind CSS**: Interfaz moderna y responsive.
- **Seguridad**: Políticas RLS (Row Level Security) en Supabase para proteger los datos.

### Funcionalidades

- 🔐 **Autenticación**: Inicia sesión o registrate con email y contraseña
- 📝 **CRUD de Notas**: Crea, lee, actualiza y borra notas
- 📂 **Carpetas**: Organiza tus notas en carpetas
- 📖 **Markdown**: Soporte completo para Markdown con GFM
- 🔍 **Búsqueda**: Busca notas por título o contenido
- ☁️ **Persistencia**: Datos guardados en Supabase en tiempo real

### Cómo ejecutarlo

1. **Crea un proyecto en Supabase**: https://supabase.com
2. **Crea las tablas en Supabase**:
   ```sql
   -- Tabla de carpetas
   create table folders (
     id uuid default gen_random_uuid() primary key,
     created_at timestamp default now() not null,
     name text not null,
     user_id uuid references auth.users not null
   );

   -- Tabla de notas
   create table notes (
     id uuid default gen_random_uuid() primary key,
     created_at timestamp default now() not null,
     title text not null,
     content text default '',
     folder_id uuid references folders on delete set null,
     user_id uuid references auth.users not null,
     updated_at timestamp default now() not null
   );

   -- Habilita RLS
   alter table folders enable row level security;
   alter table notes enable row level security;

   -- Políticas de seguridad
   create policy "Usuarios pueden ver sus carpetas" on folders for select using (auth.uid() = user_id);
   create policy "Usuarios pueden crear carpetas" on folders for insert with check (auth.uid() = user_id);
   create policy "Usuarios pueden actualizar sus carpetas" on folders for update using (auth.uid() = user_id);
   create policy "Usuarios pueden borrar sus carpetas" on folders for delete using (auth.uid() = user_id);

   create policy "Usuarios pueden ver sus notas" on notes for select using (auth.uid() = user_id);
   create policy "Usuarios pueden crear notas" on notes for insert with check (auth.uid() = user_id);
   create policy "Usuarios pueden actualizar sus notas" on notes for update using (auth.uid() = user_id);
   create policy "Usuarios pueden borrar sus notas" on notes for delete using (auth.uid() = user_id);
   ```
3. **Configura tus variables de entorno**:
   Copia `.env.example` a `.env` y agrega tus credenciales de Supabase:
   ```
   VITE_SUPABASE_URL=tu-supabase-url
   VITE_SUPABASE_ANON_KEY=tu-supabase-anon-key
   ```
4. **Instala y ejecuta**:
   ```bash
   cd 11-notas-markdown
   npm install
   npm run dev
   ```

---

## 12 — Red Social Profesional

Red social moderna y completa con React, TypeScript, Node.js, PostgreSQL, Redis y Socket.io.

### Qué practica

- **Full Stack**: Desarrollo completo de aplicación web profesional
- **React 19 + TypeScript**: Frontend moderno y tipado
- **Node.js + Express**: API REST robusta
- **PostgreSQL + Prisma**: Base de datos relacional y ORM
- **Redis**: Caché para optimizar rendimiento
- **Socket.io**: Chat en tiempo real y notificaciones
- **React Query**: Manejo de estado del servidor
- **Tailwind CSS**: Interfaz moderna y responsive
- **Arquitectura cliente-servidor**: Separación clara entre frontend y backend

### Funcionalidades

- 🔐 **Autenticación**: Registro e inicio de sesión con JWT
- 👤 **Perfiles de usuarios**: Avatar, biografía, seguidores y seguidos
- 📝 **Publicaciones**: Texto, imágenes, videos con soporte Markdown
- ❤️ **Interacciones**: Likes, comentarios, compartir y guardar
- 💬 **Chat en tiempo real**: Mensajes instantáneos con Socket.io
- 🔔 **Notificaciones**: Notificaciones de interacciones
- 🎉 **Stories**: Historias temporales
- 🔍 **Búsqueda**: Buscar usuarios y contenido
- 📱 **Responsive**: Diseño adaptable a móviles y desktop

### Cómo ejecutarlo

**Requisitos previos:**
- Node.js 18+
- PostgreSQL
- Redis

**Backend:**
```bash
cd 12-red-social/server
npm install
npx prisma migrate dev --name init
npm run dev
```

**Frontend:**
```bash
cd 12-red-social/client
npm install
npm run dev
```

**Variables de entorno:**
Copiar `.env.example` a `.env` en ambos directorios y configurar las credenciales.



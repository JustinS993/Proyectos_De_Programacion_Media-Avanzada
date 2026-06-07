# Proyectos de Programación Media-Avanzada

Repositorio con ejercicios prácticos de **Electiva V**, enfocados en interfaces web con **React**, **TypeScript** y **Vite**, y desarrollo móvil con **React Native** y **Expo**. Cada carpeta es un proyecto independiente que puedes clonar, instalar y ejecutar por separado.

## Contenido del repositorio

| Carpeta | Descripción breve |
|--------|-------------------|
| [`02-ejercicio-contador`](./02-ejercicio-contador) | Contador interactivo con `useState` |
| [`03-ejercicio-lista-tareas`](./03-ejercicio-lista-tareas) | Lista de tareas (CRUD en memoria) con tipado e interfaces |
| [`04-mi-primera-app`](./04-mi-primera-app) | Mi primera aplicación móvil con Expo y React Native |
| [`app-calculator`](./app-calculator) | Aplicación de calculadora completa con Expo, Hooks y Haptics |
| [`SyntaxQuest`](./SyntaxQuest) | Videojuego educativo 2D de lógica y sintaxis con Phaser 3 |
| [`05-sorting-simulator`](./05-sorting-simulator) | Visualizador interactivo de algoritmos de ordenamiento con React y Framer Motion |

## Stack común

- **React 19** y **React DOM** (Web)
- **React Native** y **Expo** (Móvil)
- **TypeScript**
- **Vite 8** (desarrollo web)
- **ESLint** para calidad de código

Los `node_modules` y la carpeta `dist` no se versionan; en cada proyecto debes ejecutar `npm install` antes de desarrollar o compilar.

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

## SyntaxQuest (Web - Phaser 3)

Videojuego educativo web en 2D donde los jugadores resuelven acertijos de sintaxis de programación para escapar de un laberinto digital mientras son perseguidos por un virus.

### Qué practica

- **Motor de Juego 2D**: Uso de **Phaser 3** para físicas, colisiones, sistemas de partículas y animaciones de cámara.
- **IA de Persecución**: Implementación de un enemigo dinámico que sigue al jugador por el laberinto.
- **The Judge (Web Workers)**: Ejecución segura y aislada de código JavaScript para validar desafíos.
- **Desafíos de Sintaxis**: Sistema de selección múltiple integrado en una terminal retro.
- **Arquitectura de Niveles**: Diseño de laberinto con conectividad garantizada y rutas de escape estratégicas.
- **Feedback Visual**: Efectos de sacudida de cámara (shake), destellos (flash) y sistemas de partículas.

### Cómo ejecutarlo

```bash
# Solo necesitas un servidor web simple
# Si tienes Python:
python -m http.server 8000
# Luego abre http://localhost:8000/SyntaxQuest/
```

### Controles

- **W, A, S, D** o **Flechas**: Mover al personaje.
- **Interacción**: Colisionar con los sensores amarillos para activar desafíos.
- **Ratón**: Seleccionar la respuesta correcta en la terminal.

---

## 05 — Sorting Simulator (Web - React)

Visualizador interactivo de algoritmos de ordenamiento que permite entender cómo funcionan estructuras de datos fundamentales de forma gráfica y animada.

### Qué practica

- **Visualización Asíncrona**: Uso de `async/await` y `Promise` para controlar el flujo de las animaciones en tiempo real.
- **Animaciones de Interfaz**: Implementación de **Framer Motion** para transiciones suaves entre estados de las barras.
- **Lógica de Algoritmos**: Implementación manual de Bubble Sort, Selection Sort y más.
- **Control de Estados Complejos**: Gestión de colores dinámicos (comparando, intercambiando, ordenado) y cancelación de procesos con `AbortController`.
- **UI Moderna**: Diseño con **Tailwind CSS**, modo oscuro y controles interactivos de velocidad.

### Cómo ejecutarlo

```bash
cd 05-sorting-simulator
npm install
npm run dev
```

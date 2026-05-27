# Proyectos de Programación Media-Avanzada

Repositorio con ejercicios prácticos de **Electiva V**, enfocados en interfaces web con **React**, **TypeScript** y **Vite**, y desarrollo móvil con **React Native** y **Expo**. Cada carpeta es un proyecto independiente que puedes clonar, instalar y ejecutar por separado.

## Contenido del repositorio

| Carpeta | Descripción breve |
|--------|-------------------|
| [`02-ejercicio-contador`](./02-ejercicio-contador) | Contador interactivo con `useState` |
| [`03-ejercicio-lista-tareas`](./03-ejercicio-lista-tareas) | Lista de tareas (CRUD en memoria) con tipado e interfaces |
| [`04-mi-primera-app`](./04-mi-primera-app) | Mi primera aplicación móvil con Expo y React Native |
| [`app-calculator`](./app-calculator) | Aplicación de calculadora completa con Expo, Hooks y Haptics |

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

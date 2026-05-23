# Proyectos de Programación Media-Avanzada

Repositorio con ejercicios prácticos de **Electiva V**, enfocados en interfaces web con **React**, **TypeScript** y **Vite**. Cada carpeta es un proyecto independiente que puedes clonar, instalar y ejecutar por separado.

## Contenido del repositorio

| Carpeta | Descripción breve |
|--------|-------------------|
| [`02-ejercicio-contador`](./02-ejercicio-contador) | Contador interactivo con `useState` |
| [`03-ejercicio-lista-tareas`](./03-ejercicio-lista-tareas) | Lista de tareas (CRUD en memoria) con tipado e interfaces |
| [`04-mi-primera-app`](./04-mi-primera-app) | Mi primera aplicación móvil con Expo y React Native |

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

### Funcionalidad

- **Sumar +1** y **Restar -1** modifican el valor mostrado
- **Resetear** deja el contador en `0`
- Interfaz en español con estilos propios del proyecto (tarjeta, botones, pill del valor)

### Cómo ejecutarlo

```bash
cd 02-ejercicio-contador
npm install
npm run dev
```

Otros scripts útiles: `npm run build` (compilación), `npm run preview` (vista previa del build), `npm run lint`.

---

## 03 — Ejercicio Lista de Tareas

Aplicación de **lista de tareas en memoria** (no persiste al recargar la página): agregar, marcar como hecha, eliminar y vaciar la lista.

### Qué practica

- **`useState`** para el texto del input y para el arreglo de tareas
- **Interface `Tarea`** en TypeScript (`id`, `texto`, `completed`)
- Operaciones sobre listas: **map**, **filter**, inmutabilidad al actualizar ítems
- **IDs** basados en `Date.now()` para claves estables en la lista
- Accesibilidad básica: **Enter** para agregar; el texto de la tarea responde a teclado para alternar completado

### Funcionalidad

- Campo de texto y botón **Agregar tarea** (también **Enter** si hay texto)
- Clic (o **Enter** con foco) en el texto de una tarea alterna entre pendiente y completada (estilo visual distinto)
- **Eliminar** quita una tarea concreta
- **Resetear lista** borra todas las tareas
- Mensaje cuando la lista está vacía

### Cómo ejecutarlo

```bash
cd 03-ejercicio-lista-tareas
npm install
npm run dev
```

Mismos scripts adicionales que en el ejercicio del contador (`build`, `preview`, `lint`).

---

## 04 — Mi primera APP (Móvil)

Aplicación móvil básica desarrollada con **Expo** y **React Native**. Incluye un contador con un botón flotante (FAB) y hooks personalizados.

### Qué practica

- Desarrollo móvil multiplataforma con **Expo**
- Componentes nativos y estilos con `StyleSheet`
- Hooks personalizados (`useCounter`)
- Componentes reutilizables (`FAB`)

### Cómo ejecutarlo

```bash
cd 04-mi-primera-app
npm install
npx expo start
```

---

## Requisitos

- **Node.js** (versión compatible con Vite 8; se recomienda LTS reciente)
- **npm** (incluido con Node)

## Autor y contexto

Proyectos desarrollados en el marco de la asignatura de programación media-avanzada, con identidad visual que incluye recursos institucionales (por ejemplo logo Unimayor) en cada aplicación.

Si quieres enlazar este repositorio en informes o portafolios, la URL del remoto es:

**https://github.com/JustinS993/Proyectos_De_Programacion_Media-Avanzada**

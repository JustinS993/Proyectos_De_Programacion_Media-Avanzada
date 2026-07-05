# Red Social Profesional

Red social moderna con React, TypeScript, Node.js, PostgreSQL, Redis y Socket.io.

## Tecnologías

**Backend:**
- Node.js + Express + TypeScript
- PostgreSQL con Prisma ORM
- Redis para caché
- Socket.io para chat en tiempo real

**Frontend:**
- React 19 + TypeScript + Vite
- React Query para manejo de estado
- React Router para navegación
- Tailwind CSS
- Socket.io Client

## Características

- 🔐 **Autenticación**: Registro e inicio de sesión con JWT
- 👤 **Usuarios**: Perfiles, seguidores y seguidos
- 📝 **Publicaciones**: Texto, imágenes, videos con soporte Markdown
- ❤️ **Interacciones**: Likes, comentarios, compartir
- 💬 **Chat**: Chat en tiempo real con Socket.io
- 🔔 **Notificaciones**: Notificaciones de interacciones
- 🔍 **Búsqueda**: Buscar usuarios y publicaciones
- 🎉 **Stories**: Historias temporales

## Instalación

### Requisitos previos
- Node.js 18+
- PostgreSQL
- Redis

### Backend

1. `cd server`
2. Instalar dependencias: `npm install`
3. Copiar `.env.example` a `.env` y configurar variables
4. Configurar la base de datos: `npx prisma migrate dev --name init`
5. Iniciar servidor: `npm run dev`

### Frontend

1. `cd client`
2. Instalar dependencias: `npm install`
3. Copiar `.env.example` a `.env`
4. Iniciar app: `npm run dev`

## Scripts

**Server:**
- `npm run dev`: Iniciar en modo desarrollo
- `npm run build`: Compilar para producción
- `npm start`: Iniciar en modo producción

**Client:**
- `npm run dev`: Iniciar en modo desarrollo
- `npm run build`: Compilar para producción
- `npm run preview`: Previsualizar producción

## API Endpoints

### Autenticación
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Inicio de sesión

### Posts
- `GET /api/posts/feed` - Obtener feed
- `POST /api/posts` - Crear publicación
- `POST /api/posts/:id/like` - Dar like
- `POST /api/posts/:id/comment` - Comentar

### Usuarios
- `GET /api/users/search?q=...` - Buscar usuarios
- `GET /api/users/:username` - Obtener perfil
- `POST /api/users/:id/follow` - Seguir/Dejar de seguir

## Estructura del proyecto

```
12-red-social/
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── types/
│   │   └── utils/
│   └── ...
└── server/
    ├── src/
    │   ├── controllers/
    │   ├── middleware/
    │   ├── routes/
    │   ├── types/
    │   └── utils/
    ├── prisma/
    └── ...
```

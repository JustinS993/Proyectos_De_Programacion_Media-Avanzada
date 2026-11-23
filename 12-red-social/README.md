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
4. Aplicar las migraciones incluidas: `npm run db:deploy`. Para generar nuevas migraciones en desarrollo: `npm run db:migrate -- --name nombre_del_cambio`.
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
- `POST /api/auth/register` - Registro; devuelve access token corto y configura refresh token HttpOnly
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/refresh` - Rotar refresh token y recibir un nuevo access token
- `POST /api/auth/logout` - Revocar refresh token y cerrar sesión

Los access tokens duran 15 minutos y solo se guardan en memoria en el cliente. El refresh token se almacena como hash en PostgreSQL y se envía en una cookie HttpOnly, SameSite=Lax y Secure en producción. La rotación revoca tokens ya usados y, ante una reutilización detectada, revoca la familia de sesión; los tokens expirados se limpian durante la renovación. Configura `JWT_SECRET` con un valor aleatorio de al menos 32 caracteres. Para frontend y API en sitios distintos, configura `REFRESH_COOKIE_SECURE=true` y `REFRESH_COOKIE_SAME_SITE=none` al servir por HTTPS.

El chat usa `socket.handshake.auth.token` con el access token. El servidor obtiene el remitente del `sub` del JWT; el cliente no envía `senderId`. Cada usuario puede enviar hasta 20 eventos de chat cada 10 segundos por instancia del servidor.

Si la base ya tenía tablas creadas antes de incluir Prisma Migrate, haz un respaldo y comprueba que coincide con `server/prisma/schema.prisma`. Solo entonces marca la migración inicial como aplicada con `npx prisma migrate resolve --applied 20261122190000_init`; no ejecutes esto sobre una base vacía.

### Pruebas

```bash
cd server
npm test
```

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

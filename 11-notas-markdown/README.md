# App de Notas con Markdown y Supabase

Aplicación de notas con autenticación, soporte para Markdown, carpetas y búsqueda, construida con React, TypeScript y Supabase.

## Características

- 🔐 **Autenticación**: Inicia sesión o registrate con email y contraseña
- 📝 **CRUD de Notas**: Crea, lee, actualiza y borra notas
- 📂 **Carpetas**: Organiza tus notas en carpetas
- 📖 **Markdown**: Soporte completo para Markdown con GFM
- 🔍 **Búsqueda**: Busca notas por título o contenido
- ☁️ **Supabase**: Persistencia en tiempo real

## Configuración

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

4. **Instala las dependencias**:
   ```bash
   npm install
   ```

5. **Inicia el proyecto**:
   ```bash
   npm run dev
   ```

## Tecnologías

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Supabase
- React Markdown
- Remark GFM

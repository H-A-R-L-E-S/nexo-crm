# Nexo CRM

CRM desarrollado con Next.js 16. El módulo de Clientes usa Supabase; el resto del proyecto conserva las vistas existentes.

## Configuración de Supabase

1. Crea un proyecto en Supabase.
2. Ejecuta [supabase/schema.sql](supabase/schema.sql) en el editor SQL de Supabase. Sus políticas RLS son temporales para desarrollo: permiten operaciones públicas sin login. Reemplázalas antes de publicar la aplicación.
3. Opcionalmente ejecuta [supabase/seed.sql](supabase/seed.sql) para insertar cinco clientes ficticios.
4. Copia `.env.example` a `.env.local` en la raíz del repositorio.
5. Agrega la URL del proyecto y la clave pública `anon` en `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

6. Reinicia el servidor. Para desarrollo usa `npm run dev -- --webpack` debido al problema conocido de parsing del CSS con Turbopack.

`.env.local` permanece fuera de Git. Nunca coloques una clave `service_role` en una variable `NEXT_PUBLIC_`.

## Verificación

```bash
npm run lint
npm run build -- --webpack
npm run test:e2e
```

Las pruebas de Playwright simulan las respuestas de Supabase y no necesitan credenciales reales.

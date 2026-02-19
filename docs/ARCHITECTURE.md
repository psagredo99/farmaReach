# Arquitectura Backend

## Capas

- `src/api`: endpoints HTTP y esquemas.
- `src/core`: configuracion, sesion DB y modelos ORM.
- `src/services`: casos de uso y conectores externos (collectors, mailer, templates).

## Auth y DB cloud

- Login/register/me se resuelven contra Supabase Auth.
- El token `Bearer` valido para endpoints privados es el `access_token` de Supabase.
- La persistencia de datos de negocio usa `DB_URL` (recomendado: Postgres de Supabase).

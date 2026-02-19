# Farmacia Outreach App

Aplicacion para captar leads de farmacias y lanzar campanas de outreach.

## Stack actual

- Backend: FastAPI (`src/api/main.py`)
- Frontend: HTML/CSS/JS (`frontend/*`)
- Auth: Supabase Auth (email/password)
- DB: Postgres cloud (recomendado: Supabase Postgres)

## Variables de entorno

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=sb_publishable_xxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx
DB_URL=postgresql+psycopg2://USER:PASSWORD@HOST:5432/postgres
SERPAPI_KEY=
GMAIL_ADDRESS=
GMAIL_APP_PASSWORD=
REQUEST_TIMEOUT=20
```

Notas:
- `SUPABASE_ANON_KEY` se usa para login/register/me via Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` se reserva para backend (no exponer en frontend).
- `DB_URL` debe apuntar a una base cloud (Supabase o equivalente).

## Ejecutar

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Abrir: `http://127.0.0.1:8000/`

## Endpoints

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `GET /template/default`
- `POST /capture`
- `GET /leads`
- `POST /leads/enrich-emails`
- `POST /campaign/send`

Auth:
- `auth/*` y `health` son publicos.
- El resto requiere `Authorization: Bearer <supabase_access_token>`.

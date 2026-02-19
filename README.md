# Farmacia Outreach App

Aplicacion para:
1. Captar farmacias por zona/codigo postal.
2. Construir una base de leads con datos de contacto.
3. Enviar campanas de email con plantilla personalizada por lead.

## Arquitectura

- Backend API: `FastAPI` (`src/api/main.py`)
- Frontend web: `frontend/index.html` + `frontend/styles.css` + `frontend/js/*`
- Persistencia: `SQLAlchemy` (`SQLite` local / `Postgres` en deploy)
- Capas backend:
  - `src/api`: endpoints HTTP
  - `src/core`: configuracion, DB, modelos
  - `src/services`: collectors, templates, mailer, enrichment

## Configuracion

1. Crear entorno:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Crear `.env` en la raiz:

```env
SERPAPI_KEY=tu_api_key_opcional
GMAIL_ADDRESS=tu_correo@gmail.com
GMAIL_APP_PASSWORD=tu_app_password_gmail
DB_URL=sqlite:///farmacia_leads.db
JWT_SECRET_KEY=cambia-esta-clave-en-produccion
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440
REQUEST_TIMEOUT=15
```

## Ejecucion

```powershell
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

Abrir en navegador:

```text
http://127.0.0.1:8000/
```

## Deploy en Render

Este repo incluye `render.yaml` para desplegar:
- 1 Web Service FastAPI
- 1 Postgres gestionado

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

Autenticacion:
- `auth/*` y `health` son publicos.
- El resto requiere token `Bearer`.

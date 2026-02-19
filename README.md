# Farmacia Outreach App

Aplicacion para:
1. Captar farmacias por zona/codigo postal.
2. Construir una base de leads con datos de contacto.
3. Enviar campanas de email con plantilla personalizada por lead.

## Arquitectura

- Backend API: `FastAPI` (`src/api/main.py`)
- Frontend web: `frontend/index.html` + `frontend/styles.css` + `frontend/js/*`
- Persistencia: `SQLAlchemy + SQLite`
- Captacion: `requests + bs4` (Google Maps via SerpApi / Paginas Amarillas / OpenStreetMap)
- Envio: `SMTP Gmail`

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

Notas:
- `SERPAPI_KEY` solo es necesaria para Google Maps.
- Para Gmail necesitas App Password (2FA habilitado).
- OpenStreetMap (Nominatim/Overpass) se puede usar en modo dev sin API key.

## Estructura de carpetas

```text
FARMACIA/
  src/
    api/                # Endpoints FastAPI
    core/               # Configuracion, DB y modelos
    services/           # Logica de negocio (collectors, mailer, templates, enrichment)
    collectors/         # Wrappers legacy (compatibilidad)
    mailer/             # Wrappers legacy (compatibilidad)
    templates/          # Wrappers legacy (compatibilidad)
  frontend/
    index.html          # Estructura
    styles.css          # Estilos
    js/                 # JavaScript modular
  app.py                # Frontend Streamlit legacy (opcional)
  render.yaml           # Deploy Render Blueprint
```

## Ejecucion recomendada

1. Levantar backend:

```powershell
uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload
```

2. Abrir frontend servido por FastAPI:

```text
http://127.0.0.1:8000/
```

## Deploy en Render (recomendado)

Este repositorio incluye `render.yaml` para desplegar:
- 1 servicio web FastAPI (`farmacia-outreach-api`)
- 1 base de datos Postgres gestionada (`farmacia-outreach-db`)

Pasos:
1. Sube el proyecto a GitHub.
2. En Render: `New` -> `Blueprint`.
3. Conecta el repo y selecciona este proyecto.
4. Render leera `render.yaml` y propondra crear backend + DB.
5. Tras el deploy, abre la URL del servicio (ej: `https://tu-servicio.onrender.com/`).

Variables a configurar en Render (Environment):
- `SERPAPI_KEY` (opcional)
- `GMAIL_ADDRESS` (opcional, para envio)
- `GMAIL_APP_PASSWORD` (opcional, para envio)

Notas:
- `DB_URL` se inyecta automaticamente desde la base de datos de Render.
- El frontend se sirve desde el mismo backend en la ruta `/`.

## Endpoints backend

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
- El resto de endpoints requieren token `Bearer`.
- El frontend ya incluye login/registro y guarda token en `localStorage`.

Notas API:
- `GET /health` devuelve capacidades de configuracion (`serpapi_configured`, `gmail_configured`).
- `GET /leads` soporta `only_pending`, `require_email`, `fuente`, `skip`, `limit`.
- `POST /capture` puede devolver `warnings` si falta configuracion (por ejemplo, `SERPAPI_KEY`).
- En `capture`, `fuente` soporta: `openstreetmap`, `google_maps`, `paginas_amarillas`, `ambas`, `todas`.

## Variables de plantilla

Disponibles en asunto y cuerpo:
- `{{ nombre }}`
- `{{ zona }}`
- `{{ codigo_postal }}`
- `{{ remitente }}`
- `{{ firma }}`
- `{{ propuesta_valor }}`

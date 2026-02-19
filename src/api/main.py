from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select
from pathlib import Path
import requests

from src.core.config import (
    GMAIL_ADDRESS,
    GMAIL_APP_PASSWORD,
    REQUEST_TIMEOUT,
    SERPAPI_KEY,
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
)
from src.core.db import get_session, init_db
from src.core.models import EmailLog, Lead
from src.services.collectors.google_maps_serpapi import search_google_maps_farmacias
from src.services.collectors.openstreetmap_overpass import search_openstreetmap_farmacias
from src.services.collectors.paginas_amarillas import search_paginas_amarillas_farmacias
from src.services.lead_enrichment import find_email_from_website
from src.services.mailer import send_gmail
from src.services.template_engine import DEFAULT_TEMPLATE, render_email

from .schemas import (
    AuthResponse,
    CampaignRequest,
    CampaignResponse,
    CaptureRequest,
    CaptureResponse,
    EnrichResponse,
    HealthResponse,
    LoginRequest,
    LeadResponse,
    RegisterRequest,
)

app = FastAPI(title="Farmacia Backend API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_DIR = Path(__file__).resolve().parents[2] / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/frontend", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
security = HTTPBearer(auto_error=False)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def _lead_to_dict(lead: Lead) -> dict:
    return {
        "id": lead.id,
        "nombre": lead.nombre,
        "direccion": lead.direccion,
        "zona": lead.zona,
        "codigo_postal": lead.codigo_postal,
        "telefono": lead.telefono,
        "website": lead.website,
        "email": lead.email,
        "fuente": lead.fuente,
        "estado_envio": lead.estado_envio,
    }


def _auth_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado",
    )


def _supabase_headers(with_auth: str = "") -> dict:
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
    }
    if with_auth:
        headers["Authorization"] = f"Bearer {with_auth}"
    return headers


def _supabase_error_message(res: requests.Response) -> str:
    try:
        payload = res.json()
    except Exception:
        return f"Supabase error HTTP {res.status_code}"
    return payload.get("msg") or payload.get("error_description") or payload.get("error") or f"Supabase error HTTP {res.status_code}"


def _supabase_auth_check() -> None:
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise HTTPException(status_code=500, detail="Supabase no configurado (SUPABASE_URL/SUPABASE_ANON_KEY)")


def _supabase_get_user(token: str) -> dict:
    _supabase_auth_check()
    url = f"{SUPABASE_URL}/auth/v1/user"
    try:
        res = requests.get(url, headers=_supabase_headers(with_auth=token), timeout=REQUEST_TIMEOUT)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error conectando con Supabase: {exc}") from exc
    if not res.ok:
        raise _auth_error()
    data = res.json()
    metadata = data.get("user_metadata") or {}
    return {
        "id": data.get("id", ""),
        "email": data.get("email", ""),
        "nombre": metadata.get("nombre") or metadata.get("name") or "",
    }


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(security)) -> dict:
    if not credentials or credentials.scheme.lower() != "bearer":
        raise _auth_error()
    return _supabase_get_user(credentials.credentials)


def _upsert_leads(leads: list[dict], zona_val: str, cp_val: str) -> int:
    saved = 0
    with get_session() as session:
        for lead in leads:
            lead["zona"] = lead.get("zona") or zona_val
            lead["codigo_postal"] = lead.get("codigo_postal") or cp_val
            existing = session.execute(
                select(Lead).where(Lead.nombre == lead["nombre"], Lead.direccion == lead.get("direccion", ""))
            ).scalar_one_or_none()

            if existing:
                if not existing.website and lead.get("website"):
                    existing.website = lead["website"]
                if not existing.telefono and lead.get("telefono"):
                    existing.telefono = lead["telefono"]
                if not existing.email and lead.get("email"):
                    existing.email = lead["email"]
                continue

            session.add(Lead(**lead))
            saved += 1
    return saved


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        capabilities={
            "serpapi_configured": bool(SERPAPI_KEY),
            "gmail_configured": bool(GMAIL_ADDRESS and GMAIL_APP_PASSWORD),
            "openstreetmap_public": True,
            "auth_enabled": True,
            "supabase_configured": bool(SUPABASE_URL and SUPABASE_ANON_KEY),
        },
    )


@app.get("/")
def frontend_index():
    index_path = FRONTEND_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=404, detail="Frontend no encontrado")
    return FileResponse(index_path)


@app.post("/auth/register", response_model=AuthResponse)
def register(payload: RegisterRequest) -> AuthResponse:
    email = payload.email.strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="Email obligatorio")
    _supabase_auth_check()
    url = f"{SUPABASE_URL}/auth/v1/signup"
    body = {
        "email": email,
        "password": payload.password,
        "data": {"nombre": payload.nombre.strip()},
    }
    try:
        res = requests.post(url, headers=_supabase_headers(), json=body, timeout=REQUEST_TIMEOUT)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error conectando con Supabase: {exc}") from exc
    if not res.ok:
        raise HTTPException(status_code=400, detail=_supabase_error_message(res))
    # For compatibility with existing frontend, perform a login to return access_token.
    return login(LoginRequest(email=email, password=payload.password))


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: LoginRequest) -> AuthResponse:
    email = payload.email.strip().lower()
    _supabase_auth_check()
    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"
    body = {
        "email": email,
        "password": payload.password,
    }
    try:
        res = requests.post(url, headers=_supabase_headers(), json=body, timeout=REQUEST_TIMEOUT)
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Error conectando con Supabase: {exc}") from exc
    if not res.ok:
        raise HTTPException(status_code=401, detail=_supabase_error_message(res))
    data = res.json()
    token = data.get("access_token")
    user = data.get("user") or {}
    if not token:
        raise HTTPException(status_code=401, detail="Supabase no devolvio access_token")
    metadata = user.get("user_metadata") or {}
    return AuthResponse(
        access_token=token,
        user={
            "id": user.get("id", ""),
            "email": user.get("email", email),
            "nombre": metadata.get("nombre") or metadata.get("name") or "",
        },
    )


@app.get("/auth/me")
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


@app.get("/template/default")
def get_default_template(current_user: dict = Depends(get_current_user)) -> dict:
    _ = current_user
    return {"template": DEFAULT_TEMPLATE}


@app.post("/capture", response_model=CaptureResponse)
def capture_leads(payload: CaptureRequest, current_user: dict = Depends(get_current_user)) -> CaptureResponse:
    _ = current_user
    criterio = " ".join(
        [x for x in ["farmacia", payload.zona, payload.codigo_postal, payload.query_extra] if x]
    ).strip()
    if not criterio:
        raise HTTPException(status_code=400, detail="Indica al menos una zona o codigo postal")

    results = []
    warnings = []
    if payload.fuente in ("google_maps", "ambas", "todas"):
        if not SERPAPI_KEY:
            warnings.append("SERPAPI_KEY no configurada: se omite Google Maps")
        results.extend(search_google_maps_farmacias(criterio)[: payload.max_items])
    if payload.fuente in ("paginas_amarillas", "ambas", "todas"):
        source_q = payload.zona or payload.codigo_postal
        results.extend(search_paginas_amarillas_farmacias(source_q)[: payload.max_items])
    if payload.fuente in ("openstreetmap", "todas"):
        source_q = payload.zona or payload.codigo_postal or criterio
        results.extend(search_openstreetmap_farmacias(source_q)[: payload.max_items])

    saved = _upsert_leads(results, payload.zona, payload.codigo_postal) if results else 0
    return CaptureResponse(criterio=criterio, found=len(results), saved=saved, results=results, warnings=warnings)


@app.get("/leads", response_model=list[LeadResponse])
def get_leads(
    only_pending: bool = False,
    require_email: bool = False,
    fuente: str = "",
    skip: int = 0,
    limit: int = 500,
    current_user: dict = Depends(get_current_user),
) -> list[LeadResponse]:
    _ = current_user
    if skip < 0:
        raise HTTPException(status_code=400, detail="skip debe ser >= 0")
    if limit < 1 or limit > 1000:
        raise HTTPException(status_code=400, detail="limit debe estar entre 1 y 1000")

    with get_session() as session:
        query = select(Lead)
        if only_pending:
            query = query.where(Lead.estado_envio == "pendiente")
        if require_email:
            query = query.where(Lead.email != "")
        if fuente:
            query = query.where(Lead.fuente == fuente)

        rows = session.execute(query.order_by(Lead.id.desc()).offset(skip).limit(limit)).scalars().all()
        return [LeadResponse(**_lead_to_dict(row)) for row in rows]


@app.post("/leads/enrich-emails", response_model=EnrichResponse)
def enrich_missing_emails(current_user: dict = Depends(get_current_user)) -> EnrichResponse:
    _ = current_user
    enriched = 0
    with get_session() as session:
        rows = session.execute(select(Lead).where(Lead.email == "", Lead.website != "")).scalars().all()
        for lead in rows:
            email = find_email_from_website(lead.website)
            if email:
                lead.email = email
                enriched += 1

    return EnrichResponse(candidates=len(rows), enriched=enriched)


@app.post("/campaign/send", response_model=CampaignResponse)
def send_campaign(payload: CampaignRequest, current_user: dict = Depends(get_current_user)) -> CampaignResponse:
    _ = current_user
    sent = 0
    errors = 0

    with get_session() as session:
        query = select(Lead).where(Lead.email != "")
        if payload.only_pending:
            query = query.where(Lead.estado_envio == "pendiente")
        if payload.lead_ids:
            query = query.where(Lead.id.in_(payload.lead_ids))
        targets = session.execute(query.order_by(Lead.id.desc())).scalars().all()

        for lead in targets:
            context = {
                "nombre": lead.nombre,
                "zona": lead.zona or lead.codigo_postal or "tu zona",
                "codigo_postal": lead.codigo_postal,
                "remitente": payload.remitente,
                "firma": payload.firma,
                "propuesta_valor": payload.propuesta_valor,
            }
            cuerpo = render_email(payload.template_text, context)
            asunto_render = render_email(payload.asunto, context)

            ok, detail = send_gmail(lead.email, asunto_render, cuerpo, payload.remitente)
            status = "enviado" if ok else "error"

            lead.estado_envio = status
            session.add(
                EmailLog(
                    lead_id=lead.id,
                    destinatario=lead.email,
                    asunto=asunto_render,
                    cuerpo=cuerpo,
                    estado=status,
                    detalle=detail,
                )
            )

            if ok:
                sent += 1
            else:
                errors += 1

    return CampaignResponse(total=sent + errors, sent=sent, errors=errors)

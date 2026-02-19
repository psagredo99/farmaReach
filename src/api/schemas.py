from typing import Literal

from pydantic import BaseModel, Field


class CaptureRequest(BaseModel):
    zona: str = ""
    codigo_postal: str = ""
    fuente: Literal["google_maps", "paginas_amarillas", "openstreetmap", "ambas", "todas"] = "ambas"
    query_extra: str = ""
    max_items: int = Field(default=20, ge=5, le=100)


class CaptureResponse(BaseModel):
    criterio: str
    found: int
    saved: int
    results: list[dict]
    warnings: list[str] = []


class LeadResponse(BaseModel):
    id: int
    nombre: str
    direccion: str
    zona: str
    codigo_postal: str
    telefono: str
    website: str
    email: str
    fuente: str
    estado_envio: str


class EnrichResponse(BaseModel):
    candidates: int
    enriched: int


class CampaignRequest(BaseModel):
    asunto: str = "Propuesta para {{ nombre }}"
    remitente: str = "Equipo Comercial"
    firma: str = "Tu Empresa | +34 XXX XXX XXX"
    propuesta_valor: str = "captacion de pacientes y optimizacion de campanas"
    template_text: str
    only_pending: bool = True
    lead_ids: list[int] | None = None


class CampaignResponse(BaseModel):
    total: int
    sent: int
    errors: int


class HealthResponse(BaseModel):
    status: str
    capabilities: dict[str, bool]


class ErrorResponse(BaseModel):
    detail: str


class RegisterRequest(BaseModel):
    email: str
    password: str = Field(min_length=8, max_length=128)
    nombre: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class RegisterResponse(BaseModel):
    ok: bool = True
    email: str
    requires_email_verification: bool = True
    message: str

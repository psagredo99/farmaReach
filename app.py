import requests
import pandas as pd
import streamlit as st

BACKEND_URL_DEFAULT = "http://127.0.0.1:8000"
REQUEST_TIMEOUT = 60

st.set_page_config(page_title="Farmacia Outreach", layout="wide")
st.title("Captacion y Outreach para Farmacias")
st.caption("Frontend Streamlit conectado a backend API")


@st.cache_data(ttl=60)
def _get_default_template(api_base: str) -> str:
    try:
        resp = requests.get(f"{api_base}/template/default", timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp.json().get("template", "")
    except Exception:
        return (
            "Hola {{ nombre }},\n\n"
            "Soy {{ remitente }} y te contacto porque trabajamos con farmacias de la zona de {{ zona }} para mejorar {{ propuesta_valor }}.\n\n"
            "Si te interesa, te comparto una propuesta breve adaptada a {{ nombre }}.\n\n"
            "Un saludo,\n"
            "{{ remitente }}\n"
            "{{ firma }}\n"
        )


def _safe_get(api_base: str, path: str, params: dict | None = None):
    resp = requests.get(f"{api_base}{path}", params=params, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _safe_post(api_base: str, path: str, payload: dict):
    resp = requests.post(f"{api_base}{path}", json=payload, timeout=REQUEST_TIMEOUT)
    resp.raise_for_status()
    return resp.json()


def _extract_error(ex: Exception) -> str:
    if isinstance(ex, requests.HTTPError) and ex.response is not None:
        try:
            payload = ex.response.json()
            detail = payload.get("detail")
            if detail:
                return str(detail)
        except Exception:
            pass
        return f"HTTP {ex.response.status_code}"
    return str(ex)


with st.sidebar:
    st.header("Conexion backend")
    backend_url = st.text_input("Backend URL", value=BACKEND_URL_DEFAULT)

    try:
        health = _safe_get(backend_url, "/health")
        if health.get("status") == "ok":
            st.success("Backend conectado")
            capabilities = health.get("capabilities", {})
            if not capabilities.get("serpapi_configured", False):
                st.warning("SERPAPI_KEY no configurada: Google Maps no devolvera resultados")
            if not capabilities.get("gmail_configured", False):
                st.warning("Gmail no configurado: no podras enviar campanas")
            if capabilities.get("openstreetmap_public", False):
                st.info("OpenStreetMap activo (modo pruebas, sin API key)")
        else:
            st.warning("Backend responde sin estado OK")
    except Exception as ex:
        st.error(f"No se pudo conectar al backend: {_extract_error(ex)}")

    st.header("Parametros")
    zona = st.text_input("Zona", placeholder="Ej: Madrid Centro")
    codigo_postal = st.text_input("Codigo postal", placeholder="Ej: 28001")
    fuente = st.selectbox(
        "Fuente",
        ["openstreetmap", "google_maps", "paginas_amarillas", "ambas", "todas"],
    )


tab1, tab2, tab3 = st.tabs(["1) Captacion", "2) Leads", "3) Envio de correos"])

with tab1:
    st.subheader("Buscar farmacias")
    col_a, col_b = st.columns(2)
    with col_a:
        query_extra = st.text_input("Texto adicional para busqueda", placeholder="Ej: farmacia guardia")
    with col_b:
        max_items = st.number_input("Max. resultados por fuente", min_value=5, max_value=100, value=20, step=5)

    if st.button("Ejecutar captacion", type="primary"):
        payload = {
            "zona": zona,
            "codigo_postal": codigo_postal,
            "fuente": fuente,
            "query_extra": query_extra,
            "max_items": int(max_items),
        }
        try:
            with st.spinner("Ejecutando captacion..."):
                data = _safe_post(backend_url, "/capture", payload)
            found = data.get("found", 0)
            saved = data.get("saved", 0)
            results = data.get("results", [])
            warnings = data.get("warnings", [])

            if not results:
                st.warning("No se encontraron resultados. Revisa credenciales/API o prueba otros parametros.")
            else:
                st.success(f"Leads encontrados: {found}. Nuevos guardados: {saved}.")
                st.dataframe(pd.DataFrame(results), use_container_width=True)
            for warning in warnings:
                st.warning(warning)
        except Exception as ex:
            st.error(f"Error en captacion: {_extract_error(ex)}")

with tab2:
    st.subheader("Base de leads")
    col_f1, col_f2, col_f3 = st.columns(3)
    with col_f1:
        fuente_filter = st.selectbox("Filtrar fuente", ["", "google_maps", "paginas_amarillas"])
    with col_f2:
        page_size = st.selectbox("Tamano pagina", [25, 50, 100, 250], index=1)
    with col_f3:
        page = st.number_input("Pagina", min_value=1, value=1, step=1)

    try:
        rows = _safe_get(
            backend_url,
            "/leads",
            params={
                "fuente": fuente_filter,
                "skip": (int(page) - 1) * int(page_size),
                "limit": int(page_size),
            },
        )
    except Exception as ex:
        rows = []
        st.error(f"No se pudieron cargar leads: {_extract_error(ex)}")

    if not rows:
        st.info("Aun no hay leads.")
    else:
        st.dataframe(pd.DataFrame(rows), use_container_width=True)

        missing_email = [r for r in rows if not r.get("email") and r.get("website")]
        if missing_email and st.button(f"Enriquecer emails desde web ({len(missing_email)} leads)"):
            try:
                with st.spinner("Enriqueciendo emails..."):
                    data = _safe_post(backend_url, "/leads/enrich-emails", {})
                st.success(f"Emails enriquecidos: {data.get('enriched', 0)}")
            except Exception as ex:
                st.error(f"Error en enriquecimiento: {_extract_error(ex)}")

with tab3:
    st.subheader("Campana de emails")
    default_template = _get_default_template(backend_url)

    asunto = st.text_input("Asunto", value="Propuesta para {{ nombre }}")
    remitente = st.text_input("Nombre remitente", value="Equipo Comercial")
    firma = st.text_input("Firma", value="Tu Empresa | +34 XXX XXX XXX")
    propuesta_valor = st.text_input("Propuesta de valor", value="captacion de pacientes y optimizacion de campanas")
    template_text = st.text_area("Plantilla", value=default_template, height=220)

    only_pending = st.checkbox("Solo leads pendientes", value=True)

    try:
        candidatos = _safe_get(backend_url, "/leads", params={"only_pending": only_pending, "require_email": True})
    except Exception:
        candidatos = []

    st.write(f"Leads listos para enviar: {len(candidatos)}")

    if st.button("Enviar campana", type="primary"):
        payload = {
            "asunto": asunto,
            "remitente": remitente,
            "firma": firma,
            "propuesta_valor": propuesta_valor,
            "template_text": template_text,
            "only_pending": only_pending,
        }
        try:
            with st.spinner("Enviando campana..."):
                data = _safe_post(backend_url, "/campaign/send", payload)
            st.success(f"Envios OK: {data.get('sent', 0)} | Errores: {data.get('errors', 0)}")
        except Exception as ex:
            st.error(f"Error enviando campana: {_extract_error(ex)}")

from urllib.parse import urlencode

import requests

from src.core.config import REQUEST_TIMEOUT, USER_AGENT

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _build_address(tags: dict) -> str:
    parts = [
        tags.get("addr:street", ""),
        tags.get("addr:housenumber", ""),
        tags.get("addr:postcode", ""),
        tags.get("addr:city", ""),
    ]
    return " ".join([p for p in parts if p]).strip()


def _pick(*values: str) -> str:
    for value in values:
        if value:
            return value.strip()
    return ""


def search_openstreetmap_farmacias(zona_o_cp: str) -> list[dict]:
    query = (zona_o_cp or "").strip()
    if not query:
        return []

    headers = {"User-Agent": USER_AGENT}

    try:
        geo_params = {
            "q": query,
            "format": "jsonv2",
            "limit": 1,
        }
        geo_resp = requests.get(
            f"{NOMINATIM_URL}?{urlencode(geo_params)}",
            headers=headers,
            timeout=REQUEST_TIMEOUT,
        )
        geo_resp.raise_for_status()
        geo_data = geo_resp.json()
    except Exception:
        return []

    if not geo_data:
        return []

    bbox = geo_data[0].get("boundingbox", [])
    if len(bbox) != 4:
        return []

    south = float(bbox[0])
    north = float(bbox[1])
    west = float(bbox[2])
    east = float(bbox[3])

    overpass_query = f"""
    [out:json][timeout:25];
    (
      node[\"amenity\"=\"pharmacy\"]({south},{west},{north},{east});
      way[\"amenity\"=\"pharmacy\"]({south},{west},{north},{east});
      relation[\"amenity\"=\"pharmacy\"]({south},{west},{north},{east});
    );
    out center tags;
    """

    data = {}
    for overpass_url in OVERPASS_URLS:
        try:
            overpass_resp = requests.post(
                overpass_url,
                data=overpass_query,
                headers=headers,
                timeout=max(REQUEST_TIMEOUT, 30),
            )
            overpass_resp.raise_for_status()
            data = overpass_resp.json()
            if data.get("elements"):
                break
        except Exception:
            continue

    if not data:
        return []

    leads = []
    for element in data.get("elements", []):
        tags = element.get("tags", {})
        nombre = tags.get("name", "").strip()
        if not nombre:
            continue

        direccion = _build_address(tags)
        telefono = _pick(tags.get("contact:phone", ""), tags.get("phone", ""))
        website = _pick(tags.get("contact:website", ""), tags.get("website", ""))
        email = _pick(tags.get("contact:email", ""), tags.get("email", ""))

        leads.append(
            {
                "nombre": nombre,
                "direccion": direccion,
                "telefono": telefono,
                "website": website,
                "zona": query,
                "codigo_postal": "",
                "email": email,
                "fuente": "openstreetmap",
            }
        )

    return leads

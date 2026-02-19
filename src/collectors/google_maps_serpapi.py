import requests

from src.config import REQUEST_TIMEOUT, SERPAPI_KEY


def search_google_maps_farmacias(query: str, location: str = "") -> list[dict]:
    if not SERPAPI_KEY:
        return []

    params = {
        "engine": "google_maps",
        "q": query,
        "type": "search",
        "api_key": SERPAPI_KEY,
    }
    if location:
        params["ll"] = location

    try:
        resp = requests.get("https://serpapi.com/search.json", params=params, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except Exception:
        return []

    data = resp.json()
    results = data.get("local_results", [])

    leads = []
    for item in results:
        leads.append(
            {
                "nombre": item.get("title", "").strip(),
                "direccion": item.get("address", "").strip(),
                "telefono": item.get("phone", "").strip(),
                "website": item.get("website", "").strip(),
                "zona": "",
                "codigo_postal": "",
                "email": "",
                "fuente": "google_maps",
            }
        )
    return [l for l in leads if l["nombre"]]

from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

from src.core.config import REQUEST_TIMEOUT, USER_AGENT


# Basado en la estructura pública de resultados de paginasamarillas.es
# Puede requerir ajustes si el HTML cambia.
def search_paginas_amarillas_farmacias(zona_o_cp: str) -> list[dict]:
    query = quote_plus(f"farmacia {zona_o_cp}")
    url = f"https://www.paginasamarillas.es/search/farmacia/all-ma/{query}/all-is/all-ci/all-ba/all-pu/all-nc/1"
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except Exception:
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    cards = soup.select("article")

    leads = []
    for card in cards:
        name_el = card.select_one("h2")
        address_el = card.select_one("address")
        phone_el = card.select_one(".js-phone")
        website_el = card.select_one("a[href*='http']")

        nombre = name_el.get_text(" ", strip=True) if name_el else ""
        direccion = address_el.get_text(" ", strip=True) if address_el else ""
        telefono = phone_el.get_text(" ", strip=True) if phone_el else ""
        website = website_el.get("href", "").strip() if website_el else ""

        if not nombre:
            continue

        leads.append(
            {
                "nombre": nombre,
                "direccion": direccion,
                "telefono": telefono,
                "website": website,
                "zona": zona_o_cp,
                "codigo_postal": "",
                "email": "",
                "fuente": "paginas_amarillas",
            }
        )

    return leads

import re
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

from src.config import REQUEST_TIMEOUT, USER_AGENT

EMAIL_REGEX = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")


def _normalize_url(url: str) -> str:
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        return f"https://{url}"
    return url


def _valid_email(email: str) -> bool:
    lowered = email.lower()
    blocked = {"example.com", "test.com"}
    domain = lowered.split("@")[-1] if "@" in lowered else ""
    return bool(email and domain and domain not in blocked)


def find_email_from_website(website_url: str) -> str:
    if not website_url:
        return ""

    base_url = _normalize_url(website_url)
    headers = {"User-Agent": USER_AGENT}

    try:
        resp = requests.get(base_url, headers=headers, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
    except Exception:
        return ""

    soup = BeautifulSoup(resp.text, "html.parser")
    candidates = set(EMAIL_REGEX.findall(resp.text))

    contact_keywords = ("contact", "contacto", "legal", "aviso", "about")
    base_domain = urlparse(base_url).netloc

    for a in soup.select("a[href]"):
        href = a.get("href", "")
        if href.startswith("mailto:"):
            candidates.add(href.replace("mailto:", "").strip())
            continue

        if not any(k in href.lower() for k in contact_keywords):
            continue

        candidate_url = urljoin(base_url, href)
        if urlparse(candidate_url).netloc != base_domain:
            continue

        try:
            page = requests.get(candidate_url, headers=headers, timeout=REQUEST_TIMEOUT)
            if page.ok:
                candidates.update(EMAIL_REGEX.findall(page.text))
        except Exception:
            continue

    valid = [e for e in candidates if _valid_email(e)]
    if not valid:
        return ""

    valid.sort(key=lambda e: ("info@" not in e.lower(), len(e)))
    return valid[0]

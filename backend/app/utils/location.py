"""
Turns a plain-language place (village, area, city, country) into map
coordinates, so nobody has to know their latitude / longitude.

Uses OpenStreetMap's free Nominatim service. If it can't be reached
(no internet, rate limit...) every function returns None and the caller
decides what to do -- nothing here ever raises.
"""
from typing import Optional, Tuple

import requests

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
_HEADERS = {"User-Agent": "LifeFlow-BloodNetwork/2.1 (contact: admin@lifeflow.com)"}


def build_address_label(village=None, area=None, city=None, state=None, country=None) -> str:
    return ", ".join(p.strip() for p in (village, area, city, state, country) if p and str(p).strip())


def geocode_place(village=None, area=None, city=None, state=None, country=None) -> Optional[Tuple[float, float]]:
    """Tries the most specific address first, then falls back to broader ones."""
    attempts = [
        (village, area, city, state, country),
        (area, city, state, country),
        (village, city, state, country),
        (city, state, country),
        (city, country),
    ]
    seen = set()
    for parts in attempts:
        query = ", ".join(p.strip() for p in parts if p and str(p).strip())
        if not query or query in seen:
            continue
        seen.add(query)
        try:
            response = requests.get(
                NOMINATIM_URL,
                params={"q": query, "format": "json", "limit": 1},
                headers=_HEADERS,
                timeout=6,
            )
            if response.status_code == 200 and response.json():
                hit = response.json()[0]
                return float(hit["lat"]), float(hit["lon"])
        except Exception:  # noqa: BLE001
            return None
    return None


# ---- Offline fallback -------------------------------------------------------------------------
# If the internet lookup is not available we still need a position so that "nearest donor" works.
# These are rough centres of the Pakistani provinces and some big cities. The same city always gets
# the same point, and different areas of one city sit a few kilometres apart.
_PROVINCES = {
    "sindh": (25.9, 68.5), "punjab": (31.2, 72.7), "khyber pakhtunkhwa": (34.3, 71.9), "kpk": (34.3, 71.9),
    "balochistan": (28.5, 65.1), "gilgit-baltistan": (35.9, 74.3), "gilgit baltistan": (35.9, 74.3),
    "azad kashmir": (33.9, 73.8), "azad jammu and kashmir": (33.9, 73.8), "islamabad": (33.68, 73.05),
    "islamabad capital territory": (33.68, 73.05), "ict": (33.68, 73.05),
}
_CITIES = {
    "karachi": (24.86, 67.01), "hyderabad": (25.39, 68.37), "sukkur": (27.70, 68.86), "larkana": (27.56, 68.21),
    "nawabshah": (26.25, 68.41), "mirpurkhas": (25.52, 69.01), "jacobabad": (28.28, 68.44), "khairpur": (27.53, 68.76),
    "shikarpur": (27.96, 68.64), "lahore": (31.55, 74.34), "faisalabad": (31.42, 73.08), "rawalpindi": (33.60, 73.04),
    "multan": (30.20, 71.47), "gujranwala": (32.16, 74.19), "sialkot": (32.49, 74.53), "bahawalpur": (29.40, 71.68),
    "islamabad": (33.68, 73.05), "peshawar": (34.01, 71.58), "mardan": (34.20, 72.04), "abbottabad": (34.15, 73.21),
    "quetta": (30.18, 66.99), "gwadar": (25.12, 62.33), "muzaffarabad": (34.37, 73.47), "gilgit": (35.92, 74.31),
}


def _nudge(text: str, spread: float) -> float:
    """A small, always-the-same shift (about +/- spread degrees) taken from the words."""
    total = sum(ord(c) * (i + 1) for i, c in enumerate((text or "").strip().lower()))
    return ((total % 2001) / 1000.0 - 1.0) * spread


def approximate_place(village=None, area=None, city=None, state=None, country=None) -> Tuple[float, float]:
    """Always returns a position, even offline, from the words alone."""
    city_key = (city or "").strip().lower()
    state_key = (state or "").strip().lower()
    base = _CITIES.get(city_key) or _PROVINCES.get(state_key) or _PROVINCES.get(city_key) or (30.4, 69.3)
    spread_city = 0.0 if city_key in _CITIES else 0.6
    lat = base[0] + _nudge(city_key, spread_city) + _nudge(area, 0.05) + _nudge(village, 0.01)
    lon = base[1] + _nudge(city_key[::-1], spread_city) + _nudge((area or "")[::-1], 0.05) + _nudge((village or "")[::-1], 0.01)
    return round(lat, 5), round(lon, 5)


def resolve_place(village=None, area=None, city=None, state=None, country=None) -> Tuple[float, float]:
    """Internet lookup first, the offline guess if that does not work. Never fails."""
    return geocode_place(village, area, city, state, country) or approximate_place(village, area, city, state, country)

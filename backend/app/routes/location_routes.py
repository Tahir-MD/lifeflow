from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.utils.location import resolve_place

router = APIRouter(prefix="/location", tags=["Location"])


class PlaceIn(BaseModel):
    country: str
    state: Optional[str] = None
    city: str
    area: Optional[str] = None
    village: Optional[str] = None


@router.post("/resolve")
def resolve(place: PlaceIn):
    """Turns country / province / city / area into a position the matching code can use."""
    latitude, longitude = resolve_place(place.village, place.area, place.city, place.state, place.country)
    return {"latitude": latitude, "longitude": longitude}

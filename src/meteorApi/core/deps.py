from contextlib import asynccontextmanager
import httpx
from fastapi import Request, HTTPException
from .settings import settings
from ..clients.meteomatics_client import MeteomaticsClient
from ..services.meteo_service import MeteoService

@asynccontextmanager
async def lifespan(app):
    if not settings.MM_USER or not settings.MM_PASS:
        raise RuntimeError("Faltan MM_USER/MM_PASS en .env")
    async with httpx.AsyncClient(
        base_url="https://api.meteomatics.com",
        auth=(settings.MM_USER, settings.MM_PASS),
        timeout=60,
        headers={"User-Agent": "meteo-api/1.0"}
    ) as client:
        app.state.meteo_service = MeteoService(MeteomaticsClient(client))
        yield

def get_meteo_service(request: Request) -> MeteoService:
    svc = getattr(request.app.state, "meteo_service", None)
    if svc is None:
        raise HTTPException(500, "Servicio Meteo no inicializado")
    return svc

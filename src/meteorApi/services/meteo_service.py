from datetime import datetime
from fastapi import HTTPException
import httpx
from ..clients.meteomatics_client import MeteomaticsClient

def _iso(s: str) -> None:
    try:
        datetime.fromisoformat(s.replace("Z", "+00:00"))
    except Exception as e:
        raise HTTPException(400, f"Fecha/hora inválida: {s}") from e

def _check_fmt(fmt: str) -> None:
    if fmt not in {"json","csv","png","webp","geotiff","netcdf"}:
        raise HTTPException(400, f"fmt no soportado: {fmt}")

class MeteoService:
    def __init__(self, mm: MeteomaticsClient):
        self.mm = mm

    async def timeseries(self, *, lat: float, lon: float, start: str, end: str,
                         step: str = "PT1H", params: str = "t_2m:C", fmt: str = "json") -> tuple[bytes, str]:
        _iso(start); _iso(end); _check_fmt(fmt)
        path = f"/{start}--{end}:{step}/{params}/{lat},{lon}/{fmt}"
        try:
            r = await self.mm.get_raw(path)
        except httpx.RequestError as e:
            raise HTTPException(502, f"Error conectando a Meteomatics: {e}") from e
        if r.status_code >= 400:
            # Propaga el mensaje original para diagnóstico
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.content, r.headers.get("content-type", "application/octet-stream")

    async def grid(self, *, lat1: float, lon1: float, lat2: float, lon2: float,
                   res_lat: float = 0.05, res_lon: float = 0.05,
                   valid_time: str = "now", params: str = "t_2m:C", fmt: str = "png") -> tuple[bytes, str]:
        if valid_time != "now":
            _iso(valid_time)
        _check_fmt(fmt)
        bbox = f"{lat1},{lon1}_{lat2},{lon2}:{res_lat},{res_lon}"
        path = f"/{valid_time}/{params}/{bbox}/{fmt}"
        try:
            r = await self.mm.get_raw(path)
        except httpx.RequestError as e:
            raise HTTPException(502, f"Error conectando a Meteomatics: {e}") from e
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text)
        return r.content, r.headers.get("content-type", "application/octet-stream")

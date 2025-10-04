from fastapi import APIRouter, Depends, Response, Query
from ..core.deps import get_meteo_service
from ..schemas.meteo import TimeSeriesQuery  # si lo usas
from ..services.meteo_service import MeteoService

router = APIRouter(prefix="/api/meteo", tags=["meteo"])


@router.get("/timeseries")
async def timeseries(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    start: str = Query(...),
    end: str = Query(...),
    step: str = "PT1H",
    params: str = "t_2m:C",
    fmt: str = "json",
    svc: MeteoService = Depends(get_meteo_service),
):
    content, ctype = await svc.timeseries(
        lat=lat, lon=lon, start=start, end=end, step=step, params=params, fmt=fmt
    )
    return Response(content=content, media_type=ctype)

@router.get("/grid")
async def grid(
    lat1: float = Query(..., ge=-90, le=90),
    lon1: float = Query(..., ge=-180, le=180),
    lat2: float = Query(..., ge=-90, le=90),
    lon2: float = Query(..., ge=-180, le=180),
    res_lat: float = Query(0.05, gt=0),
    res_lon: float = Query(0.05, gt=0),
    valid_time: str = "now",
    params: str = "t_2m:C",
    fmt: str = "png",
    svc: MeteoService = Depends(get_meteo_service),
):
    content, ctype = await svc.grid(
        lat1=lat1, lon1=lon1, lat2=lat2, lon2=lon2,
        res_lat=res_lat, res_lon=res_lon,
        valid_time=valid_time, params=params, fmt=fmt
    )
    return Response(content=content, media_type=ctype)
from pydantic import BaseModel, Field
from typing import Literal

Fmt = Literal["json","csv","png","webp","geotiff","netcdf"]

class TimeSeriesQuery(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)
    start: str
    end: str
    step: str = "PT1H"
    params: str = "t_2m:C"
    fmt: Fmt = "json"

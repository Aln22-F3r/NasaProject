from fastapi import APIRouter, HTTPException

router = APIRouter(
    prefix="/meteor",
    tags=["Meteorología"],
    responses={404: {"description": "Not found"}},
)
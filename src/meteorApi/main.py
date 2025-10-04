# src/meteorApi/main.py
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from .core import settings, deps
from .controllers import meteo_controller

def create_app() -> FastAPI:
    app = FastAPI(title="Meteo API", version="1.0.0", lifespan=deps.lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Inyección del servicio desde app.state
    def get_svc(req: Request):
        return deps.get_meteo_service_from_app(req.app)
    meteo_controller.router.dependencies = [Depends(get_svc)]

    app.include_router(meteo_controller.router)
    return app

app = create_app()

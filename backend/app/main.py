from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import edit, health, intake, me, navigator, reference, taxonomy


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    app.state.settings = settings
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="Sovaia Architecture-Modeler API",
        version="0.1.0",
        description="L3-Service für Architektur-Modellierung, IST/SOLL und Storyteller (ADR-082).",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router, tags=["health"])
    app.include_router(reference.router, prefix="/v1/reference", tags=["reference"])
    app.include_router(taxonomy.router, prefix="/v1/taxonomy", tags=["taxonomy"])
    app.include_router(navigator.router, prefix="/v1/navigator", tags=["navigator"])
    app.include_router(edit.router, prefix="/v1/edit", tags=["edit"])
    app.include_router(intake.router, prefix="/v1/intake", tags=["intake"])
    app.include_router(me.router, prefix="/v1/me", tags=["me"])

    return app


app = create_app()

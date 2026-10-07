"""FastAPI application factory."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.core.middleware import REQUEST_ID_HEADER, RequestContextMiddleware
from app.db.session import engine

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    logger.info(
        "application_startup",
        extra={"app_version": __version__, "environment": settings.environment},
    )
    # Ensure database schema is created (skip in testing to avoid dummy connection timeouts)
    if settings.environment != "testing":
        try:
            from app.db.init_db import init_db
            init_db()
            logger.info("database_schema_ready")
        except Exception as e:
            logger.warning(f"Could not auto-create db schema: {e}")

        # Warm up baseline models
        try:
            from src.models.registry import load_production_model
            load_production_model()
            logger.info("production_models_ready")
        except Exception as e:
            logger.warning(f"Could not warm up model: {e}")


    yield
    engine.dispose()
    logger.info("application_shutdown")



def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(level=settings.log_level, json_logs=settings.log_json)

    app = FastAPI(title=settings.app_name, version=__version__, lifespan=lifespan)
    register_exception_handlers(app)

    # Middleware added last is outermost. CORS wraps the request-context middleware
    # so even error responses carry CORS headers.
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
    )

    app.include_router(api_router)
    return app


app = create_app()

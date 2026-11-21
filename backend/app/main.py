
from fastapi import Depends, FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from starlette.exceptions import HTTPException as StarletteHTTPException

from .db import get_db
from .deps import ApiError
from .routers import auth, grades, requests, schedule


app = FastAPI(
    title="Деканат Next API",
    docs_url="/api/docs",
)

app.include_router(auth.router)
app.include_router(schedule.router)
app.include_router(grades.router)
app.include_router(requests.router)


@app.exception_handler(ApiError)
async def api_error(_: Request, exc: ApiError):
    return JSONResponse(
        {"error": exc.code, **exc.extra},
        status_code=exc.status,
    )


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    return JSONResponse(
        {"error": "invalid_input"},
        status_code=400,
    )


@app.exception_handler(StarletteHTTPException)
async def http_error(_: Request, exc: StarletteHTTPException):
    code = "not_found" if exc.status_code == 404 else "error"
    return JSONResponse(
        {"error": code},
        status_code=exc.status_code,
    )


@app.get("/api/health")
def health():
    return {
        "ok": True,
        "service": "dekanat-next",
    }


@app.get("/api/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        version = db.execute(
            text("select version()")
        ).scalar_one()
    except SQLAlchemyError:
        return JSONResponse(
            {"ok": False},
            status_code=503,
        )

    return {
        "ok": True,
        "version": version.split(",")[0],
    }

from fastapi import Depends, FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .db import get_db

app = FastAPI(title="Деканат Next API", docs_url="/api/docs")


@app.get("/api/health")
def health():
    return {"ok": True, "service": "dekanat-next"}


@app.get("/api/health/db")
def health_db(db: Session = Depends(get_db)):
    try:
        version = db.execute(text("select version()")).scalar_one()
    except SQLAlchemyError:
        return JSONResponse({"ok": False}, status_code=503)
    return {"ok": True, "version": version.split(",")[0]}

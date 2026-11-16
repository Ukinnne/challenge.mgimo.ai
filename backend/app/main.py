from fastapi import FastAPI

app = FastAPI(title="Деканат Next API", docs_url="/api/docs")


@app.get("/api/health")
def health():
    return {"ok": True, "service": "dekanat-next"}

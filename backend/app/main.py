from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, org, assets

app = FastAPI(
    title="AssetFlow API",
    description="Enterprise Asset & Resource Management System — Odoo Hackathon 2026",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten before final submission if time allows
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(auth.router)
app.include_router(org.router)
app.include_router(assets.router)

# Remaining routers are added incrementally through the day as each module is built.
# from app.routers import org, assets, allocations, bookings, maintenance, audits
# app.include_router(org.router)
# app.include_router(assets.router)
# app.include_router(allocations.router)
# app.include_router(bookings.router)
# app.include_router(maintenance.router)
# app.include_router(audits.router)

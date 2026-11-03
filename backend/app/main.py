from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import CORS_ORIGINS
from .database import Base, engine
from .ml.cost_model import get_model
from .ml.detector import get_detector
from .routers import ai, auth, subscriptions, billing


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    get_detector(); get_model()  # train once at start-up (takes ~2 s)
    yield


app = FastAPI(title="Finora API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router)
app.include_router(subscriptions.router)
app.include_router(ai.router)
app.include_router(billing.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}

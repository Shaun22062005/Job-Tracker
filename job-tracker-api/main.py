import os
import secrets
from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal, get_db
from auth_utils import hash_password, verify_password, create_access_token, decode_access_token
from datetime import date
from typing import List
import models
import schemas

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")

# Rate Limiter setup to defend auth endpoints against brute force
limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Database table creation
Base.metadata.create_all(bind=engine)

def run_auth_provider_backfill(db: Session) -> None:
    """Migrate legacy unmigrated users: detect old formula Google accounts and neutralize them."""
    unmigrated = db.query(models.User).all()
    for u in unmigrated:
        if verify_password(f"google_oauth2_{u.email}_secret", u.hashed_password):
            u.auth_provider = "google"
            u.hashed_password = hash_password(secrets.token_urlsafe(32))
        elif u.auth_provider is None:
            u.auth_provider = "local"
    if unmigrated:
        db.commit()

# Auto-migrate schema for missing columns on Supabase PostgreSQL and local database
try:
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_starred BOOLEAN DEFAULT FALSE"))
        conn.execute(text("ALTER TABLE applications ADD COLUMN IF NOT EXISTS company_slot VARCHAR"))
        conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR"))
except Exception:
    with engine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE applications ADD COLUMN is_starred BOOLEAN DEFAULT 0"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE applications ADD COLUMN company_slot VARCHAR"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR"))
            conn.commit()
        except Exception:
            pass

# Gated single-run backfill for legacy Google accounts
try:
    with SessionLocal() as db_session:
        has_unmigrated = db_session.execute(text("SELECT 1 FROM users WHERE auth_provider IS NULL LIMIT 1")).first()
        if has_unmigrated:
            run_auth_provider_backfill(db_session)
except Exception:
    pass

# Dynamic CORS origin validation for production frontend deployment
allowed_origins = [
    "https://job-tracker-two-rosy.vercel.app",
    "http://localhost:4200",
]

frontend_env = os.getenv("FRONTEND_URL")
if frontend_env:
    clean_url = frontend_env.strip().rstrip("/")
    if clean_url not in allowed_origins:
        allowed_origins.append(clean_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://job-tracker-two-rosy(-[a-z0-9]+)?\.vercel\.app|http://localhost:\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id: int = payload.get("user_id")

    if user_id is None:
        raise HTTPException(status_code=401, detail="Token payload is invalid")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user 

@app.get("/")
def read_root():
    return {"message": "Job Tracker API is running"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"
        raise HTTPException(status_code=503, detail="Database unavailable")

    return {
        "status": "healthy",
        "database": db_status
    }

@app.post("/applications", response_model=schemas.ApplicationResponse)
def create_application(
    application: schemas.ApplicationCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_application = models.Application(
        user_id = current_user.id,
        company_name = application.company_name,
        role = application.role,
        status = application.status,
        company_slot = application.company_slot,
        applied_date = application.applied_date,
        notes = application.notes,
        job_url = application.job_url,
        interview_date = application.interview_date,
        is_starred = application.is_starred or False,
    )

    db.add(new_application)
    db.commit()
    db.refresh(new_application)

    return new_application

@app.get("/applications", response_model=List[schemas.ApplicationResponse])
def get_application(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    applications = db.query(models.Application).filter(models.Application.user_id == current_user.id).all()
    return applications

@app.put("/applications/{application_id}", response_model=schemas.ApplicationResponse)
def update_application(
    application_id: int, 
    application: schemas.ApplicationCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_application = db.query(models.Application).filter(models.Application.id == application_id).first()
    
    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if db_application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this application")

    db_application.company_name = application.company_name
    db_application.role = application.role
    db_application.status = application.status
    db_application.company_slot = application.company_slot
    db_application.applied_date = application.applied_date
    db_application.notes = application.notes
    db_application.job_url = application.job_url
    db_application.interview_date = application.interview_date
    if application.is_starred is not None:
        db_application.is_starred = application.is_starred

    db.commit()
    db.refresh(db_application)

    return db_application

@app.patch("/applications/{application_id}/star", response_model=schemas.ApplicationResponse)
def toggle_star_application(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_application = db.query(models.Application).filter(models.Application.id == application_id).first()
    
    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if db_application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this application")

    db_application.is_starred = not (db_application.is_starred or False)
    db.commit()
    db.refresh(db_application)

    return db_application

@app.delete("/applications/{application_id}")
def delete_application(
    application_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    db_application = db.query(models.Application).filter(models.Application.id == application_id).first()
    
    if db_application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    if db_application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this application")

    db.delete(db_application)
    db.commit()

    return {"message": "Application deleted successfully"}

@app.post("/auth/register/", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()

    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email = user.email,
        hashed_password = hash_password(user.plain_password),
        auth_provider = "local",
        created_at = date.today()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login")
@limiter.limit("5/minute")
def user_login(request: Request, user: schemas.UserLogin, db: Session = Depends(get_db)):
    current_user = db.query(models.User).filter(models.User.email == user.email).first()

    if current_user is None:
        raise HTTPException(status_code = 401, detail = 'Invalid Credentials')
    
    if current_user.auth_provider == "google":
        raise HTTPException(status_code = 400, detail = "This account was registered using Google. Please sign in with Google.")

    if not verify_password(user.plain_password, current_user.hashed_password):
        raise HTTPException(status_code = 401, detail = 'Invalid Credentials')
    
    access_token = create_access_token(data={"user_id": current_user.id})

    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/google")
def google_auth(req: schemas.GoogleLoginRequest, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured on this server")

    token = req.id_token
    try:
        id_info = google_id_token.verify_oauth2_token(token, google_requests.Request(), GOOGLE_CLIENT_ID)
        email = id_info.get("email")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google ID token: {str(e)}")

    if not email:
        raise HTTPException(status_code=400, detail="Google authentication failed to provide email")

    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        user = models.User(
            email=email,
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            auth_provider="google",
            created_at=date.today()
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    access_token = create_access_token(data={"user_id": user.id})
    return {"access_token": access_token, "token_type": "bearer"}
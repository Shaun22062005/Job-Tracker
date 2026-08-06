from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from auth_utils import hash_password, verify_password, create_access_token, decode_access_token
from datetime import date
from typing import List
import models
import schemas

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = payload.get("user_id")
    user = db.query(models.User).filter(models.User.id == user_id).first()

    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user 

@app.get("/")
def read_root():
    return {"message": "Job Tracker API is running"}

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
    new_user = models.User(
        email = user.email,
        hashed_password = hash_password(user.plain_password),
        created_at = date.today()
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/auth/login")
def user_login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    current_user = db.query(models.User).filter(models.User.email == user.email).first()

    if current_user is None:
        raise HTTPException(status_code = 401, detail = 'Invalid Credentials')
    
    if not verify_password(user.plain_password, current_user.hashed_password):
        raise HTTPException(status_code = 401, detail = 'Invalid Credentials')
    
    access_token = create_access_token(data={"user_id": current_user.id})

    return {"access_token": access_token, "token_type": "bearer"}


 
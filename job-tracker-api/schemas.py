from pydantic import BaseModel
from datetime import date
from typing import Optional

class ApplicationCreate(BaseModel):
    company_name: str
    role: str
    status: str
    applied_date: date
    notes: Optional[str] = None
    job_url: Optional[str] = None
    interview_date: Optional[date] = None
    is_starred: Optional[bool] = False

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    role: str
    status: str
    applied_date: date
    notes: Optional[str] = None
    job_url: Optional[str] = None
    interview_date: Optional[date] = None
    is_starred: Optional[bool] = False

    class Config:
        from_attributes = True

class UserCreate(BaseModel):
    email: str
    plain_password: str

class UserResponse(BaseModel):
    id: int
    email: str

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    plain_password: str
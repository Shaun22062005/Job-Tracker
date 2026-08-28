from pydantic import BaseModel, ConfigDict
from datetime import date
from typing import Optional

class ApplicationCreate(BaseModel):
    company_name: str
    role: str
    status: str
    applied_date: date
    company_slot: Optional[str] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    interview_date: Optional[date] = None
    is_starred: Optional[bool] = None

class ApplicationResponse(BaseModel):
    id: int
    user_id: int
    company_name: str
    role: str
    status: str
    applied_date: date
    company_slot: Optional[str] = None
    notes: Optional[str] = None
    job_url: Optional[str] = None
    interview_date: Optional[date] = None
    is_starred: Optional[bool] = False

    model_config = ConfigDict(from_attributes=True)

class UserCreate(BaseModel):
    email: str
    plain_password: str

class UserResponse(BaseModel):
    id: int
    email: str

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: str
    plain_password: str

class GoogleLoginRequest(BaseModel):
    id_token: str
from sqlalchemy import Column, Integer, String, Date, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    auth_provider = Column(String, default="local", nullable=False)
    created_at = Column(Date)

    applications = relationship("Application", back_populates="owner")

class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    company_name = Column(String)
    role = Column(String)
    status = Column(String)
    applied_date = Column(Date)
    company_slot = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    job_url = Column(String, nullable=True)
    interview_date = Column(Date, nullable=True)
    is_starred = Column(Boolean, default=False)

    owner = relationship("User", back_populates="applications")
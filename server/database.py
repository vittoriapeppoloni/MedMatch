from sqlalchemy import create_engine, Column, Integer, String, JSON, DateTime, Float
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from datetime import datetime

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./medmatch.db")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Patient(Base):
    __tablename__ = "patients"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String, unique=True, index=True)
    medical_info = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class ClinicalTrial(Base):
    __tablename__ = "clinical_trials"
    
    id = Column(Integer, primary_key=True, index=True)
    nct_id = Column(String, unique=True, index=True)
    title = Column(String)
    phase = Column(String)
    status = Column(String)
    eligibility_criteria = Column(JSON)

class TrialMatch(Base):
    __tablename__ = "trial_matches"
    
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer)
    trial_id = Column(Integer)
    match_score = Column(Float)
    match_reasons = Column(JSON)
    limiting_factors = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)
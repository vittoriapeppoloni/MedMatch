from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from llama_cpp import Llama
import json
import os
from typing import Dict, List, Optional
from pydantic import BaseModel

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Llama model
MODEL_PATH = os.getenv("LLAMA_MODEL_PATH", "./models/llama-2-13b-chat.gguf")

try:
    llm = Llama(
        model_path=MODEL_PATH,
        n_ctx=4096,
        n_batch=512,
        n_threads=8
    )
    print("Llama model loaded successfully")
except Exception as e:
    print(f"Error loading Llama model: {e}")
    llm = None

class MedicalInfo(BaseModel):
    text: str

@app.post("/api/analyze-medical-text")
async def analyze_medical_text(info: MedicalInfo):
    if not llm:
        raise HTTPException(status_code=500, detail="Llama model not initialized")
    
    # Prompt for medical information extraction
    prompt = f"""
    Extract medical information from this text and format as JSON:
    {info.text}
    
    Format the response as:
    {{
        "diagnosis": {{
            "primaryDiagnosis": "",
            "subtype": "",
            "diagnosisDate": "",
            "stage": ""
        }},
        "treatments": {{
            "pastTreatments": "",
            "currentTreatment": "",
            "plannedTreatment": ""
        }},
        "medicalHistory": {{
            "comorbidities": "",
            "allergies": "",
            "medications": ""
        }},
        "demographics": {{
            "age": "",
            "gender": ""
        }}
    }}
    """
    
    try:
        output = llm(prompt, max_tokens=2000, temperature=0.1)
        response = json.loads(output['choices'][0]['text'])
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

@app.post("/api/match-trials")
async def match_trials(info: MedicalInfo):
    if not llm:
        raise HTTPException(status_code=500, detail="Llama model not initialized")
    
    # First extract medical information
    extracted_info = await analyze_medical_text(info)
    
    # Now match trials using Llama
    match_prompt = f"""
    Given this patient information:
    {json.dumps(extracted_info, indent=2)}
    
    Match the patient to clinical trials and return a JSON response with:
    1. Match score (0-100)
    2. Matching reasons
    3. Limiting factors
    
    Focus on:
    - Cancer type matches
    - Biomarker matches (especially KRAS G12C)
    - Stage compatibility
    - Age requirements
    - Performance status
    
    Format the response as a list of matched trials.
    """
    
    try:
        output = llm(match_prompt, max_tokens=2000, temperature=0.1)
        matches = json.loads(output['choices'][0]['text'])
        return {
            "extractedInfo": extracted_info,
            "matchedTrials": matches
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error matching trials: {str(e)}")

# Mount static files for frontend
app.mount("/", StaticFiles(directory="../dist/public", html=True))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
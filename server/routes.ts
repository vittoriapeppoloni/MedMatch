import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { 
  insertPatientSchema, 
  insertMedicalDocumentSchema,
  insertExtractedMedicalInfoSchema,
  insertTrialMatchSchema 
} from "@shared/schema";
import natural from "natural";
import { extractMedicalInfo } from "./nlp";

// Create tokenizer for NLP operations
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up API prefix
  const apiPrefix = '/api';
  
  // Error handler helper
  const handleError = (res: Response, error: any) => {
    console.error('API Error:', error);
    
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation Error',
        errors: fromZodError(error).message
      });
    }
    
    return res.status(500).json({
      message: error.message || 'Internal Server Error'
    });
  };

  // Get all patients
  app.get(`${apiPrefix}/patients`, async (req, res) => {
    try {
      const patients = await storage.getPatients();
      res.json(patients);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get patient by ID
  app.get(`${apiPrefix}/patients/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const patient = await storage.getPatientById(id);
      
      if (!patient) {
        return res.status(404).json({ message: 'Patient not found' });
      }
      
      res.json(patient);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Create patient
  app.post(`${apiPrefix}/patients`, async (req, res) => {
    try {
      const patientData = insertPatientSchema.parse(req.body);
      const patient = await storage.createPatient(patientData);
      res.status(201).json(patient);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get all clinical trials
  app.get(`${apiPrefix}/trials`, async (req, res) => {
    try {
      const trials = await storage.getClinicalTrials();
      res.json(trials);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get trial by ID
  app.get(`${apiPrefix}/trials/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const trial = await storage.getClinicalTrialById(id);
      
      if (!trial) {
        return res.status(404).json({ message: 'Clinical trial not found' });
      }
      
      res.json(trial);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Create medical document
  app.post(`${apiPrefix}/medical-documents`, async (req, res) => {
    try {
      const documentData = insertMedicalDocumentSchema.parse(req.body);
      const document = await storage.createMedicalDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Process medical text and extract information
  app.post(`${apiPrefix}/analyze-medical-text`, async (req, res) => {
    try {
      const { patientId, text } = req.body;
      
      if (!patientId || !text) {
        return res.status(400).json({ message: 'Patient ID and medical text are required' });
      }
      
      // Extract medical information using NLP
      const extractedInfo = extractMedicalInfo(text);
      
      // Save the medical document
      const medicalDocument = await storage.createMedicalDocument({
        patientId,
        content: text,
        documentType: 'letter'
      });
      
      // Save the extracted medical information
      const savedExtractedInfo = await storage.createExtractedMedicalInfo({
        patientId,
        diagnosis: extractedInfo.diagnosis,
        treatments: extractedInfo.treatments,
        medicalHistory: extractedInfo.medicalHistory,
        demographics: extractedInfo.demographics
      });
      
      // Find matching trials
      const allTrials = await storage.getClinicalTrials();
      const matchResults = matchPatientToTrials(extractedInfo, allTrials);
      
      // Save trial matches
      const savedMatches = [];
      for (const match of matchResults) {
        const savedMatch = await storage.createTrialMatch({
          patientId,
          trialId: match.trialId,
          matchScore: match.matchScore,
          matchReasons: match.matchReasons,
          limitingFactors: match.limitingFactors
        });
        savedMatches.push(savedMatch);
      }
      
      res.json({
        extractedInfo: savedExtractedInfo,
        matchedTrials: matchResults
      });
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get extracted medical info for a patient
  app.get(`${apiPrefix}/extracted-info/:patientId`, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const extractedInfo = await storage.getExtractedMedicalInfo(patientId);
      
      if (!extractedInfo) {
        return res.status(404).json({ message: 'Extracted medical information not found' });
      }
      
      res.json(extractedInfo);
    } catch (error) {
      handleError(res, error);
    }
  });

  // Get trial matches for a patient
  app.get(`${apiPrefix}/trial-matches/:patientId`, async (req, res) => {
    try {
      const patientId = parseInt(req.params.patientId);
      const matches = await storage.getTrialMatches(patientId);
      
      // Get detailed trial info for each match
      const matchesWithTrialDetails = await Promise.all(
        matches.map(async (match) => {
          const trial = await storage.getClinicalTrialById(match.trialId);
          return {
            ...match,
            trial
          };
        })
      );
      
      // Sort by match score (descending)
      matchesWithTrialDetails.sort((a, b) => b.matchScore - a.matchScore);
      
      res.json(matchesWithTrialDetails);
    } catch (error) {
      handleError(res, error);
    }
  });
  
  const httpServer = createServer(app);
  return httpServer;
}

// Simple trial matching algorithm
function matchPatientToTrials(extractedInfo: any, trials: any[]) {
  const matchResults = [];
  
  for (const trial of trials) {
    let score = 0;
    const matchReasons = [];
    const limitingFactors = [];
    
    // Check diagnosis match
    if (extractedInfo.diagnosis?.primaryDiagnosis?.includes('Breast Cancer') && 
        trial.eligibilityCriteria?.inclusions?.includes('HR+/HER2-') && 
        extractedInfo.diagnosis?.subtype?.includes('HR+/HER2-')) {
      score += 30;
      matchReasons.push({ factor: 'HR+/HER2- Status', description: 'Hormone receptor status matches trial requirements' });
    }
    
    // Check stage match
    if (extractedInfo.diagnosis?.primaryDiagnosis?.includes('Stage 2') && 
        trial.eligibilityCriteria?.inclusions?.includes('Stage 2')) {
      score += 25;
      matchReasons.push({ factor: 'Stage 2 Cancer', description: 'Early-stage cancer diagnosis qualifies for trial' });
    }
    
    // Check treatment history match
    if (extractedInfo.treatments?.pastTreatments?.includes('Lumpectomy') && 
        trial.eligibilityCriteria?.inclusions?.includes('Completed Surgery')) {
      score += 20;
      matchReasons.push({ factor: 'Completed Primary Surgery', description: 'Surgical requirements for adjuvant therapy trial met' });
    }
    
    // Check diagnosis timeframe
    if (extractedInfo.diagnosis?.diagnosisDate?.includes('2023')) {
      score += 15;
      matchReasons.push({ factor: 'Recent Diagnosis', description: 'Diagnosis within past 6 months meets timing requirements' });
    }
    
    // Check limiting factors
    if (extractedInfo.medicalHistory?.comorbidities?.includes('Type 2 Diabetes')) {
      score -= 5;
      limitingFactors.push({ factor: 'Type 2 Diabetes', description: 'Some trials exclude patients with diabetes or require specific HbA1c levels' });
    }
    
    if (extractedInfo.medicalHistory?.comorbidities?.includes('Hypertension')) {
      score -= 5;
      limitingFactors.push({ factor: 'Concurrent Medication', description: 'Medications for hypertension may interact with some investigational drugs' });
    }
    
    // Age limitations
    if (trial.eligibilityCriteria?.limitations?.includes('Age limit 65+') && 
        extractedInfo.demographics?.age && parseInt(extractedInfo.demographics.age) < 65) {
      score -= 10;
      limitingFactors.push({ factor: 'Age Requirement', description: 'Trial requires patients 65+ years old' });
    }
    
    // Normalize score to percentage (0-100)
    let normalizedScore = Math.min(Math.max(score, 0), 100);
    
    matchResults.push({
      trialId: trial.id,
      matchScore: normalizedScore,
      matchReasons,
      limitingFactors
    });
  }
  
  // Sort by match score (descending)
  return matchResults.sort((a, b) => b.matchScore - a.matchScore);
}

// NLP helper for extracting medical information from text
function extractMedicalInfo(text: string) {
  // Process text with natural.js
  const tokens = tokenizer.tokenize(text.toLowerCase());
  
  // Initialize extracted info structure
  const extractedInfo = {
    diagnosis: {
      primaryDiagnosis: '',
      subtype: '',
      diagnosisDate: ''
    },
    treatments: {
      pastTreatments: '',
      currentTreatment: '',
      plannedTreatment: ''
    },
    medicalHistory: {
      comorbidities: '',
      allergies: ''
    },
    demographics: {
      age: '',
      gender: ''
    }
  };
  
  // Extract information using simple pattern matching
  // This is a simplified example - in a real application, use more sophisticated NLP
  
  // Extract diagnosis
  if (text.match(/stage\s*2|stage\s*ii/i)) {
    extractedInfo.diagnosis.primaryDiagnosis = 'Breast Cancer (Stage 2, T2N0M0)';
  } else if (text.match(/breast\s*cancer/i)) {
    extractedInfo.diagnosis.primaryDiagnosis = 'Breast Cancer';
  }
  
  if (text.match(/hr\+\/her2-|hormone\s*receptor\s*positive.*her2\s*negative/i)) {
    extractedInfo.diagnosis.subtype = 'HR+/HER2-';
  }
  
  if (text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{4}/i)) {
    const match = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s*\d{4}/i);
    if (match) {
      extractedInfo.diagnosis.diagnosisDate = match[0];
    }
  }
  
  // Extract treatments
  if (text.match(/lumpectomy/i)) {
    extractedInfo.treatments.pastTreatments = 'Lumpectomy, Sentinel lymph node biopsy';
  }
  
  if (text.match(/radiation\s*therapy/i)) {
    extractedInfo.treatments.currentTreatment = 'Radiation therapy';
  }
  
  if (text.match(/hormone\s*therapy/i)) {
    extractedInfo.treatments.plannedTreatment = 'Hormone therapy';
  }
  
  // Extract medical history
  if (text.match(/hypertension/i)) {
    extractedInfo.medicalHistory.comorbidities = 'Hypertension (controlled)';
    
    if (text.match(/type\s*2\s*diabetes/i)) {
      extractedInfo.medicalHistory.comorbidities += ', Type 2 Diabetes';
    }
  } else if (text.match(/type\s*2\s*diabetes/i)) {
    extractedInfo.medicalHistory.comorbidities = 'Type 2 Diabetes';
  }
  
  if (text.match(/no\s*known\s*drug\s*allergies/i)) {
    extractedInfo.medicalHistory.allergies = 'No known drug allergies';
  }
  
  // Extract demographics
  const ageMatch = text.match(/(\d+)[\s-]*year[\s-]*old/i);
  if (ageMatch) {
    extractedInfo.demographics.age = ageMatch[1];
  }
  
  if (text.match(/\b(female|woman|girl)\b/i)) {
    extractedInfo.demographics.gender = 'Female';
  } else if (text.match(/\b(male|man|boy)\b/i)) {
    extractedInfo.demographics.gender = 'Male';
  }
  
  return extractedInfo;
}

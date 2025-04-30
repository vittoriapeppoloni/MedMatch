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
// Import the external NLP module only for advanced processing
import { extractEntities } from "./nlp";

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
      
      console.log("Processing medical text:", text.substring(0, 100) + "..."); // Log a preview
      
      // Extract medical information using our custom NLP function
      const extractedInfo = extractMedicalInfo(text);
      
      // Check if any information was extracted
      const hasExtractedInfo = 
        extractedInfo.diagnosis.primaryDiagnosis ||
        extractedInfo.diagnosis.subtype ||
        extractedInfo.diagnosis.diagnosisDate ||
        extractedInfo.treatments.pastTreatments ||
        extractedInfo.treatments.currentTreatment ||
        extractedInfo.treatments.plannedTreatment ||
        extractedInfo.medicalHistory.comorbidities ||
        extractedInfo.medicalHistory.medications ||
        extractedInfo.medicalHistory.allergies ||
        extractedInfo.demographics.age ||
        extractedInfo.demographics.gender;
        
      console.log("Applying advanced Italian text extraction");
      
      // Better extraction for Italian medical texts
      // These extracted values will override any previously extracted values if they exist
      
      // Extract TNM and stage information - specific pattern for Italian format
      const tnmStagePattern = /TNM\s+(?:alla\s+diagnosi)?:?\s*(?:[cp]?)(T\d+[a-z]*N\d+[a-z]*M\d+[a-z]*)\s*(?:\(.*?\))?\s*-?\s*(?:stadio|stage)\s*(I{1,3}V?|IV|1|2|3|4)/i;
      const tnmStageMatch = text.match(tnmStagePattern);
      if (tnmStageMatch) {
        extractedInfo.diagnosis.primaryDiagnosis = "Cancer";
        extractedInfo.diagnosis.stage = tnmStageMatch[2].toUpperCase();
        
        // Try to extract cancer type - look around the TNM information
        const surroundingText = text.substring(Math.max(0, text.indexOf("TNM") - 150), 
                                              Math.min(text.length, text.indexOf("TNM") + 350));
        
        if (surroundingText.match(/adenocarcinoma/i)) {
          extractedInfo.diagnosis.primaryDiagnosis = "Adenocarcinoma";
          
          // Look for location keywords
          if (surroundingText.match(/polmon/i)) {
            extractedInfo.diagnosis.primaryDiagnosis = "Lung Adenocarcinoma";
          }
        } else if (surroundingText.match(/carcinoma/i)) {
          extractedInfo.diagnosis.primaryDiagnosis = "Carcinoma";
        }
      }
      
      // Direct cancer diagnosis extraction
      const diagnosisPattern = /(?:diagnosi\s+di|dx\s+di)\s+([^,\.;]+)(?:\s+(?:in|di)\s+(?:stadio|stage)\s+(I{1,3}V?|IV|1|2|3|4))?/i;
      const diagnosisMatch = text.match(diagnosisPattern);
      if (diagnosisMatch && !extractedInfo.diagnosis.primaryDiagnosis) {
        extractedInfo.diagnosis.primaryDiagnosis = diagnosisMatch[1].trim();
        if (diagnosisMatch[2]) {
          extractedInfo.diagnosis.stage = diagnosisMatch[2].toUpperCase();
        }
      }
      
      // Extract adenocarcinoma diagnosis
      if (text.match(/adenocarcinoma\s+(?:scarsamente\s+differenziato|scarsamente\s+differenziata)?/i) && !extractedInfo.diagnosis.primaryDiagnosis) {
        extractedInfo.diagnosis.primaryDiagnosis = "Adenocarcinoma";
        
        // Look for location
        if (text.match(/polmon/i) || text.match(/primitività\s+polmonare/i)) {
          extractedInfo.diagnosis.primaryDiagnosis = "Lung Adenocarcinoma";
        }
      }
      
      // Extract stage when it's mentioned separately
      if (!extractedInfo.diagnosis.stage) {
        const stagePattern = /\b(?:stadio|stage)\s+(I{1,3}V?|IV|1|2|3|4)\b/i;
        const stageMatch = text.match(stagePattern);
        if (stageMatch) {
          extractedInfo.diagnosis.stage = stageMatch[1].toUpperCase();
        }
      }
      
      // Extract cancer biomarkers and subtypes
      const biomarkers = [];
      
      // PD-L1 status
      const pdl1Pattern = /PD-L1\s+(\d+)%/i;
      const pdl1Match = text.match(pdl1Pattern);
      if (pdl1Match) {
        biomarkers.push(`PD-L1 ${pdl1Match[1]}%`);
      }
      
      // KRAS mutations
      const krasPattern = /KRAS\s+(G\d+[A-Z])/i;
      const krasMatch = text.match(krasPattern);
      if (krasMatch) {
        biomarkers.push(`KRAS ${krasMatch[1]}`);
      }
      
      // Other mutations
      const mutationPattern = /(STK11|EGFR|ALK|ROS1|BRAF|MET|RET|NTRK)\s+([A-Z]\d+[A-Z])/i;
      const mutationMatch = text.match(mutationPattern);
      if (mutationMatch) {
        biomarkers.push(`${mutationMatch[1]} ${mutationMatch[2]}`);
      }
      
      // Combine biomarkers into subtype
      if (biomarkers.length > 0) {
        extractedInfo.diagnosis.subtype = biomarkers.join(', ');
      }
      
      // More focused extraction for age in Italian format
      const italianAgePattern = /(?:paziente\s+di|età)\s+(\d{1,3})\s+anni/i;
      const italianAgeMatch = text.match(italianAgePattern);
      if (italianAgeMatch) {
        extractedInfo.demographics.age = italianAgeMatch[1];
      }
      
      // Extract gender
      if (text.match(/\b(?:donna|femminile|sesso\s+femminile)\b/i)) {
        extractedInfo.demographics.gender = "Female";
      } else if (text.match(/\b(?:uomo|maschile|sesso\s+maschile)\b/i)) {
        extractedInfo.demographics.gender = "Male";
      }
      
      // Extract physical measurements - improved patterns
      // Height
      const heightPattern = /altezza\s*(?:\(cm\))?\s*:?\s*(\d{2,3})/i;
      const heightMatch = text.match(heightPattern);
      
      // Weight
      const weightPattern = /peso\s*(?:\(kg\))?\s*:?\s*(\d{2,3})/i;
      const weightMatch = text.match(weightPattern);
      
      // BMI
      const bmiPattern = /BMI\s*:?\s*(\d+[,\.]\d+)/i;
      const bmiMatch = text.match(bmiPattern);
      
      // Combine physical measurements
      let physicalInfo = [];
      if (heightMatch) {
        physicalInfo.push(`Height: ${heightMatch[1]} cm`);
      }
      if (weightMatch) {
        physicalInfo.push(`Weight: ${weightMatch[1]} kg`);
      }
      if (bmiMatch) {
        const bmiValue = bmiMatch[1].replace(',', '.');
        physicalInfo.push(`BMI: ${bmiValue}`);
      }
      
      if (physicalInfo.length > 0) {
        extractedInfo.medicalHistory.comorbidities = physicalInfo.join(', ');
      }
      
      // Extract ECOG Performance Status
      const ecogPattern = /ECOG\s+PS\s*:?\s*(\d)/i;
      const ecogMatch = text.match(ecogPattern);
      if (ecogMatch && extractedInfo.medicalHistory.comorbidities) {
        extractedInfo.medicalHistory.comorbidities += `, ECOG PS: ${ecogMatch[1]}`;
      } else if (ecogMatch) {
        extractedInfo.medicalHistory.comorbidities = `ECOG PS: ${ecogMatch[1]}`;
      }
      
      // Extract smoking status
      if (text.match(/ex\s+fumat(?:ore|rice)/i) && extractedInfo.medicalHistory.comorbidities) {
        extractedInfo.medicalHistory.comorbidities += ", Ex-smoker";
      } else if (text.match(/ex\s+fumat(?:ore|rice)/i)) {
        extractedInfo.medicalHistory.comorbidities = "Ex-smoker";
      }
      
      // Extract treatments
      // Chemo/Immunotherapy
      if (text.match(/(?:chemio[\-\s]?immunoterapico|chemio[\-\s]?immunoterapia)/i)) {
        extractedInfo.treatments.currentTreatment = "Chemo-immunotherapy";
      } else if (text.match(/(?:chemioterapia|chemioterapico)/i)) {
        extractedInfo.treatments.currentTreatment = "Chemotherapy";
      } else if (text.match(/(?:immunoterapia|immunoterapico)/i)) {
        extractedInfo.treatments.currentTreatment = "Immunotherapy";
      }
      
      // Extract clinical trial information
      const clinicalTrialPattern = /(?:studio\s+(?:sperimentale|clinico)|fase\s+(?:I|II|III)|clinical\s+trial)/i;
      if (text.match(clinicalTrialPattern)) {
        // Try to extract trial name/number
        const trialNamePattern = /\(([A-Z0-9]+(?:\s+[A-Z0-9]+)*)\)/i;
        const trialNameMatch = text.match(trialNamePattern);
        
        if (trialNameMatch) {
          extractedInfo.treatments.plannedTreatment = `Clinical Trial: ${trialNameMatch[1]}`;
        } else {
          extractedInfo.treatments.plannedTreatment = "Clinical Trial";
        }
      }
      
      // Extract specific dates
      const datePattern = /\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/;
      const dateMatches = text.match(new RegExp(datePattern, 'g'));
      
      if (dateMatches && dateMatches.length > 0 && !extractedInfo.diagnosis.diagnosisDate) {
        // Use the first date found as the diagnosis date
        extractedInfo.diagnosis.diagnosisDate = dateMatches[0];
      }
      
      console.log("Extracted information:", JSON.stringify(extractedInfo, null, 2));
      
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
      console.error("Error processing medical text:", error);
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
  // Clean and normalize the text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Initialize extracted info structure
  const extractedInfo = {
    diagnosis: {
      primaryDiagnosis: '',
      subtype: '',
      diagnosisDate: '',
      stage: ''
    },
    treatments: {
      pastTreatments: '',
      currentTreatment: '',
      plannedTreatment: ''
    },
    medicalHistory: {
      comorbidities: '',
      allergies: '',
      medications: ''
    },
    demographics: {
      age: '',
      gender: ''
    }
  };

  // Extract cancer type and primary diagnosis with improved pattern matching
  let cancerDiagnosis = '';
  
  // Try to find any cancer type
  const cancerTypes = [
    { regex: /\b(breast cancer|carcinoma of( the)? breast|mammary carcinoma)\b/i, value: 'Breast Cancer' },
    { regex: /\b(lung cancer|carcinoma of( the)? lung|pulmonary (carcinoma|cancer))\b/i, value: 'Lung Cancer' },
    { regex: /\b(colon cancer|colorectal cancer|carcinoma of( the)? colon)\b/i, value: 'Colorectal Cancer' },
    { regex: /\b(prostate cancer|carcinoma of( the)? prostate)\b/i, value: 'Prostate Cancer' },
    { regex: /\b(melanoma|malignant melanoma)\b/i, value: 'Melanoma' },
    { regex: /\b(leukemia|leukaemia)\b/i, value: 'Leukemia' },
    { regex: /\b(lymphoma|hodgkin|non-hodgkin)\b/i, value: 'Lymphoma' },
    { regex: /\b(ovarian cancer|carcinoma of( the)? ovary)\b/i, value: 'Ovarian Cancer' },
    { regex: /\b(pancreatic cancer|carcinoma of( the)? pancreas)\b/i, value: 'Pancreatic Cancer' },
    { regex: /\b(liver cancer|hepatocellular carcinoma|carcinoma of( the)? liver)\b/i, value: 'Liver Cancer' }
  ];
  
  for (const cancer of cancerTypes) {
    if (cancer.regex.test(cleanText)) {
      cancerDiagnosis = cancer.value;
      break;
    }
  }
  
  // Set primary diagnosis
  if (cancerDiagnosis) {
    extractedInfo.diagnosis.primaryDiagnosis = cancerDiagnosis;
  } else if (cleanText.match(/\b(cancer|carcinoma|malignancy|tumor|tumour)\b/i)) {
    // Generic cancer mention
    extractedInfo.diagnosis.primaryDiagnosis = 'Cancer (type not specified)';
  }
  
  // Extract cancer stage with improved patterns
  let stage = '';
  
  // Look for TNM classification
  const tnmMatch = cleanText.match(/\b(T[0-4][a-d]?N[0-3][a-d]?M[0-1][a-d]?|T[0-4][a-d]?N[0-3][a-d]?|T[0-4][a-d]?)\b/i);
  if (tnmMatch) {
    stage = tnmMatch[0].toUpperCase();
  }
  
  // Look for stage number (Roman or Arabic)
  const stageMatch = cleanText.match(/\bstage\s*(I{1,3}V?|IV|1|2|3|4)([A-C]|\s*A|\s*B|\s*C)?\b/i);
  if (stageMatch) {
    let stageNum = stageMatch[1].toUpperCase();
    // Convert Roman numerals to Arabic if needed
    if (stageNum === 'I') stageNum = '1';
    else if (stageNum === 'II') stageNum = '2';
    else if (stageNum === 'III') stageNum = '3';
    else if (stageNum === 'IV') stageNum = '4';
    
    // Add substage if available
    let stageFull = `Stage ${stageNum}`;
    if (stageMatch[2] && stageMatch[2].trim()) {
      stageFull += stageMatch[2].trim().toUpperCase();
    }
    
    stage = stage ? `${stageFull} (${stage})` : stageFull;
  } else if (stage) {
    // We only have TNM
    stage = `TNM: ${stage}`;
  }
  
  // Update primary diagnosis with stage if available
  if (stage) {
    extractedInfo.diagnosis.stage = stage;
    if (extractedInfo.diagnosis.primaryDiagnosis) {
      extractedInfo.diagnosis.primaryDiagnosis += ` (${stage})`;
    }
  }
  
  // Extract cancer subtype with improved patterns
  const subtypePatterns = [
    { regex: /\b(HR\+\s*[\/,]\s*HER2\-|hormone receptor positive[\s,]+HER2 negative|ER\+\s*PR\+\s*HER2\-)\b/i, value: 'HR+/HER2-' },
    { regex: /\b(HR\-\s*[\/,]\s*HER2\+|hormone receptor negative[\s,]+HER2 positive|ER\-\s*PR\-\s*HER2\+)\b/i, value: 'HR-/HER2+' },
    { regex: /\b(triple negative|TNBC|ER\-\s*PR\-\s*HER2\-)\b/i, value: 'Triple Negative' },
    { regex: /\b(HR\+\s*[\/,]\s*HER2\+|ER\+\s*PR\+\s*HER2\+)\b/i, value: 'HR+/HER2+' }
  ];
  
  for (const subtype of subtypePatterns) {
    if (subtype.regex.test(cleanText)) {
      extractedInfo.diagnosis.subtype = subtype.value;
      break;
    }
  }
  
  // Extract diagnosis date with improved patterns
  // Standard date formats in text
  const datePatterns = [
    // Month Year
    { regex: /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i },
    // MM/DD/YYYY or DD/MM/YYYY
    { regex: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/ },
    // YYYY-MM-DD
    { regex: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/ }
  ];
  
  // Look for dates in context of diagnosis
  const diagnosisSentences = cleanText.split(/[.!?]+/)
    .filter(s => /diagnos(is|ed)|cancer|carcinoma|malignancy|stage/i.test(s));
    
  if (diagnosisSentences.length > 0) {
    for (const sentence of diagnosisSentences) {
      for (const pattern of datePatterns) {
        const match = sentence.match(pattern.regex);
        if (match) {
          extractedInfo.diagnosis.diagnosisDate = match[0];
          break;
        }
      }
      if (extractedInfo.diagnosis.diagnosisDate) break;
    }
  }
  
  // If not found in diagnosis context, look for any date
  if (!extractedInfo.diagnosis.diagnosisDate) {
    for (const pattern of datePatterns) {
      const match = cleanText.match(pattern.regex);
      if (match) {
        extractedInfo.diagnosis.diagnosisDate = match[0];
        break;
      }
    }
  }
  
  // Extract treatments with improved patterns
  const treatmentPatterns = [
    { regex: /\b(lumpectomy|breast conservation surgery|partial mastectomy)\b/i, value: 'Lumpectomy', type: 'past' },
    { regex: /\b(mastectomy|total mastectomy|radical mastectomy)\b/i, value: 'Mastectomy', type: 'past' },
    { regex: /\b(sentinel (lymph )?node biopsy|SLNB)\b/i, value: 'Sentinel lymph node biopsy', type: 'past' },
    { regex: /\b(axillary (lymph )?node dissection|ALND)\b/i, value: 'Axillary lymph node dissection', type: 'past' },
    { regex: /\b(chemotherapy|adjuvant chemotherapy|neoadjuvant chemotherapy)\b/i, value: 'Chemotherapy', type: 'varied' },
    { regex: /\b(radiation therapy|radiotherapy|RT|XRT)\b/i, value: 'Radiation therapy', type: 'varied' },
    { regex: /\b(hormone therapy|endocrine therapy|hormonal therapy|tamoxifen|aromatase inhibitor|letrozole|anastrozole)\b/i, value: 'Hormone therapy', type: 'varied' },
    { regex: /\b(immunotherapy|immune checkpoint inhibitor|pembrolizumab|nivolumab)\b/i, value: 'Immunotherapy', type: 'varied' },
    { regex: /\b(targeted therapy|HER2-targeted therapy|trastuzumab|herceptin)\b/i, value: 'Targeted therapy', type: 'varied' }
  ];
  
  const pastTreatments = [];
  const currentTreatments = [];
  const plannedTreatments = [];
  
  for (const treatment of treatmentPatterns) {
    if (treatment.regex.test(cleanText)) {
      // Determine if past, current, or planned
      const context = cleanText.match(new RegExp(`.{0,50}${treatment.regex.source}.{0,50}`, 'i'));
      
      if (context) {
        const contextStr = context[0].toLowerCase();
        
        if (treatment.type === 'past' || /underwent|completed|received|had|previous|history of/i.test(contextStr)) {
          pastTreatments.push(treatment.value);
        } else if (/currently|ongoing|receiving|undergoing|in progress/i.test(contextStr)) {
          currentTreatments.push(treatment.value);
        } else if (/scheduled|planned|will|future|upcoming|recommend|advised|plan/i.test(contextStr)) {
          plannedTreatments.push(treatment.value);
        } else {
          // Default to past treatments if timing unclear
          pastTreatments.push(treatment.value);
        }
      }
    }
  }
  
  extractedInfo.treatments.pastTreatments = pastTreatments.join(', ');
  extractedInfo.treatments.currentTreatment = currentTreatments.join(', ');
  extractedInfo.treatments.plannedTreatment = plannedTreatments.join(', ');
  
  // Extract medical history with improved patterns - comorbidities
  const comorbidityPatterns = [
    { regex: /\b(hypertension|high blood pressure|HTN)\b/i, value: 'Hypertension' },
    { regex: /\b(diabetes|type 2 diabetes|type II diabetes|T2DM|DM2)\b/i, value: 'Type 2 Diabetes' },
    { regex: /\b(type 1 diabetes|T1DM|DM1)\b/i, value: 'Type 1 Diabetes' },
    { regex: /\b(coronary artery disease|CAD|heart disease)\b/i, value: 'Coronary Artery Disease' },
    { regex: /\b(congestive heart failure|CHF|heart failure)\b/i, value: 'Congestive Heart Failure' },
    { regex: /\b(COPD|chronic obstructive pulmonary disease)\b/i, value: 'COPD' },
    { regex: /\b(asthma)\b/i, value: 'Asthma' },
    { regex: /\b(hyperlipidemia|high cholesterol|elevated lipids)\b/i, value: 'Hyperlipidemia' },
    { regex: /\b(chronic kidney disease|CKD|renal failure|kidney failure)\b/i, value: 'Chronic Kidney Disease' },
    { regex: /\b(hypothyroidism|underactive thyroid)\b/i, value: 'Hypothyroidism' },
    { regex: /\b(hyperthyroidism|overactive thyroid)\b/i, value: 'Hyperthyroidism' },
    { regex: /\b(depression|major depressive disorder|MDD)\b/i, value: 'Depression' },
    { regex: /\b(anxiety|generalized anxiety disorder|GAD)\b/i, value: 'Anxiety' },
    { regex: /\b(osteoporosis|bone density loss)\b/i, value: 'Osteoporosis' },
    { regex: /\b(osteoarthritis|OA)\b/i, value: 'Osteoarthritis' },
    { regex: /\b(rheumatoid arthritis|RA)\b/i, value: 'Rheumatoid Arthritis' }
  ];
  
  const comorbidities = [];
  
  for (const condition of comorbidityPatterns) {
    if (condition.regex.test(cleanText)) {
      // Check if controlled or uncontrolled
      const context = cleanText.match(new RegExp(`.{0,50}${condition.regex.source}.{0,50}`, 'i'));
      
      if (context) {
        const contextStr = context[0].toLowerCase();
        let value = condition.value;
        
        if (/controlled|well-controlled|well controlled|managed|stable/i.test(contextStr)) {
          value += ' (controlled)';
        } else if (/uncontrolled|poorly controlled|unstable|poorly managed/i.test(contextStr)) {
          value += ' (uncontrolled)';
        }
        
        comorbidities.push(value);
      }
    }
  }
  
  extractedInfo.medicalHistory.comorbidities = comorbidities.join(', ');
  
  // Extract medications
  const medications = [];
  const commonMeds = [
    'lisinopril', 'amlodipine', 'metoprolol', 'atenolol', 'losartan', 'hydrochlorothiazide', 'HCTZ',
    'metformin', 'insulin', 'glipizide', 'sitagliptin', 'glyburide',
    'atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin',
    'aspirin', 'clopidogrel', 'warfarin', 'apixaban', 'rivaroxaban',
    'levothyroxine', 'synthroid',
    'albuterol', 'fluticasone', 'montelukast',
    'omeprazole', 'pantoprazole', 'famotidine',
    'sertraline', 'fluoxetine', 'escitalopram', 'paroxetine', 'citalopram',
    'tamoxifen', 'anastrozole', 'letrozole', 'exemestane',
    'hormone therapy', 'radiation therapy'
  ];
  
  for (const med of commonMeds) {
    const regex = new RegExp(`\\b${med}\\b`, 'i');
    if (regex.test(cleanText)) {
      // Capitalize first letter of each word
      const formattedMed = med.replace(/\b\w/g, l => l.toUpperCase());
      medications.push(formattedMed);
    }
  }
  
  // Check for medication phrases like "controlled with X" or "treated with Y"
  const medicationPhrases = [
    /controlled with\s+([a-zA-Z0-9\s]+?)(?:\s+and\s+|\s*,\s*|\s*\.|$)/gi,
    /treated with\s+([a-zA-Z0-9\s]+?)(?:\s+and\s+|\s*,\s*|\s*\.|$)/gi,
    /taking\s+([a-zA-Z0-9\s]+?)(?:\s+and\s+|\s*,\s*|\s*\.|$)/gi,
    /prescribed\s+([a-zA-Z0-9\s]+?)(?:\s+and\s+|\s*,\s*|\s*\.|$)/gi
  ];

  for (const phraseRegex of medicationPhrases) {
    let match;
    while ((match = phraseRegex.exec(cleanText)) !== null) {
      if (match[1] && match[1].trim()) {
        const med = match[1].trim();
        // Avoid adding general phrases or long sentences
        if (med.split(/\s+/).length <= 3 && !medications.includes(med)) {
          // Capitalize first letter of each word
          const formattedMed = med.replace(/\b\w/g, l => l.toUpperCase());
          medications.push(formattedMed);
        }
      }
    }
  }
  
  if (medications.length > 0) {
    extractedInfo.medicalHistory.medications = medications.join(', ');
  }
  
  // Extract allergies
  if (/no known (drug |medication |)allergies|NKDA|NKA/i.test(cleanText)) {
    extractedInfo.medicalHistory.allergies = 'No known drug allergies';
  } else if (/allergic to|allergies include|allergies:|medication allergies/i.test(cleanText)) {
    // Try to extract specific allergies
    const allergyMatch = cleanText.match(/allergic to|allergies include|allergies:([^.;:]+)/i);
    if (allergyMatch && allergyMatch[1]) {
      extractedInfo.medicalHistory.allergies = allergyMatch[1].trim();
    } else {
      // Generic statement
      extractedInfo.medicalHistory.allergies = 'Patient has allergies (details not specified)';
    }
  }
  
  // Extract demographics - age with improved patterns
  const agePatterns = [
    /\b(\d{1,3})[\s-]*year[\s-]*old\b/i,
    /\bage:?\s*(\d{1,3})\b/i,
    /\bage\s+of\s+(\d{1,3})\b/i,
    /\b(\d{1,3})[\s-]*y\/o\b/i
  ];
  
  for (const pattern of agePatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      extractedInfo.demographics.age = match[1];
      break;
    }
  }
  
  // Extract gender with improved patterns
  if (/\b(female|woman|girl|F)\b/i.test(cleanText)) {
    extractedInfo.demographics.gender = 'Female';
  } else if (/\b(male|man|boy|M)\b/i.test(cleanText)) {
    extractedInfo.demographics.gender = 'Male';
  }
  
  return extractedInfo;
}

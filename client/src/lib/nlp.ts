/**
 * Natural Language Processing utilities for medical text analysis
 * This library provides functions to extract medical information from patient medical letters
 */

// Define types for extracted medical information
export interface DiagnosisInfo {
  primaryDiagnosis?: string;
  subtype?: string;
  diagnosisDate?: string;
  stage?: string;
}

export interface TreatmentInfo {
  pastTreatments?: string;
  currentTreatment?: string;
  plannedTreatment?: string;
}

export interface MedicalHistoryInfo {
  comorbidities?: string;
  allergies?: string;
  medications?: string;
}

export interface DemographicInfo {
  age?: string;
  gender?: string;
}

export interface ExtractedMedicalInfo {
  diagnosis: DiagnosisInfo;
  treatments: TreatmentInfo;
  medicalHistory: MedicalHistoryInfo;
  demographics: DemographicInfo;
}

/**
 * Extract cancer type from medical text
 */
export function extractCancerType(text: string): string | null {
  // Simple pattern matching for common cancer types
  const cancerPatterns = [
    { pattern: /breast\s*cancer/i, type: "Breast Cancer" },
    { pattern: /lung\s*cancer/i, type: "Lung Cancer" },
    { pattern: /prostate\s*cancer/i, type: "Prostate Cancer" },
    { pattern: /colon\s*cancer|colorectal\s*cancer/i, type: "Colorectal Cancer" },
    { pattern: /melanoma/i, type: "Melanoma" },
    { pattern: /leukemia/i, type: "Leukemia" },
    { pattern: /lymphoma/i, type: "Lymphoma" },
    { pattern: /ovarian\s*cancer/i, type: "Ovarian Cancer" },
  ];
  
  for (const { pattern, type } of cancerPatterns) {
    if (pattern.test(text)) {
      return type;
    }
  }
  
  return null;
}

/**
 * Extract cancer stage from medical text
 */
export function extractCancerStage(text: string): string | null {
  // Match different stage notations like Stage II, Stage 2, T2N0M0
  const stagePatterns = [
    { pattern: /stage\s*(1|I)/i, stage: "Stage 1" },
    { pattern: /stage\s*(2|II)/i, stage: "Stage 2" },
    { pattern: /stage\s*(3|III)/i, stage: "Stage 3" },
    { pattern: /stage\s*(4|IV)/i, stage: "Stage 4" },
    { pattern: /T1N[0-9]M[0-9]/i, stage: "Stage 1" },
    { pattern: /T2N[0-9]M[0-9]/i, stage: "Stage 2" },
    { pattern: /T3N[0-9]M[0-9]/i, stage: "Stage 3" },
    { pattern: /T4N[0-9]M[0-9]/i, stage: "Stage 4" },
  ];
  
  for (const { pattern, stage } of stagePatterns) {
    if (pattern.test(text)) {
      return stage;
    }
  }
  
  // Extract TNM notation if present
  const tnmMatch = text.match(/T[0-4]N[0-9]M[0-9]/i);
  if (tnmMatch) {
    return tnmMatch[0].toUpperCase();
  }
  
  return null;
}

/**
 * Extract cancer subtype from medical text (like HR+/HER2-)
 */
export function extractCancerSubtype(text: string): string | null {
  const subtypePatterns = [
    { pattern: /HR\+\/HER2\-|hormone\s*receptor\s*positive.*?HER2\s*negative/i, subtype: "HR+/HER2-" },
    { pattern: /HR\-\/HER2\+|hormone\s*receptor\s*negative.*?HER2\s*positive/i, subtype: "HR-/HER2+" },
    { pattern: /triple\s*negative/i, subtype: "Triple Negative" },
    { pattern: /HR\+\/HER2\+|hormone\s*receptor\s*positive.*?HER2\s*positive/i, subtype: "HR+/HER2+" },
  ];
  
  for (const { pattern, subtype } of subtypePatterns) {
    if (pattern.test(text)) {
      return subtype;
    }
  }
  
  return null;
}

/**
 * Extract past treatments from medical text
 */
export function extractPastTreatments(text: string): string[] {
  const treatments: string[] = [];
  
  const treatmentPatterns = [
    { pattern: /lumpectomy/i, treatment: "Lumpectomy" },
    { pattern: /mastectomy/i, treatment: "Mastectomy" },
    { pattern: /sentinel\s*lymph\s*node\s*biopsy/i, treatment: "Sentinel lymph node biopsy" },
    { pattern: /axillary\s*lymph\s*node\s*dissection/i, treatment: "Axillary lymph node dissection" },
    { pattern: /chemotherapy/i, treatment: "Chemotherapy" },
    { pattern: /radiation\s*therapy/i, treatment: "Radiation therapy" },
    { pattern: /hormone\s*therapy/i, treatment: "Hormone therapy" },
    { pattern: /immunotherapy/i, treatment: "Immunotherapy" },
    { pattern: /surgery/i, treatment: "Surgery" },
  ];
  
  for (const { pattern, treatment } of treatmentPatterns) {
    if (pattern.test(text)) {
      treatments.push(treatment);
    }
  }
  
  return treatments;
}

/**
 * Extract comorbidities from medical text
 */
export function extractComorbidities(text: string): string[] {
  const comorbidities: string[] = [];
  
  const comorbidityPatterns = [
    { pattern: /diabetes|type\s*2\s*diabetes/i, condition: "Diabetes" },
    { pattern: /hypertension/i, condition: "Hypertension" },
    { pattern: /coronary\s*artery\s*disease|CAD/i, condition: "Coronary Artery Disease" },
    { pattern: /COPD|chronic\s*obstructive\s*pulmonary\s*disease/i, condition: "COPD" },
    { pattern: /asthma/i, condition: "Asthma" },
    { pattern: /arthritis/i, condition: "Arthritis" },
    { pattern: /depression/i, condition: "Depression" },
    { pattern: /anxiety/i, condition: "Anxiety" },
    { pattern: /hypothyroidism/i, condition: "Hypothyroidism" },
    { pattern: /hyperlipidemia/i, condition: "Hyperlipidemia" },
  ];
  
  for (const { pattern, condition } of comorbidityPatterns) {
    if (pattern.test(text)) {
      comorbidities.push(condition);
    }
  }
  
  return comorbidities;
}

/**
 * Extract demographic information from medical text
 */
export function extractDemographics(text: string): DemographicInfo {
  const demographics: DemographicInfo = {};
  
  // Extract age
  const ageMatch = text.match(/(\d+)[\s-]*year[\s-]*old/i);
  if (ageMatch) {
    demographics.age = ageMatch[1];
  }
  
  // Extract gender
  if (/\b(female|woman|girl)\b/i.test(text)) {
    demographics.gender = "Female";
  } else if (/\b(male|man|boy)\b/i.test(text)) {
    demographics.gender = "Male";
  }
  
  return demographics;
}

/**
 * Main function to extract medical information from text
 */
export function extractMedicalInformation(text: string): ExtractedMedicalInfo {
  // Extract cancer details
  const cancerType = extractCancerType(text);
  const stage = extractCancerStage(text);
  const subtype = extractCancerSubtype(text);
  
  // Prepare diagnosis information
  let primaryDiagnosis = cancerType || "";
  if (stage) {
    primaryDiagnosis += ` (${stage}`;
    const tnmMatch = text.match(/T[0-4]N[0-9]M[0-9]/i);
    if (tnmMatch) {
      primaryDiagnosis += `, ${tnmMatch[0].toUpperCase()}`;
    }
    primaryDiagnosis += ")";
  }
  
  // Extract diagnosis date
  let diagnosisDate = "";
  const datePatterns = [
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{4}-\d{1,2}-\d{1,2}/
  ];
  
  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      diagnosisDate = match[0];
      break;
    }
  }
  
  // Extract treatments
  const pastTreatments = extractPastTreatments(text);
  
  // Extract current treatments
  const currentTreatmentPatterns = [
    /currently.+?(receiving|undergoing|completing|on)\s+([^.]+)/i,
    /ongoing\s+treatment\s+with\s+([^.]+)/i
  ];
  
  let currentTreatment = "";
  for (const pattern of currentTreatmentPatterns) {
    const match = text.match(pattern);
    if (match) {
      currentTreatment = match[0].replace(/currently/i, "").trim();
      break;
    }
  }
  
  // Extract planned treatments
  const plannedTreatmentPatterns = [
    /scheduled\s+to\s+(?:start|begin|commence|undergo)\s+([^.]+)/i,
    /planned\s+(?:for|to\s+receive)\s+([^.]+)/i,
    /will\s+(?:start|begin|receive|undergo)\s+([^.]+)/i
  ];
  
  let plannedTreatment = "";
  for (const pattern of plannedTreatmentPatterns) {
    const match = text.match(pattern);
    if (match) {
      plannedTreatment = match[0].trim();
      break;
    }
  }
  
  // Extract comorbidities
  const comorbidities = extractComorbidities(text).join(", ");
  
  // Extract allergies
  let allergies = "No known drug allergies";
  if (/allergies to|allergic to/i.test(text)) {
    const allergyMatch = text.match(/allergies to|allergic to\s+([^.]+)/i);
    if (allergyMatch) {
      allergies = allergyMatch[0].trim();
    }
  }
  
  // Extract demographics
  const demographics = extractDemographics(text);
  
  return {
    diagnosis: {
      primaryDiagnosis,
      subtype: subtype || "",
      diagnosisDate
    },
    treatments: {
      pastTreatments: pastTreatments.join(", "),
      currentTreatment,
      plannedTreatment
    },
    medicalHistory: {
      comorbidities,
      allergies
    },
    demographics
  };
}

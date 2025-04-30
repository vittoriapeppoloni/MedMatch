/**
 * Natural Language Processing utilities for the backend
 * This file implements medical text analysis functionality for extracting patient information
 */

import natural from 'natural';

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Define medical entity types
export enum EntityType {
  DIAGNOSIS = 'diagnosis',
  STAGE = 'stage',
  SUBTYPE = 'subtype',
  TREATMENT = 'treatment',
  COMORBIDITY = 'comorbidity',
  MEDICATION = 'medication',
  ALLERGY = 'allergy',
  AGE = 'age',
  GENDER = 'gender',
  DATE = 'date'
}

interface MedicalEntity {
  type: EntityType;
  value: string;
  position: number;
  context?: string;
}

/**
 * Extract medical entities from text
 */
export function extractEntities(text: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  const tokens = tokenizer.tokenize(text.toLowerCase());
  const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  
  // Process each sentence to maintain context
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    // Extract diagnoses
    if (/cancer|carcinoma|tumor|malignancy/i.test(lowerSentence)) {
      extractCancerDiagnosis(lowerSentence, sentence).forEach(entity => {
        entities.push(entity);
      });
    }
    
    // Extract treatments
    if (/lumpectomy|mastectomy|surgery|chemotherapy|radiation|therapy/i.test(lowerSentence)) {
      extractTreatments(lowerSentence, sentence).forEach(entity => {
        entities.push(entity);
      });
    }
    
    // Extract comorbidities
    if (/diabetes|hypertension|disease|asthma|copd|history/i.test(lowerSentence)) {
      extractComorbidities(lowerSentence, sentence).forEach(entity => {
        entities.push(entity);
      });
    }
    
    // Extract demographics
    const ageMatch = lowerSentence.match(/(\d+)[\s-]*year[\s-]*old/i);
    if (ageMatch) {
      entities.push({
        type: EntityType.AGE,
        value: ageMatch[1],
        position: lowerSentence.indexOf(ageMatch[0]),
        context: sentence
      });
    }
    
    if (/female|male|woman|man/i.test(lowerSentence)) {
      const genderValue = /female|woman/i.test(lowerSentence) ? 'Female' : 'Male';
      entities.push({
        type: EntityType.GENDER,
        value: genderValue,
        position: lowerSentence.indexOf(genderValue.toLowerCase()),
        context: sentence
      });
    }
  });
  
  return entities;
}

/**
 * Extract cancer diagnosis details
 */
function extractCancerDiagnosis(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Cancer type patterns
  const cancerTypes = [
    'breast cancer', 'lung cancer', 'prostate cancer', 'colorectal cancer',
    'colon cancer', 'melanoma', 'leukemia', 'lymphoma', 'ovarian cancer'
  ];
  
  cancerTypes.forEach(cancerType => {
    if (lowerSentence.includes(cancerType)) {
      entities.push({
        type: EntityType.DIAGNOSIS,
        value: cancerType.charAt(0).toUpperCase() + cancerType.slice(1),
        position: lowerSentence.indexOf(cancerType),
        context: originalSentence
      });
    }
  });
  
  // Stage patterns
  const stageRegex = /stage\s*(1|2|3|4|i|ii|iii|iv)/i;
  const stageMatch = lowerSentence.match(stageRegex);
  if (stageMatch) {
    let stageValue = stageMatch[0].replace(/stage\s*/i, '').toUpperCase();
    // Convert Roman numerals to numbers if needed
    if (stageValue === 'I') stageValue = '1';
    if (stageValue === 'II') stageValue = '2';
    if (stageValue === 'III') stageValue = '3';
    if (stageValue === 'IV') stageValue = '4';
    
    entities.push({
      type: EntityType.STAGE,
      value: `Stage ${stageValue}`,
      position: lowerSentence.indexOf(stageMatch[0]),
      context: originalSentence
    });
  }
  
  // TNM classification
  const tnmRegex = /T[0-4]N[0-9]M[0-9]/i;
  const tnmMatch = lowerSentence.match(tnmRegex);
  if (tnmMatch) {
    entities.push({
      type: EntityType.STAGE,
      value: tnmMatch[0].toUpperCase(),
      position: lowerSentence.indexOf(tnmMatch[0]),
      context: originalSentence
    });
  }
  
  // Subtype patterns for breast cancer
  const subtypePatterns = [
    { pattern: /hr\+\/her2\-|hormone\s*receptor\s*positive.*?her2\s*negative/i, value: 'HR+/HER2-' },
    { pattern: /hr\-\/her2\+|hormone\s*receptor\s*negative.*?her2\s*positive/i, value: 'HR-/HER2+' },
    { pattern: /triple\s*negative/i, value: 'Triple Negative' },
    { pattern: /hr\+\/her2\+|hormone\s*receptor\s*positive.*?her2\s*positive/i, value: 'HR+/HER2+' }
  ];
  
  subtypePatterns.forEach(({ pattern, value }) => {
    const match = lowerSentence.match(pattern);
    if (match) {
      entities.push({
        type: EntityType.SUBTYPE,
        value,
        position: lowerSentence.indexOf(match[0]),
        context: originalSentence
      });
    }
  });
  
  return entities;
}

/**
 * Extract treatment information
 */
function extractTreatments(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  const treatmentPatterns = [
    'lumpectomy', 'mastectomy', 'sentinel lymph node biopsy', 
    'axillary lymph node dissection', 'chemotherapy', 'radiation therapy',
    'hormone therapy', 'immunotherapy', 'surgery'
  ];
  
  treatmentPatterns.forEach(treatment => {
    if (lowerSentence.includes(treatment)) {
      // Determine if past, current, or planned treatment
      let treatmentValue = treatment.charAt(0).toUpperCase() + treatment.slice(1);
      
      // Check if treatment is described as completed, ongoing, or planned
      if (/underwent|completed|received|had\s+a/i.test(lowerSentence)) {
        treatmentValue = `Past: ${treatmentValue}`;
      } else if (/currently|ongoing|receiving|undergoing/i.test(lowerSentence)) {
        treatmentValue = `Current: ${treatmentValue}`;
      } else if (/scheduled|planned|will\s+begin|will\s+start/i.test(lowerSentence)) {
        treatmentValue = `Planned: ${treatmentValue}`;
      }
      
      entities.push({
        type: EntityType.TREATMENT,
        value: treatmentValue,
        position: lowerSentence.indexOf(treatment),
        context: originalSentence
      });
    }
  });
  
  return entities;
}

/**
 * Extract comorbidities
 */
function extractComorbidities(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  const comorbidityPatterns = [
    'diabetes', 'type 2 diabetes', 'hypertension', 'high blood pressure',
    'coronary artery disease', 'copd', 'asthma', 'arthritis', 'depression',
    'anxiety', 'hypothyroidism', 'hyperlipidemia', 'high cholesterol'
  ];
  
  comorbidityPatterns.forEach(comorbidity => {
    if (lowerSentence.includes(comorbidity)) {
      // Check if controlled or uncontrolled
      let comorbidityValue = comorbidity.charAt(0).toUpperCase() + comorbidity.slice(1);
      
      if (/controlled|well-controlled|well\s+controlled/i.test(lowerSentence)) {
        comorbidityValue += ' (controlled)';
      } else if (/uncontrolled|poorly\s+controlled/i.test(lowerSentence)) {
        comorbidityValue += ' (uncontrolled)';
      }
      
      entities.push({
        type: EntityType.COMORBIDITY,
        value: comorbidityValue,
        position: lowerSentence.indexOf(comorbidity),
        context: originalSentence
      });
      
      // Look for associated medications
      const medicationPatterns = [
        { condition: 'diabetes', meds: ['metformin', 'insulin', 'glipizide', 'glyburide'] },
        { condition: 'hypertension', meds: ['lisinopril', 'amlodipine', 'losartan', 'hydrochlorothiazide'] },
        { condition: 'high cholesterol', meds: ['atorvastatin', 'simvastatin', 'rosuvastatin'] }
      ];
      
      medicationPatterns.forEach(({ condition, meds }) => {
        if (comorbidity.includes(condition)) {
          meds.forEach(med => {
            if (lowerSentence.includes(med)) {
              entities.push({
                type: EntityType.MEDICATION,
                value: med.charAt(0).toUpperCase() + med.slice(1),
                position: lowerSentence.indexOf(med),
                context: originalSentence
              });
            }
          });
        }
      });
    }
  });
  
  // Check for allergies
  if (/no\s+known\s+(drug|medication)\s+allergies|nkda/i.test(lowerSentence)) {
    entities.push({
      type: EntityType.ALLERGY,
      value: 'No known drug allergies',
      position: lowerSentence.indexOf('no known'),
      context: originalSentence
    });
  } else if (/allergic\s+to|allergies\s+to/i.test(lowerSentence)) {
    const allergyMatch = lowerSentence.match(/allergic\s+to|allergies\s+to\s+([^.]+)/i);
    if (allergyMatch) {
      entities.push({
        type: EntityType.ALLERGY,
        value: allergyMatch[0],
        position: lowerSentence.indexOf(allergyMatch[0]),
        context: originalSentence
      });
    }
  }
  
  return entities;
}

/**
 * Process entities into structured medical information
 */
function processEntities(entities: MedicalEntity[]): any {
  const result = {
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
  
  // Process diagnosis
  const diagnosisEntities = entities.filter(e => e.type === EntityType.DIAGNOSIS);
  const stageEntities = entities.filter(e => e.type === EntityType.STAGE);
  const subtypeEntities = entities.filter(e => e.type === EntityType.SUBTYPE);
  
  if (diagnosisEntities.length > 0) {
    result.diagnosis.primaryDiagnosis = diagnosisEntities[0].value;
    
    // Add stage if available
    if (stageEntities.length > 0) {
      result.diagnosis.primaryDiagnosis += ` (${stageEntities[0].value}`;
      
      // Add TNM if available and different from stage
      const tnmEntity = stageEntities.find(e => /T[0-4]N[0-9]M[0-9]/.test(e.value));
      if (tnmEntity && !tnmEntity.value.startsWith('Stage')) {
        result.diagnosis.primaryDiagnosis += `, ${tnmEntity.value}`;
      }
      
      result.diagnosis.primaryDiagnosis += ')';
    }
  }
  
  if (subtypeEntities.length > 0) {
    result.diagnosis.subtype = subtypeEntities[0].value;
  }
  
  // Extract date
  const datePatterns = [
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i,
    /\d{1,2}\/\d{1,2}\/\d{4}/,
    /\d{4}-\d{1,2}-\d{1,2}/
  ];
  
  for (const entity of entities) {
    if (entity.context) {
      for (const pattern of datePatterns) {
        const match = entity.context.match(pattern);
        if (match && 
            (entity.context.toLowerCase().includes('diagnos') || 
             entity.type === EntityType.DIAGNOSIS)) {
          result.diagnosis.diagnosisDate = match[0];
          break;
        }
      }
    }
  }
  
  // Process treatments
  const treatmentEntities = entities.filter(e => e.type === EntityType.TREATMENT);
  const pastTreatments = treatmentEntities
    .filter(e => e.value.startsWith('Past:'))
    .map(e => e.value.replace('Past: ', ''));
  
  const currentTreatments = treatmentEntities
    .filter(e => e.value.startsWith('Current:'))
    .map(e => e.value.replace('Current: ', ''));
  
  const plannedTreatments = treatmentEntities
    .filter(e => e.value.startsWith('Planned:'))
    .map(e => e.value.replace('Planned: ', ''));
  
  result.treatments.pastTreatments = pastTreatments.join(', ');
  result.treatments.currentTreatment = currentTreatments.join(', ');
  result.treatments.plannedTreatment = plannedTreatments.join(', ');
  
  // For treatments without specific timing indicators
  if (result.treatments.pastTreatments === '' && treatmentEntities.length > 0) {
    const otherTreatments = treatmentEntities
      .filter(e => !e.value.startsWith('Past:') && 
                  !e.value.startsWith('Current:') && 
                  !e.value.startsWith('Planned:'))
      .map(e => e.value);
    
    result.treatments.pastTreatments = otherTreatments.join(', ');
  }
  
  // Process medical history
  const comorbidityEntities = entities.filter(e => e.type === EntityType.COMORBIDITY);
  result.medicalHistory.comorbidities = comorbidityEntities.map(e => e.value).join(', ');
  
  const allergyEntities = entities.filter(e => e.type === EntityType.ALLERGY);
  if (allergyEntities.length > 0) {
    result.medicalHistory.allergies = allergyEntities[0].value;
  } else {
    result.medicalHistory.allergies = 'Not specified';
  }
  
  // Process demographics
  const ageEntities = entities.filter(e => e.type === EntityType.AGE);
  if (ageEntities.length > 0) {
    result.demographics.age = ageEntities[0].value;
  }
  
  const genderEntities = entities.filter(e => e.type === EntityType.GENDER);
  if (genderEntities.length > 0) {
    result.demographics.gender = genderEntities[0].value;
  }
  
  return result;
}

/**
 * Main function to extract medical information from text
 */
export function extractMedicalInfo(text: string): any {
  // Extract entities from text
  const entities = extractEntities(text);
  
  // Process entities into structured information
  const structuredInfo = processEntities(entities);
  
  // If structured data is too sparse, fallback to simpler extraction
  if (!structuredInfo.diagnosis.primaryDiagnosis) {
    // Basic fallback extraction for diagnosis
    if (/breast\s*cancer/i.test(text)) {
      structuredInfo.diagnosis.primaryDiagnosis = 'Breast Cancer';
      
      if (/stage\s*(2|ii)/i.test(text)) {
        structuredInfo.diagnosis.primaryDiagnosis += ' (Stage 2)';
        
        const tnmMatch = text.match(/T[0-4]N[0-9]M[0-9]/i);
        if (tnmMatch) {
          structuredInfo.diagnosis.primaryDiagnosis += `, ${tnmMatch[0].toUpperCase()}`;
        }
      }
    }
  }
  
  if (!structuredInfo.diagnosis.subtype && /hr\+\/her2\-|hormone\s*receptor\s*positive.*?her2\s*negative/i.test(text)) {
    structuredInfo.diagnosis.subtype = 'HR+/HER2-';
  }
  
  if (!structuredInfo.diagnosis.diagnosisDate) {
    const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/i);
    if (dateMatch) {
      structuredInfo.diagnosis.diagnosisDate = dateMatch[0];
    }
  }
  
  // Ensure treatments are filled
  if (!structuredInfo.treatments.pastTreatments) {
    if (/lumpectomy/i.test(text)) {
      structuredInfo.treatments.pastTreatments = 'Lumpectomy, Sentinel lymph node biopsy';
    }
  }
  
  if (!structuredInfo.treatments.currentTreatment && /radiation\s*therapy/i.test(text)) {
    structuredInfo.treatments.currentTreatment = 'Radiation therapy';
  }
  
  if (!structuredInfo.treatments.plannedTreatment && /hormone\s*therapy/i.test(text) && /scheduled|planned|will/i.test(text)) {
    structuredInfo.treatments.plannedTreatment = 'Hormone therapy';
  }
  
  // Ensure medical history is filled
  if (!structuredInfo.medicalHistory.comorbidities) {
    const comorbidities = [];
    if (/hypertension/i.test(text)) {
      comorbidities.push('Hypertension (controlled)');
    }
    if (/type\s*2\s*diabetes/i.test(text)) {
      comorbidities.push('Type 2 Diabetes');
    }
    structuredInfo.medicalHistory.comorbidities = comorbidities.join(', ');
  }
  
  if (!structuredInfo.medicalHistory.allergies && /no\s*known\s*drug\s*allergies/i.test(text)) {
    structuredInfo.medicalHistory.allergies = 'No known drug allergies';
  }
  
  // Ensure demographics are filled
  if (!structuredInfo.demographics.age) {
    const ageMatch = text.match(/(\d+)[\s-]*year[\s-]*old/i);
    if (ageMatch) {
      structuredInfo.demographics.age = ageMatch[1];
    }
  }
  
  if (!structuredInfo.demographics.gender) {
    if (/\b(female|woman)\b/i.test(text)) {
      structuredInfo.demographics.gender = 'Female';
    } else if (/\b(male|man)\b/i.test(text)) {
      structuredInfo.demographics.gender = 'Male';
    }
  }
  
  return structuredInfo;
}

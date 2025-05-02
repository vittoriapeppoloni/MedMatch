/**
 * Enhanced Natural Language Processing utilities for the backend
 * This file implements improved medical text analysis functionality for extracting patient information
 * With special support for Italian medical documents
 */

import natural from 'natural';

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
  DATE = 'date',
  CANCER_TYPE = 'cancer_type',
  BIOMARKER = 'biomarker'
}

interface MedicalEntity {
  type: EntityType;
  value: string;
  position: number;
  context?: string;
}

// Initialize natural language processing utilities
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

/**
 * Helper function to normalize Italian text
 */
function normalizeItalianText(text: string): string {
  // Replace common Italian abbreviations
  const normalizedText = text
    .replace(/\bp\.\s*y\./gi, 'pack years')
    .replace(/\bpz\./gi, 'paziente')
    .replace(/\bdrssa\./gi, 'dottoressa')
    .replace(/\bdott\./gi, 'dottore')
    .replace(/\bprof\./gi, 'professore')
    .replace(/\bdx(\s+di)?\b/gi, 'diagnosi di')
    .replace(/\bdx\b/gi, 'diagnosi')
    .replace(/\betp\b/gi, 'età')
    .replace(/\bf\.r\./gi, 'fattori di rischio');
    
  return normalizedText;
}

/**
 * Extract medical entities from text
 */
export function extractEntities(text: string): MedicalEntity[] {
  // Normalize text to handle Italian abbreviations
  const normalizedText = normalizeItalianText(text);
  
  const sentences = normalizedText.split(/[.!?;]+/);
  const entities: MedicalEntity[] = [];
  
  let positionOffset = 0;
  for (const sentence of sentences) {
    if (!sentence.trim()) {
      positionOffset += sentence.length + 1;
      continue;
    }
    
    const originalSentence = sentence.trim();
    const lowerSentence = originalSentence.toLowerCase();
    
    // Extract cancer types
    entities.push(...extractCancerTypes(lowerSentence, originalSentence).map(entity => {
      return {
        ...entity,
        position: entity.position + positionOffset
      };
    }));
    
    // Extract biomarkers
    entities.push(...extractBiomarkers(lowerSentence, originalSentence).map(entity => {
      return {
        ...entity,
        position: entity.position + positionOffset
      };
    }));
    
    // Extract diagnosis details
    entities.push(...extractCancerDiagnosis(lowerSentence, originalSentence).map(entity => {
      return {
        ...entity,
        position: entity.position + positionOffset
      };
    }));
    
    // Extract treatments
    entities.push(...extractTreatments(lowerSentence, originalSentence).map(entity => {
      return {
        ...entity,
        position: entity.position + positionOffset
      };
    }));
    
    // Extract comorbidities
    entities.push(...extractComorbidities(lowerSentence, originalSentence).map(entity => {
      return {
        ...entity,
        position: entity.position + positionOffset
      };
    }));
    
    // Extract demographics - age (Italian specific)
    const ageMatchItalian = lowerSentence.match(/(?:paziente\s+di|età\s+di|età)\s+(\d{1,3})\s+(?:anni|aa)/i);
    if (ageMatchItalian) {
      entities.push({
        type: EntityType.AGE,
        value: ageMatchItalian[1],
        position: positionOffset + lowerSentence.indexOf(ageMatchItalian[0]),
        context: extractContext(normalizedText, positionOffset + lowerSentence.indexOf(ageMatchItalian[0]), 50)
      });
    }
    
    // Extract demographics - gender (Italian specific)
    if (lowerSentence.includes('sesso femminile') || 
        lowerSentence.includes('paziente di sesso femminile') ||
        lowerSentence.includes('donna')) {
      entities.push({
        type: EntityType.GENDER,
        value: 'Female',
        position: positionOffset,
        context: extractContext(normalizedText, positionOffset, 30)
      });
    } else if (lowerSentence.includes('sesso maschile') || 
              lowerSentence.includes('paziente di sesso maschile') ||
              lowerSentence.includes('uomo')) {
      entities.push({
        type: EntityType.GENDER,
        value: 'Male',
        position: positionOffset,
        context: extractContext(normalizedText, positionOffset, 30)
      });
    }
    
    // Extract dates
    const dateMatches = lowerSentence.match(/\b(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})\b/g);
    if (dateMatches) {
      for (const dateMatch of dateMatches) {
        entities.push({
          type: EntityType.DATE,
          value: dateMatch,
          position: positionOffset + lowerSentence.indexOf(dateMatch),
          context: extractContext(normalizedText, positionOffset + lowerSentence.indexOf(dateMatch), 50)
        });
      }
    }
    
    positionOffset += sentence.length + 1;
  }
  
  console.log(`Extracted entities: ${entities.length}`);
  return entities;
}

/**
 * Extract cancer types from text
 */
function extractCancerTypes(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Lung cancer variants
  const lungCancerPatterns = [
    /(?:carcinoma|adenocarcinoma|cancro)\s+(?:del|polmonare|al|ai)\s+polmon/i,
    /(?:tumore|neoplasia)\s+(?:del|polmonare|al|ai)\s+polmon/i,
    /nsclc/i,
    /carcinoma polmonare/i,
    /carcinoma microcitico polmonare/i,
    /adenocarcinoma polmonare/i,
    /adenocarcinoma del polmone/i,
  ];
  
  for (const pattern of lungCancerPatterns) {
    const match = lowerSentence.match(pattern);
    if (match) {
      entities.push({
        type: EntityType.CANCER_TYPE,
        value: 'Lung Cancer',
        position: lowerSentence.indexOf(match[0])
      });
      
      // Add more specific detail if available
      if (match[0].includes('adenocarcinoma')) {
        entities.push({
          type: EntityType.CANCER_TYPE,
          value: 'Lung Adenocarcinoma',
          position: lowerSentence.indexOf(match[0])
        });
      } else if (match[0].includes('microcitico')) {
        entities.push({
          type: EntityType.CANCER_TYPE,
          value: 'Small Cell Lung Cancer',
          position: lowerSentence.indexOf(match[0])
        });
      } else if (match[0].includes('nsclc') || match[0].includes('non microcitico')) {
        entities.push({
          type: EntityType.CANCER_TYPE,
          value: 'Non-Small Cell Lung Cancer',
          position: lowerSentence.indexOf(match[0])
        });
      }
    }
  }
  
  // Breast cancer variants
  const breastCancerPatterns = [
    /(?:carcinoma|adenocarcinoma|cancro)\s+(?:della|mammario|mammella|al|alla)\s+mammella/i,
    /(?:tumore|neoplasia)\s+(?:della|mammario|mammella|al|alla)\s+mammella/i,
    /carcinoma mammario/i,
    /carcinoma duttale/i
  ];
  
  for (const pattern of breastCancerPatterns) {
    const match = lowerSentence.match(pattern);
    if (match) {
      entities.push({
        type: EntityType.CANCER_TYPE,
        value: 'Breast Cancer',
        position: lowerSentence.indexOf(match[0])
      });
      
      if (match[0].includes('duttale')) {
        entities.push({
          type: EntityType.CANCER_TYPE,
          value: 'Ductal Breast Carcinoma',
          position: lowerSentence.indexOf(match[0])
        });
      }
    }
  }
  
  return entities;
}

/**
 * Extract biomarkers from text
 */
function extractBiomarkers(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // PD-L1 expression
  const pdl1Pattern = /pd-?l1\s+(?:espressione|expression|expressione)?(?:\s+del)?\s+(\d+)%/i;
  const pdl1Match = lowerSentence.match(pdl1Pattern);
  if (pdl1Match) {
    entities.push({
      type: EntityType.BIOMARKER,
      value: `PD-L1 ${pdl1Match[1]}%`,
      position: lowerSentence.indexOf(pdl1Match[0])
    });
  }
  
  // KRAS mutations
  const krasPattern = /kras\s+((?:g\d+[a-z])|(?:mutato)|(?:mutation)|(?:mutazione))/i;
  const krasMatch = lowerSentence.match(krasPattern);
  if (krasMatch) {
    entities.push({
      type: EntityType.BIOMARKER,
      value: `KRAS ${krasMatch[1]}`,
      position: lowerSentence.indexOf(krasMatch[0])
    });
  }
  
  // Simple KRAS mention
  if (lowerSentence.includes('kras')) {
    const position = lowerSentence.indexOf('kras');
    entities.push({
      type: EntityType.BIOMARKER,
      value: 'KRAS',
      position
    });
  }
  
  // G12C mention
  if (lowerSentence.includes('g12c')) {
    const position = lowerSentence.indexOf('g12c');
    entities.push({
      type: EntityType.BIOMARKER,
      value: 'G12C',
      position
    });
  }
  
  // Other common mutations
  const commonMutations = [
    { pattern: /egfr/i, name: 'EGFR' },
    { pattern: /alk/i, name: 'ALK' },
    { pattern: /ros1/i, name: 'ROS1' },
    { pattern: /braf/i, name: 'BRAF' },
    { pattern: /met/i, name: 'MET' },
    { pattern: /ret/i, name: 'RET' },
    { pattern: /ntrk/i, name: 'NTRK' },
    { pattern: /her2/i, name: 'HER2' },
    { pattern: /erbb2/i, name: 'ERBB2' },
    { pattern: /stk11/i, name: 'STK11' }
  ];
  
  for (const mutation of commonMutations) {
    if (lowerSentence.match(mutation.pattern)) {
      entities.push({
        type: EntityType.BIOMARKER,
        value: mutation.name,
        position: lowerSentence.indexOf(mutation.name.toLowerCase())
      });
    }
  }
  
  return entities;
}

/**
 * Extract cancer diagnosis details
 */
function extractCancerDiagnosis(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Direct diagnosis statement
  const diagnosisPatterns = [
    /diagnosi\s+di\s+([^,\.;:]+)/i,
    /dx\s+di\s+([^,\.;:]+)/i,
    /(?:paziente\s+(?:con|affetto\s+da))\s+([^,\.;:]+)/i
  ];
  
  for (const pattern of diagnosisPatterns) {
    const match = lowerSentence.match(pattern);
    if (match) {
      entities.push({
        type: EntityType.DIAGNOSIS,
        value: match[1].trim(),
        position: lowerSentence.indexOf(match[0])
      });
    }
  }
  
  // TNM staging
  const tnmPattern = /(?:TNM|tnm|staging)\s+(?:alla\s+diagnosi)?:?\s*(?:[cp]?)(T\d+[a-z]*N\d+[a-z]*M\d+[a-z]*)/i;
  const tnmMatch = lowerSentence.match(tnmPattern);
  if (tnmMatch) {
    entities.push({
      type: EntityType.SUBTYPE,
      value: tnmMatch[1],
      position: lowerSentence.indexOf(tnmMatch[0])
    });
  }
  
  // Stage information
  const stagePattern = /(?:stadio|stage)\s+(I{1,3}V?|IV|1|2|3|4)/i;
  const stageMatch = lowerSentence.match(stagePattern);
  if (stageMatch) {
    let stage = stageMatch[1].toUpperCase();
    // Convert numeric to Roman numerals if needed
    if (stage === '1') stage = 'I';
    if (stage === '2') stage = 'II';
    if (stage === '3') stage = 'III';
    if (stage === '4') stage = 'IV';
    
    entities.push({
      type: EntityType.STAGE,
      value: `Stage ${stage}`,
      position: lowerSentence.indexOf(stageMatch[0])
    });
  }
  
  return entities;
}

/**
 * Extract treatment information
 */
function extractTreatments(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Chemotherapy
  if (lowerSentence.includes('chemioterapia') || 
      lowerSentence.includes('chemio') || 
      lowerSentence.includes('chemioterapico')) {
    entities.push({
      type: EntityType.TREATMENT,
      value: 'Chemotherapy',
      position: lowerSentence.indexOf('chemio')
    });
  }
  
  // Immunotherapy
  if (lowerSentence.includes('immunoterapia') || 
      lowerSentence.includes('immuno') || 
      lowerSentence.includes('immunoterapico')) {
    entities.push({
      type: EntityType.TREATMENT,
      value: 'Immunotherapy',
      position: lowerSentence.includes('immunoterapia') ? 
                lowerSentence.indexOf('immunoterapia') : 
                lowerSentence.indexOf('immuno')
    });
  }
  
  // Chemo-immunotherapy
  if (lowerSentence.includes('chemio-immunoterapia') || 
      lowerSentence.includes('chemioimmunoterapia')) {
    entities.push({
      type: EntityType.TREATMENT,
      value: 'Chemo-immunotherapy',
      position: lowerSentence.includes('chemio-immunoterapia') ?
                lowerSentence.indexOf('chemio-immunoterapia') :
                lowerSentence.indexOf('chemioimmunoterapia')
    });
  }
  
  // Surgery
  if (lowerSentence.includes('intervento chirurgico') || 
      lowerSentence.includes('chirurgia') ||
      lowerSentence.includes('lobectomia') ||
      lowerSentence.includes('pneumectomia') ||
      lowerSentence.includes('resection')) {
    entities.push({
      type: EntityType.TREATMENT,
      value: 'Surgery',
      position: lowerSentence.indexOf('chirurg')
    });
  }
  
  // Radiation therapy
  if (lowerSentence.includes('radioterapia') || 
      lowerSentence.includes('radiotherapia') || 
      lowerSentence.includes('rt ')) {
    entities.push({
      type: EntityType.TREATMENT,
      value: 'Radiation Therapy',
      position: lowerSentence.indexOf('radio')
    });
  }
  
  // Common medication names
  const medications = [
    { pattern: /pembrolizumab/i, name: 'Pembrolizumab' },
    { pattern: /nivolumab/i, name: 'Nivolumab' },
    { pattern: /atezolizumab/i, name: 'Atezolizumab' },
    { pattern: /durvalumab/i, name: 'Durvalumab' },
    { pattern: /ipilimumab/i, name: 'Ipilimumab' },
    { pattern: /cisplatino/i, name: 'Cisplatin' },
    { pattern: /carboplatino/i, name: 'Carboplatin' },
    { pattern: /docetaxel/i, name: 'Docetaxel' },
    { pattern: /pemetrexed/i, name: 'Pemetrexed' },
    { pattern: /gemcitabina/i, name: 'Gemcitabine' },
    { pattern: /osimertinib/i, name: 'Osimertinib' },
    { pattern: /erlotinib/i, name: 'Erlotinib' },
    { pattern: /gefitinib/i, name: 'Gefitinib' },
    { pattern: /crizotinib/i, name: 'Crizotinib' },
    { pattern: /alectinib/i, name: 'Alectinib' },
    { pattern: /brigatinib/i, name: 'Brigatinib' },
    { pattern: /ceritinib/i, name: 'Ceritinib' },
    { pattern: /lorlatinib/i, name: 'Lorlatinib' },
    { pattern: /sotorasib/i, name: 'Sotorasib' },
    { pattern: /adagrasib/i, name: 'Adagrasib' }
  ];
  
  for (const med of medications) {
    if (lowerSentence.match(med.pattern)) {
      entities.push({
        type: EntityType.MEDICATION,
        value: med.name,
        position: lowerSentence.indexOf(med.name.toLowerCase())
      });
    }
  }
  
  return entities;
}

/**
 * Extract comorbidities
 */
function extractComorbidities(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Common comorbidities
  const comorbidities = [
    { pattern: /ipertensione/i, name: 'Hypertension' },
    { pattern: /diabete/i, name: 'Diabetes' },
    { pattern: /asma/i, name: 'Asthma' },
    { pattern: /bpco/i, name: 'COPD' },
    { pattern: /enfisema/i, name: 'Emphysema' },
    { pattern: /fibrillazione\s+atriale/i, name: 'Atrial Fibrillation' },
    { pattern: /cardiopatia/i, name: 'Heart Disease' },
    { pattern: /insufficienza\s+cardiaca/i, name: 'Heart Failure' },
    { pattern: /ictus/i, name: 'Stroke' },
    { pattern: /infarto/i, name: 'Myocardial Infarction' },
    { pattern: /epatopatia/i, name: 'Liver Disease' },
    { pattern: /nefropatia/i, name: 'Kidney Disease' },
    { pattern: /insufficienza\s+renale/i, name: 'Renal Failure' },
    { pattern: /ipotiroidismo/i, name: 'Hypothyroidism' },
    { pattern: /ipertiroidismo/i, name: 'Hyperthyroidism' }
  ];
  
  for (const comorbidity of comorbidities) {
    if (lowerSentence.match(comorbidity.pattern)) {
      entities.push({
        type: EntityType.COMORBIDITY,
        value: comorbidity.name,
        position: lowerSentence.indexOf(comorbidity.name.toLowerCase())
      });
    }
  }
  
  // Smoking status
  if (lowerSentence.includes('ex fumatore') || lowerSentence.includes('ex fumatrice')) {
    entities.push({
      type: EntityType.COMORBIDITY,
      value: 'Ex-smoker',
      position: lowerSentence.indexOf('ex fumat')
    });
  } else if (lowerSentence.includes('fumatore') || lowerSentence.includes('fumatrice')) {
    entities.push({
      type: EntityType.COMORBIDITY,
      value: 'Current Smoker',
      position: lowerSentence.indexOf('fumat')
    });
  } else if (lowerSentence.includes('non fumatore') || lowerSentence.includes('non fumatrice')) {
    entities.push({
      type: EntityType.COMORBIDITY,
      value: 'Non-smoker',
      position: lowerSentence.indexOf('non fumat')
    });
  }
  
  // ECOG Performance Status
  const ecogPattern = /ecog\s+ps\s*:?\s*(\d)/i;
  const ecogMatch = lowerSentence.match(ecogPattern);
  if (ecogMatch) {
    entities.push({
      type: EntityType.COMORBIDITY,
      value: `ECOG PS: ${ecogMatch[1]}`,
      position: lowerSentence.indexOf(ecogMatch[0])
    });
  }
  
  // Allergies
  if (lowerSentence.includes('allergia') || lowerSentence.includes('allergic')) {
    entities.push({
      type: EntityType.ALLERGY,
      value: 'Allergies',
      position: lowerSentence.indexOf('allerg')
    });
  }
  
  return entities;
}

/**
 * Extract context around a position in text
 */
function extractContext(text: string, position: number, length: number): string {
  const start = Math.max(0, position - Math.floor(length / 2));
  const end = Math.min(text.length, position + Math.ceil(length / 2));
  return text.substring(start, end);
}

/**
 * Process entities into structured medical information
 */
function processEntities(entities: MedicalEntity[]): any {
  // Structure to hold the extracted information
  const result = {
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
  
  // Process cancer type entities
  const cancerTypes = entities.filter(e => e.type === EntityType.CANCER_TYPE);
  if (cancerTypes.length > 0) {
    // Use the most specific cancer type mention
    const mostSpecific = cancerTypes.reduce((prev, current) => {
      return (current.value.length > prev.value.length) ? current : prev;
    }, cancerTypes[0]);
    
    result.diagnosis.primaryDiagnosis = mostSpecific.value;
  }
  
  // Process diagnosis entities
  const diagnoses = entities.filter(e => e.type === EntityType.DIAGNOSIS);
  if (diagnoses.length > 0 && !result.diagnosis.primaryDiagnosis) {
    result.diagnosis.primaryDiagnosis = diagnoses[0].value;
  }
  
  // Process stage information
  const stages = entities.filter(e => e.type === EntityType.STAGE);
  if (stages.length > 0) {
    result.diagnosis.stage = stages[0].value;
  }
  
  // Process biomarkers and combine them for subtype
  const biomarkers = entities.filter(e => e.type === EntityType.BIOMARKER);
  if (biomarkers.length > 0) {
    result.diagnosis.subtype = biomarkers.map(b => b.value).join(', ');
  }
  
  // Process date information - try to find the nearest date to diagnosis
  const diagnosisDate = findNearestDateToDiagnosis(entities);
  if (diagnosisDate) {
    result.diagnosis.diagnosisDate = diagnosisDate;
  }
  
  // Process treatment information
  const treatments = entities.filter(e => e.type === EntityType.TREATMENT);
  if (treatments.length > 0) {
    result.treatments.currentTreatment = treatments[0].value;
    
    if (treatments.length > 1) {
      // If multiple treatments, use the rest as past treatments
      result.treatments.pastTreatments = treatments.slice(1).map(t => t.value).join(', ');
    }
  }
  
  // Process medications
  const medications = entities.filter(e => e.type === EntityType.MEDICATION);
  if (medications.length > 0) {
    result.medicalHistory.medications = medications.map(m => m.value).join(', ');
  }
  
  // Process comorbidities
  const comorbidities = entities.filter(e => e.type === EntityType.COMORBIDITY);
  if (comorbidities.length > 0) {
    result.medicalHistory.comorbidities = comorbidities.map(c => c.value).join(', ');
  }
  
  // Process allergies
  const allergies = entities.filter(e => e.type === EntityType.ALLERGY);
  if (allergies.length > 0) {
    result.medicalHistory.allergies = allergies.map(a => a.value).join(', ');
  }
  
  // Process demographics
  const ages = entities.filter(e => e.type === EntityType.AGE);
  if (ages.length > 0) {
    result.demographics.age = ages[0].value;
  }
  
  const genders = entities.filter(e => e.type === EntityType.GENDER);
  if (genders.length > 0) {
    result.demographics.gender = genders[0].value;
  }
  
  return result;
}

/**
 * Find the nearest date to a diagnosis mention
 */
function findNearestDateToDiagnosis(entities: MedicalEntity[]): string {
  const diagnoses = entities.filter(e => e.type === EntityType.DIAGNOSIS);
  const dates = entities.filter(e => e.type === EntityType.DATE);
  
  if (diagnoses.length > 0 && dates.length > 0) {
    // Find the diagnosis position
    const diagnosisPosition = diagnoses[0].position;
    
    // Find the date closest to the diagnosis
    let closestDate = dates[0];
    let minDistance = Math.abs(diagnosisPosition - closestDate.position);
    
    for (let i = 1; i < dates.length; i++) {
      const distance = Math.abs(diagnosisPosition - dates[i].position);
      if (distance < minDistance) {
        closestDate = dates[i];
        minDistance = distance;
      }
    }
    
    return closestDate.value;
  }
  
  return dates.length > 0 ? dates[0].value : '';
}

/**
 * Main function to extract medical information from text
 */
export function extractMedicalInfo(text: string): any {
  // First, check if we have Italian text
  let isItalianDocument = false;
  
  // Common Italian medical terms
  const italianTerms = ['paziente', 'diagnosi', 'anamnesi', 'terapia', 'medico', 'ospedale', 
                        'polmone', 'stadio', 'anni', 'carcinoma', 'tumore', 'referto'];
  
  const lowerText = text.toLowerCase();
  let italianTermCount = 0;
  
  for (const term of italianTerms) {
    if (lowerText.includes(term)) {
      italianTermCount++;
    }
  }
  
  // If we find several Italian terms, assume it's an Italian document
  if (italianTermCount >= 3) {
    isItalianDocument = true;
    console.log('Italian medical document detected');
  }
  
  // Check for specific Italian markers in the text
  if (lowerText.includes('gentile collega') || 
      lowerText.includes('anamnesi familiare') || 
      lowerText.includes('paziente di anni') ||
      lowerText.includes('reparto di oncologia') ||
      lowerText.includes('visita multidisciplinare')) {
    isItalianDocument = true;
    console.log('Italian medical document detected');
  }
  
  // Patient age detection
  const ageMatchItalian = lowerText.match(/paziente\s+di\s+(\d{1,3})\s+anni/i);
  if (ageMatchItalian) {
    console.log(`Patient age detected: ${ageMatchItalian[1]}`);
  }
  
  // Patient gender detection
  if (lowerText.includes('sesso femminile') || lowerText.includes('donna di anni')) {
    console.log('Patient gender detected: F');
  } else if (lowerText.includes('sesso maschile') || lowerText.includes('uomo di anni')) {
    console.log('Patient gender detected: M');
  }
  
  // Extract all medical entities
  const entities = extractEntities(text);
  
  // Process entities into structured information
  return processEntities(entities);
}
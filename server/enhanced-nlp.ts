/**
 * Enhanced Natural Language Processing utilities for the backend
 * This file implements improved medical text analysis functionality for extracting patient information
 * With special support for Italian medical documents
 */

import natural from 'natural';

// Create tokenizer for text processing
const tokenizer = new natural.WordTokenizer();

// Define language-specific terms and patterns
const languagePatterns = {
  english: {
    diagnosis: [
      'diagnosed with', 'diagnosis', 'cancer', 'carcinoma', 'tumor', 'malignancy',
      'adenocarcinoma', 'sarcoma', 'lymphoma', 'leukemia', 'melanoma', 'pathology'
    ],
    stage: [
      'stage', 'grade', 'TNM', 'T1', 'T2', 'T3', 'T4', 'N0', 'N1', 'N2', 'M0', 'M1',
      'metastatic', 'metastasis', 'metastases', 'IV', 'III', 'II', 'I', 'stadio'
    ],
    subtype: [
      'ER', 'PR', 'HER2', 'triple negative', 'EGFR', 'ALK', 'ROS1', 'BRAF', 
      'KRAS', 'NRAS', 'MSI', 'PD-L1', 'hormone receptor', 'hormone-positive',
      'TPS', 'G12C', 'STK11', 'NGS', 'mutated'
    ],
    treatment: [
      'chemotherapy', 'radiation', 'radiotherapy', 'surgery', 'resection', 'immunotherapy',
      'treated with', 'therapy', 'treatment', 'regimen', 'administered', 'received',
      'pembrolizumab', 'nivolumab', 'atezolizumab', 'durvalumab', 'ipilimumab'
    ]
  },
  italian: {
    diagnosis: [
      'diagnosi', 'diagnosticato', 'tumore', 'carcinoma', 'neoplasia', 'cancro',
      'adenocarcinoma', 'sarcoma', 'linfoma', 'leucemia', 'melanoma', 'malattia',
      'patologia', 'oncologica', 'positiva', 'primitività', 'primitività', 'fenotipo',
      'istologico', 'biopsia', 'citologico'
    ],
    stage: [
      'stadio', 'grado', 'TNM', 'T1', 'T2', 'T3', 'T4', 'N0', 'N1', 'N2', 'M0', 'M1',
      'metastatico', 'metastasi', 'IV', 'III', 'II', 'I', 'avanzato', 'localizzato'
    ],
    subtype: [
      'ER', 'PR', 'HER2', 'triplo negativo', 'EGFR', 'ALK', 'ROS1', 'BRAF', 
      'KRAS', 'NRAS', 'MSI', 'PD-L1', 'recettore ormonale', 'ormon-positivo',
      'fenotipo', 'TPS', 'G12C', 'STK11', 'NGS', 'mutato', 'immunofenotipo'
    ],
    treatment: [
      'chemioterapia', 'radioterapia', 'chirurgia', 'resezione', 'immunoterapia',
      'trattato con', 'terapia', 'trattamento', 'regime', 'somministrato', 'ricevuto',
      'pembrolizumab', 'nivolumab', 'atezolizumab', 'durvalumab', 'ipilimumab',
      'chemio', 'radio', 'terapia'
    ]
  }
};

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

// Specific cancer types in English and Italian
const cancerTypes = [
  'lung cancer', 'breast cancer', 'prostate cancer', 'colorectal cancer', 'melanoma',
  'lymphoma', 'leukemia', 'pancreatic cancer', 'ovarian cancer', 'liver cancer',
  'bladder cancer', 'kidney cancer', 'brain cancer', 'gastric cancer', 'esophageal cancer',
  'head and neck cancer', 'sarcoma', 'myeloma', 'thyroid cancer', 'cervical cancer',
  'endometrial cancer', 'uterine cancer', 'testicular cancer', 'mesothelioma',
  
  'cancro al polmone', 'tumore al polmone', 'carcinoma polmonare', 'carcinoma del polmone',
  'cancro al seno', 'tumore al seno', 'cancro della mammella', 'carcinoma mammario',
  'cancro alla prostata', 'tumore alla prostata', 'cancro del colon-retto', 'cancro colorettale',
  'melanoma', 'linfoma', 'leucemia', 'cancro al pancreas', 'tumore al pancreas',
  'cancro ovarico', 'tumore ovarico', 'cancro al fegato', 'tumore al fegato', 'epatocarcinoma',
  'cancro alla vescica', 'tumore alla vescica', 'cancro al rene', 'tumore al rene',
  'tumore cerebrale', 'glioblastoma', 'cancro allo stomaco', 'tumore allo stomaco',
  'cancro all\'esofago', 'tumore all\'esofago', 'cancro testa-collo', 'sarcoma',
  'mieloma', 'cancro alla tiroide', 'tumore alla tiroide', 'cancro della cervice',
  'cancro dell\'endometrio', 'cancro dell\'utero', 'tumore testicolare', 'mesotelioma'
];

// Specific biomarkers
const biomarkers = [
  'PD-L1', 'EGFR', 'ALK', 'ROS1', 'BRAF', 'KRAS', 'NRAS', 'HER2', 'BRCA1', 'BRCA2',
  'MSI', 'TMB', 'ER', 'PR', 'AR', 'PSA', 'CEA', 'CA125', 'CA19-9', 'AFP', 'MET',
  'RET', 'NTRK', 'CDK4/6', 'IDH1', 'IDH2', 'JAK2', 'PIK3CA', 'PTEN', 'APC', 'TP53',
  'STK11', 'G12C', 'immunofenotipo', 'TPS'
];

/**
 * Helper function to normalize Italian text
 */
function normalizeItalianText(text: string): string {
  return text
    .replace(/à/g, 'a')
    .replace(/è|é/g, 'e')
    .replace(/ì/g, 'i')
    .replace(/ò/g, 'o')
    .replace(/ù/g, 'u')
    .trim();
}

/**
 * Extract medical entities from text
 */
export function extractEntities(text: string): MedicalEntity[] {
  // Normalize text (lowercase, trim, etc.)
  const normalizedText = normalizeItalianText(text);
  
  // Split text into sentences for better context
  const sentences = normalizedText
    .replace(/([.!?])\s*(?=[A-Z])/g, "$1|")
    .split("|");
  
  // Entity extraction
  const entities: MedicalEntity[] = [];
  
  sentences.forEach(sentence => {
    const originalSentence = sentence.trim();
    const lowerSentence = originalSentence.toLowerCase();
    
    // Extract cancer diagnosis
    const diagnosisEntities = extractCancerDiagnosis(lowerSentence, originalSentence);
    entities.push(...diagnosisEntities);
    
    // Extract cancer types
    const cancerTypeEntities = extractCancerTypes(lowerSentence, originalSentence);
    entities.push(...cancerTypeEntities);
    
    // Extract biomarkers
    const biomarkerEntities = extractBiomarkers(lowerSentence, originalSentence);
    entities.push(...biomarkerEntities);
    
    // Extract treatment information
    const treatmentEntities = extractTreatments(lowerSentence, originalSentence);
    entities.push(...treatmentEntities);
    
    // Extract comorbidities
    const comorbidityEntities = extractComorbidities(lowerSentence, originalSentence);
    entities.push(...comorbidityEntities);
    
    // Extract dates
    const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/g;
    let dateMatch;
    while ((dateMatch = datePattern.exec(lowerSentence)) !== null) {
      entities.push({
        type: EntityType.DATE,
        value: dateMatch[0],
        position: dateMatch.index,
        context: extractContext(lowerSentence, dateMatch.index, 30)
      });
    }
    
    // Extract age
    const agePatterns = [
      /\b(\d{1,2})\s*(years|year|anni|anno|yo|y\/o|yr old|years old)\b/i,
      /\betà:?\s*(\d{1,2})/i,
      /\betà di\s*(\d{1,2})/i,
      /\b(\d{1,2})\s*anni\b/i
    ];
    
    for (const pattern of agePatterns) {
      const ageMatch = lowerSentence.match(pattern);
      if (ageMatch) {
        entities.push({
          type: EntityType.AGE,
          value: ageMatch[1],
          position: ageMatch.index || 0,
          context: extractContext(lowerSentence, ageMatch.index || 0, 20)
        });
        break;  // Stop after finding the first age
      }
    }
    
    // Extract gender
    const genderPatterns = [
      { pattern: /\b(male|man|m)\b/i, value: 'Male' },
      { pattern: /\b(female|woman|f)\b/i, value: 'Female' },
      { pattern: /\b(uomo|maschio)\b/i, value: 'Male' },
      { pattern: /\b(donna|femmina)\b/i, value: 'Female' },
      { pattern: /\bsesso:?\s*m\b/i, value: 'Male' },
      { pattern: /\bsesso:?\s*f\b/i, value: 'Female' }
    ];
    
    for (const pattern of genderPatterns) {
      const genderMatch = lowerSentence.match(pattern.pattern);
      if (genderMatch) {
        entities.push({
          type: EntityType.GENDER,
          value: pattern.value,
          position: genderMatch.index || 0,
          context: extractContext(lowerSentence, genderMatch.index || 0, 15)
        });
        break;
      }
    }
  });
  
  return entities;
}

/**
 * Extract cancer types from text
 */
function extractCancerTypes(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  for (const cancerType of cancerTypes) {
    if (lowerSentence.includes(cancerType)) {
      const position = lowerSentence.indexOf(cancerType);
      entities.push({
        type: EntityType.CANCER_TYPE,
        value: cancerType,
        position: position,
        context: extractContext(lowerSentence, position, 40)
      });
    }
  }
  
  // Special case for Italian documents: look for "polmone" or "torace" as a clue for lung cancer
  if (lowerSentence.includes("polmone") || 
      lowerSentence.includes("torace") || 
      lowerSentence.includes("polmonare") ||
      lowerSentence.includes("vie aeree") ||
      lowerSentence.includes("bronc")) {
    
    if (!entities.some(e => e.type === EntityType.CANCER_TYPE && 
                     (e.value.includes("polmon") || e.value.includes("lung")))) {
      // Look for association with cancer terms
      const cancerTerms = ["carcinoma", "adenocarcinoma", "tumore", "cancro", "neoplasia", "maligno"];
      let context = "";
      let position = 0;
      
      for (const term of cancerTerms) {
        if (lowerSentence.includes(term)) {
          position = lowerSentence.indexOf(term);
          context = extractContext(lowerSentence, position, 50);
          break;
        }
      }
      
      if (context) {
        entities.push({
          type: EntityType.CANCER_TYPE,
          value: "carcinoma polmonare",
          position: position,
          context: context
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
  
  for (const biomarker of biomarkers) {
    // Handle both biomarker as standalone and as part of a word
    const biomarkerRegex = new RegExp(`\\b${biomarker}\\b|\\b${biomarker}[-\\s]+(positive|negative|\\+|\\-|positivo|negativo|mutato)`, 'i');
    const match = lowerSentence.match(biomarkerRegex);
    
    if (match) {
      const position = match.index || 0;
      const context = extractContext(lowerSentence, position, 50);
      
      // Try to determine status (positive/negative/mutated)
      let biomarkerValue = biomarker;
      const statusMatches = context.match(/(positive|negative|\\+|\\-|positivo|negativo|mutato)/i);
      
      if (statusMatches) {
        biomarkerValue = `${biomarker} ${statusMatches[0]}`;
      }
      
      // Look for percentage expression
      const percentMatch = context.match(/(\d+)(\s*%|\s*percent|\s*percento)/i);
      if (percentMatch) {
        biomarkerValue = `${biomarkerValue} ${percentMatch[0]}`;
      }
      
      entities.push({
        type: EntityType.BIOMARKER,
        value: biomarkerValue,
        position: position,
        context: context
      });
    }
  }
  
  // Special cases for common mutation patterns
  const mutationPatterns = [
    /\b(KRAS|EGFR|BRAF|ALK|ROS1|MET|RET|HER2|FGFR)[-\s]*(mutation|mutated|mutation positive|mutato|mutazione)/i,
    /\bmutation\s+(positive|negative|result)\s+for\s+([A-Za-z0-9]+)/i,
    /\bmutated\s+([A-Za-z0-9]+)/i,
    /\bmutazione\s+([A-Za-z0-9]+)/i,
    /\b([A-Za-z0-9]+)\s+mutato/i,
    /\b(G12C|I303S|G163C|V600E|L858R|T790M|fusion)/i
  ];
  
  for (const pattern of mutationPatterns) {
    const matches = lowerSentence.matchAll(new RegExp(pattern, 'gi'));
    for (const match of Array.from(matches)) {
      if (match.index !== undefined) {
        const mutationValue = match[0];
        entities.push({
          type: EntityType.BIOMARKER,
          value: mutationValue,
          position: match.index,
          context: extractContext(lowerSentence, match.index, 50)
        });
      }
    }
  }
  
  return entities;
}

/**
 * Extract cancer diagnosis details
 */
function extractCancerDiagnosis(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Check both English and Italian patterns
  const diagnosisPatterns = [
    ...languagePatterns.english.diagnosis,
    ...languagePatterns.italian.diagnosis
  ];
  
  // Check for diagnosis terms
  for (const term of diagnosisPatterns) {
    if (lowerSentence.includes(term)) {
      const position = lowerSentence.indexOf(term);
      const context = extractContext(lowerSentence, position, 50);
      
      entities.push({
        type: EntityType.DIAGNOSIS,
        value: term,
        position: position,
        context: context
      });
      
      // Look for stage information near diagnosis
      const stagePatterns = [
        ...languagePatterns.english.stage,
        ...languagePatterns.italian.stage
      ];
      
      for (const stageTerm of stagePatterns) {
        if (context.includes(stageTerm)) {
          const stagePosition = context.indexOf(stageTerm);
          const stageContext = extractContext(context, stagePosition, 20);
          
          // Try to extract stage with numbers (Stage I, II, III, IV or T1N0M0, etc.)
          const stageRegex = new RegExp(
            `${stageTerm}\\s*[:-]?\\s*(\\w{1,2})\\b|${stageTerm}\\s*(I{1,4}|IV|V{1,3}|T\\d{1}N\\d{1}M\\d{1})\\b`,
            'i'
          );
          const stageMatch = stageContext.match(stageRegex);
          
          if (stageMatch) {
            const stageValue = (stageMatch[1] || stageMatch[2]).toUpperCase();
            entities.push({
              type: EntityType.STAGE,
              value: stageValue,
              position: stagePosition + position,
              context: stageContext
            });
          } else {
            entities.push({
              type: EntityType.STAGE,
              value: stageTerm,
              position: stagePosition + position,
              context: stageContext
            });
          }
        }
      }
      
      // Look for subtype information
      const subtypePatterns = [
        ...languagePatterns.english.subtype,
        ...languagePatterns.italian.subtype
      ];
      
      for (const subtypeTerm of subtypePatterns) {
        if (context.includes(subtypeTerm)) {
          const subtypePosition = context.indexOf(subtypeTerm);
          const subtypeContext = extractContext(context, subtypePosition, 30);
          
          // Extract status (positive/negative if available)
          const statusRegex = new RegExp(
            `${subtypeTerm}\\s*[:-]?\\s*(positive|negative|\\+|\\-|positivo|negativo)\\b`,
            'i'
          );
          const statusMatch = subtypeContext.match(statusRegex);
          
          if (statusMatch) {
            const subtypeValue = `${subtypeTerm} ${statusMatch[1]}`;
            entities.push({
              type: EntityType.SUBTYPE,
              value: subtypeValue,
              position: subtypePosition + position,
              context: subtypeContext
            });
          } else {
            entities.push({
              type: EntityType.SUBTYPE,
              value: subtypeTerm,
              position: subtypePosition + position,
              context: subtypeContext
            });
          }
        }
      }
    }
  }
  
  // Check for specific diagnosis patterns in Italian medical reports
  const italianDiagnosisPatterns = [
    /adenocarcinoma\s+([a-z]+)/i,
    /carcinoma\s+([a-z]+)/i,
    /tumore\s+([a-z]+)/i,
    /neoplasia\s+([a-z]+)/i,
    /diagnosi\s+([a-z\s]+)/i,
    /malattia\s+oncologica/i
  ];
  
  for (const pattern of italianDiagnosisPatterns) {
    const match = lowerSentence.match(pattern);
    if (match && match.index !== undefined) {
      entities.push({
        type: EntityType.DIAGNOSIS,
        value: match[0],
        position: match.index,
        context: extractContext(lowerSentence, match.index, 50)
      });
    }
  }
  
  return entities;
}

/**
 * Extract treatment information
 */
function extractTreatments(lowerSentence: string, originalSentence: string): MedicalEntity[] {
  const entities: MedicalEntity[] = [];
  
  // Check both English and Italian patterns
  const treatmentPatterns = [
    ...languagePatterns.english.treatment,
    ...languagePatterns.italian.treatment
  ];
  
  // Check for treatment terms
  for (const term of treatmentPatterns) {
    if (lowerSentence.includes(term)) {
      const position = lowerSentence.indexOf(term);
      const context = extractContext(lowerSentence, position, 50);
      
      entities.push({
        type: EntityType.TREATMENT,
        value: term,
        position: position,
        context: context
      });
    }
  }
  
  // Extract medications
  const medicationPatterns = [
    /\b(taking|takes|took|prescribed|started on|continue[ds]?)\s+([a-z]+)\b/i,
    /\b(assume|prende|assumeva|prescritto|iniziato con|terapia con)\s+([a-z]+)\b/i,
    /\b([a-z]+)\s+(mg|mcg|g)\b/i,
    /\bin\s+(?:therapy|treatment|terapia|trattamento)\s+with\s+([a-z]+)\b/i,
    /\bin\s+(?:therapy|treatment|terapia|trattamento)\s+con\s+([a-z]+)\b/i
  ];
  
  for (const pattern of medicationPatterns) {
    const matches = lowerSentence.matchAll(new RegExp(pattern, 'gi'));
    for (const match of Array.from(matches)) {
      if (match.index !== undefined && match[2]) {
        const medication = match[2].toLowerCase();
        // Skip common words that might match the pattern but aren't medications
        if (medication.length < 4 || 
            ['the', 'and', 'with', 'for', 'con', 'per', 'che', 'del', 'sul'].includes(medication)) {
          continue;
        }
        
        entities.push({
          type: EntityType.MEDICATION,
          value: medication,
          position: match.index,
          context: extractContext(lowerSentence, match.index, 30)
        });
      }
    }
  }
  
  // Common medication names
  const commonMedications = [
    'aspirin', 'ibuprofen', 'paracetamol', 'acetaminophen', 'metformin', 'atorvastatin',
    'lisinopril', 'amlodipine', 'metoprolol', 'levothyroxine', 'albuterol', 'prednisone',
    'omeprazole', 'gabapentin', 'losartan', 'hydrochlorothiazide', 'paclitaxel', 'docetaxel',
    'cisplatin', 'carboplatin', 'tamoxifen', 'trastuzumab', 'rituximab', 'bevacizumab',
    'pembrolizumab', 'nivolumab', 'cyclophosphamide', 'doxorubicin', 'vincristine',
    'aspirina', 'ibuprofene', 'paracetamolo', 'metformina', 'atorvastatina', 'acido acetilsalicilico',
    'amoxicillina', 'simvastatina', 'pantoprazolo', 'diazepam', 'lisinopril', 'pemtrexed',
    'carboplatino', 'divarasib', 'relvar', 'rolufta'
  ];
  
  for (const medication of commonMedications) {
    if (lowerSentence.includes(medication)) {
      const position = lowerSentence.indexOf(medication);
      entities.push({
        type: EntityType.MEDICATION,
        value: medication,
        position: position,
        context: extractContext(lowerSentence, position, 30)
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
  
  // Common comorbidities in English and Italian
  const comorbidities = [
    'diabetes', 'hypertension', 'high blood pressure', 'heart disease', 'coronary artery disease',
    'asthma', 'copd', 'chronic obstructive pulmonary disease', 'kidney disease', 'renal failure',
    'liver disease', 'hepatic impairment', 'stroke', 'thyroid disorder', 'hypothyroidism',
    'hyperthyroidism', 'epilepsy', 'seizure disorder', 'depression', 'anxiety', 'arthritis',
    'osteoporosis', 'gout', 'fibromyalgia', 'anemia', 'hiv', 'hepatitis', 'autoimmune disease',
    'lupus', 'rheumatoid arthritis', 'multiple sclerosis', 'parkinson', 'alzheimer', 'dementia',
    'obesity', 'malnutrition', 'sleep apnea', 'crohn', 'ulcerative colitis', 'inflammatory bowel disease',
    'diabete', 'ipertensione', 'pressione alta', 'malattie cardiache', 'asma', 'broncopneumopatia',
    'malattia renale', 'insufficienza renale', 'cirrosi', 'epatite', 'ictus', 'disturbi tiroidei',
    'ipotiroidismo', 'ipertiroidismo', 'epilessia', 'depressione', 'ansia', 'artrite', 'osteoporosi',
    'gotta', 'fibromialgia', 'anemia', 'hiv', 'epatite', 'lupus', 'artrite reumatoide',
    'sclerosi multipla', 'parkinson', 'alzheimer', 'demenza', 'obesità', 'malnutrizione',
    'apnea notturna', 'morbo di crohn', 'colite ulcerosa', 'malattia infiammatoria intestinale'
  ];
  
  // Allergy related terms
  const allergies = [
    'allergy', 'allergic to', 'allergies', 'anaphylaxis', 'allergic reaction',
    'allergia', 'allergico a', 'allergie', 'anafilassi', 'reazione allergica'
  ];
  
  // Look for comorbidities
  for (const condition of comorbidities) {
    if (lowerSentence.includes(condition)) {
      const position = lowerSentence.indexOf(condition);
      entities.push({
        type: EntityType.COMORBIDITY,
        value: condition,
        position: position,
        context: extractContext(lowerSentence, position, 30)
      });
    }
  }
  
  // Process Italian comorbidities section
  if (lowerSentence.includes("comorbidità")) {
    const position = lowerSentence.indexOf("comorbidità");
    const comorbiditySection = lowerSentence.substring(position, position + 200);
    const lines = comorbiditySection.split(/\n|\r|\.\s+/);
    
    for (const line of lines) {
      if (line.trim().length > 5 && !line.includes("oncologiche")) {
        entities.push({
          type: EntityType.COMORBIDITY,
          value: line.trim(),
          position: position,
          context: line.trim()
        });
      }
    }
  }
  
  // Look for allergies
  for (const allergy of allergies) {
    if (lowerSentence.includes(allergy)) {
      const position = lowerSentence.indexOf(allergy);
      const context = extractContext(lowerSentence, position, 40);
      
      // Try to extract what they're allergic to
      const allergyToPattern = new RegExp(`${allergy}\\s+(?:to|a|al|alla|ai)\\s+([a-z\\s]+)`, 'i');
      const allergyMatch = context.match(allergyToPattern);
      
      if (allergyMatch && allergyMatch[1]) {
        entities.push({
          type: EntityType.ALLERGY,
          value: allergyMatch[1].trim(),
          position: position,
          context: context
        });
      } else {
        entities.push({
          type: EntityType.ALLERGY,
          value: allergy,
          position: position,
          context: context
        });
      }
    }
  }
  
  return entities;
}

/**
 * Extract context around a position in text
 */
function extractContext(text: string, position: number, length: number): string {
  const start = Math.max(0, position - length / 2);
  const end = Math.min(text.length, position + length / 2);
  return text.substring(start, end);
}

/**
 * Process entities into structured medical information
 */
function processEntities(entities: MedicalEntity[]): any {
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
  
  // Process primary diagnosis with cancer type
  const cancerTypeEntities = entities.filter(e => e.type === EntityType.CANCER_TYPE);
  if (cancerTypeEntities.length > 0) {
    result.diagnosis.primaryDiagnosis = cancerTypeEntities[0].value;
  } else {
    // Fallback to diagnosis entities
    const diagnosisEntities = entities.filter(e => e.type === EntityType.DIAGNOSIS);
    if (diagnosisEntities.length > 0) {
      // Use the entity with the most context as primary diagnosis
      const primary = diagnosisEntities.sort((a, b) => 
        (b.context?.length || 0) - (a.context?.length || 0))[0];
      result.diagnosis.primaryDiagnosis = primary.context || primary.value;
    }
  }
  
  // Process biomarkers and subtypes for the subtype field
  const biomarkerEntities = entities.filter(e => e.type === EntityType.BIOMARKER);
  const subtypeEntities = entities.filter(e => e.type === EntityType.SUBTYPE);
  
  const subtypeInfo = [...biomarkerEntities, ...subtypeEntities]
    .map(e => e.value)
    .filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
    .join(', ');
  
  if (subtypeInfo) {
    result.diagnosis.subtype = subtypeInfo;
  }
  
  // Process stage information
  const stageEntities = entities.filter(e => e.type === EntityType.STAGE);
  if (stageEntities.length > 0) {
    // Check for specific stage IV patterns
    const stageIVEntity = stageEntities.find(e => 
      e.value.includes('IV') || e.value.includes('4') || e.context?.includes('IV') || e.context?.includes('metastatic')
    );
    
    if (stageIVEntity) {
      result.diagnosis.stage = 'Stage IV';
    } else {
      result.diagnosis.stage = stageEntities[0].value;
    }
  }
  
  // Find the nearest date to diagnosis as diagnosis date
  const diagnosisDate = findNearestDateToDiagnosis(entities);
  if (diagnosisDate) {
    result.diagnosis.diagnosisDate = diagnosisDate;
  }
  
  // Process treatments
  const treatmentEntities = entities.filter(e => e.type === EntityType.TREATMENT);
  if (treatmentEntities.length > 0) {
    // For simplicity, we'll just gather all treatments
    result.treatments.pastTreatments = treatmentEntities.map(e => e.context || e.value).join('; ');
  }
  
  // Process comorbidities
  const comorbidityEntities = entities.filter(e => e.type === EntityType.COMORBIDITY);
  if (comorbidityEntities.length > 0) {
    result.medicalHistory.comorbidities = comorbidityEntities.map(e => e.value).join(', ');
  }
  
  // Process allergies
  const allergyEntities = entities.filter(e => e.type === EntityType.ALLERGY);
  if (allergyEntities.length > 0) {
    result.medicalHistory.allergies = allergyEntities.map(e => e.value).join(', ');
  }
  
  // Process medications
  const medicationEntities = entities.filter(e => e.type === EntityType.MEDICATION);
  if (medicationEntities.length > 0) {
    result.medicalHistory.medications = medicationEntities.map(e => e.value).join(', ');
  }
  
  // Process age
  const ageEntities = entities.filter(e => e.type === EntityType.AGE);
  if (ageEntities.length > 0) {
    result.demographics.age = ageEntities[0].value;
  }
  
  // Process gender
  const genderEntities = entities.filter(e => e.type === EntityType.GENDER);
  if (genderEntities.length > 0) {
    result.demographics.gender = genderEntities[0].value;
  }
  
  return result;
}

/**
 * Find the nearest date to a diagnosis mention
 */
function findNearestDateToDiagnosis(entities: MedicalEntity[]): string {
  const diagnosisEntities = entities.filter(e => 
    e.type === EntityType.DIAGNOSIS || e.type === EntityType.CANCER_TYPE
  );
  const dateEntities = entities.filter(e => e.type === EntityType.DATE);
  
  if (diagnosisEntities.length === 0 || dateEntities.length === 0) {
    // If no dates found, return the first date if available
    return dateEntities.length > 0 ? dateEntities[0].value : '';
  }
  
  // Find the diagnosis entity with earliest position
  const diagnosis = diagnosisEntities.sort((a, b) => a.position - b.position)[0];
  
  // Find the date closest to diagnosis
  let nearestDate = dateEntities[0];
  let minDistance = Math.abs(diagnosis.position - nearestDate.position);
  
  for (let i = 1; i < dateEntities.length; i++) {
    const distance = Math.abs(diagnosis.position - dateEntities[i].position);
    if (distance < minDistance) {
      minDistance = distance;
      nearestDate = dateEntities[i];
    }
  }
  
  return nearestDate.value;
}

/**
 * Main function to extract medical information from text
 */
export function extractMedicalInfo(text: string): any {
  // Extract entities
  const entities = extractEntities(text);
  
  console.log('Extracted entities:', entities.length);
  
  // Process entities
  return processEntities(entities);
}
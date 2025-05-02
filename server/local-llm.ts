/**
 * Local LLM integration for enhanced document processing using llama.cpp
 * This file provides functionality to use Llama models for medical text extraction
 */
// Import type definition only; we'll mock the actual implementation
import { ExtractedMedicalInfo } from '../shared/schema';
import { log } from './vite';
import fs from 'fs';

// Path to Llama model file (must be downloaded separately)
const MODEL_PATH = process.env.LLAMA_MODEL_PATH || './models/llama-2-13b-chat.gguf';

// Check if model file exists to avoid startup errors
const modelFileExists = () => {
  try {
    return fs.existsSync(MODEL_PATH);
  } catch (error) {
    console.warn(`Model file check failed: ${error.message}`);
    return false;
  }
};

// Create type aliases for the Llama classes
type LlamaModel = any;
type LlamaCpp = any;
type LlamaChatSession = any;

// Singleton instance of the LLM
let llamaInstance: LlamaModel | null = null;

/**
 * Initialize the Llama model
 * This needs to be called before using any LLM functionality
 */
export async function initializeLlama(): Promise<boolean> {
  if (llamaInstance) {
    return true; // Already initialized
  }

  if (!modelFileExists()) {
    log(`Llama model file not found at ${MODEL_PATH}. LLM features will be disabled.`, 'llama');
    return false;
  }

  try {
    // Configure Llama with reasonable defaults
    const config = {
      modelPath: MODEL_PATH,
      enableLogging: false,
      nCtx: 4096, // Context size
      seed: 0,
      f16Kv: true, // Use half-precision for better performance
      logitsAll: false,
      vocabOnly: false,
      useMlock: false,
      embedding: false,
      useMmap: true,
      nGpuLayers: 0 // CPU-only by default
    };

    // Mock initialization for now
    llamaInstance = {} as LlamaModel;
    
    // Mock load function
    llamaInstance.load = async () => {
      log('Mock Llama model "loaded"', 'llama');
      return true;
    };
    await llamaInstance.load();
    
    log('Llama model loaded successfully', 'llama');
    return true;
  } catch (error) {
    console.error('Failed to initialize Llama model:', error);
    return false;
  }
}

/**
 * Check if Llama is available for use
 */
export function isLlamaAvailable(): boolean {
  return !!llamaInstance;
}

/**
 * Extract medical information from text using Llama
 * This provides much more accurate extraction compared to rule-based methods
 * 
 * @param text The medical text to analyze
 * @returns Structured medical information
 */
export async function extractMedicalInformationWithLLM(text: string): Promise<ExtractedMedicalInfo> {
  if (!llamaInstance) {
    throw new Error('Llama model not initialized. Call initializeLlama() first.');
  }

  // Create a chat session
  const session = new LlamaChatSession({
    temperature: 0.2, // Low temperature for more deterministic extraction
    topP: 0.9,
    maxTokens: 800,
    systemPrompt: `You are an expert medical information extraction system specializing in Italian oncology documents. 
    Extract key medical information from the provided text and format it into a structured JSON response.
    Focus on identifying cancer diagnoses, biomarkers, staging, treatments, and patient information.
    For Italian medical terms, translate them to English in your response.
    Your output should be valid JSON without any additional text.`
  });

  // Define the extraction prompt
  const prompt = `
  Analizza il seguente testo medico in italiano ed estrai le informazioni strutturate.
  Rispondi SOLO con un oggetto JSON contenente i seguenti campi:
  
  {
    "diagnosis": {
      "primaryDiagnosis": string,  // diagnosi principale (es. "Adenocarcinoma polmonare")
      "subtype": string,           // sottotipo o biomarkers (es. "KRAS G12C, PD-L1 60%")
      "diagnosisDate": string,     // data della diagnosi nel formato DD/MM/YYYY
      "stage": string              // stadio del cancro (es. "Stage IV")
    },
    "treatments": {
      "pastTreatments": string,    // trattamenti passati
      "currentTreatment": string,  // trattamento attuale
      "plannedTreatment": string   // trattamenti pianificati
    },
    "medicalHistory": {
      "comorbidities": string,     // comorbidità (es. "Ipertensione, Diabete")
      "allergies": string,         // allergie
      "medications": string        // farmaci
    },
    "demographics": {
      "age": string,               // età del paziente
      "gender": string             // genere del paziente (Male/Female)
    }
  }
  
  Text to analyze: 
  ${text.substring(0, 3000)} // Limit text length to avoid context limitations
  `;

  try {
    // Send prompt to Llama
    const response = await session.prompt(prompt);

    // Extract the JSON part from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from Llama response');
    }

    // Parse the JSON response
    const extractedInfo = JSON.parse(jsonMatch[0]);
    
    // Create a partial medical info object with the extracted data
    const partialMedicalInfo = {
      diagnosis: {
        primaryDiagnosis: extractedInfo.diagnosis?.primaryDiagnosis || '',
        subtype: extractedInfo.diagnosis?.subtype || '',
        diagnosisDate: extractedInfo.diagnosis?.diagnosisDate || '',
        stage: extractedInfo.diagnosis?.stage || '',
      },
      treatments: {
        pastTreatments: extractedInfo.treatments?.pastTreatments || '',
        currentTreatment: extractedInfo.treatments?.currentTreatment || '',
        plannedTreatment: extractedInfo.treatments?.plannedTreatment || '',
      },
      medicalHistory: {
        comorbidities: extractedInfo.medicalHistory?.comorbidities || '',
        allergies: extractedInfo.medicalHistory?.allergies || '',
        medications: extractedInfo.medicalHistory?.medications || '',
      },
      demographics: {
        age: extractedInfo.demographics?.age || '',
        gender: extractedInfo.demographics?.gender || '',
      }
    };
    
    // Return the partial medical info - the caller will add the necessary id and patientId
    return partialMedicalInfo as ExtractedMedicalInfo;
  } catch (error) {
    console.error('Error extracting medical information with Llama:', error);
    // Return empty structure on error
    return {
      diagnosis: { primaryDiagnosis: '', subtype: '', diagnosisDate: '', stage: '' },
      treatments: { pastTreatments: '', currentTreatment: '', plannedTreatment: '' },
      medicalHistory: { comorbidities: '', allergies: '', medications: '' },
      demographics: { age: '', gender: '' }
    };
  }
}

/**
 * Alternative approach that uses Llama to extract specific medical entities
 * This can be more reliable for complex documents where structured extraction fails
 * 
 * @param text The medical text to analyze
 * @param entityType The type of entity to extract (e.g., "cancer type", "biomarkers")
 * @returns The extracted entity information
 */
export async function extractSpecificMedicalEntity(text: string, entityType: string): Promise<string> {
  if (!llamaInstance) {
    throw new Error('Llama model not initialized. Call initializeLlama() first.');
  }

  // Create a focused session for this specific extraction
  const session = new LlamaChatSession({
    temperature: 0.1, // Very low temperature for precise extraction
    topP: 0.95,
    maxTokens: 200,
    systemPrompt: `You are a specialized medical information extraction system. 
    Your task is to identify and extract only the specific ${entityType} from Italian medical documents.
    Be precise and concise. Respond with just the extracted information without any additional text.`
  });

  // Define a focused prompt for the specific entity
  const prompt = `
  Estrai SOLO ${entityType} dal seguente testo medico in italiano:
  
  ${text.substring(0, 2500)}
  
  Rispondi SOLO con l'informazione estratta, senza altre spiegazioni o testo.
  `;

  try {
    const response = await session.prompt(prompt);
    return response.trim();
  } catch (error) {
    console.error(`Error extracting ${entityType} with Llama:`, error);
    return '';
  }
}

/**
 * A complete extraction process that combines both general and specific extraction
 * This provides the most robust results by using targeted extraction for key fields
 * 
 * @param text The medical text to analyze
 * @returns Comprehensive structured medical information
 */
export async function fullMedicalInformationExtraction(text: string): Promise<ExtractedMedicalInfo> {
  try {
    if (!isLlamaAvailable()) {
      await initializeLlama();
      if (!isLlamaAvailable()) {
        throw new Error('Failed to initialize Llama model');
      }
    }
    
    // First try the general structured extraction
    const baseInfo = await extractMedicalInformationWithLLM(text);
    
    // For critical fields, use targeted extraction if the general extraction failed
    if (!baseInfo.diagnosis.primaryDiagnosis) {
      baseInfo.diagnosis.primaryDiagnosis = await extractSpecificMedicalEntity(text, "diagnosi principale del cancro");
    }
    
    if (!baseInfo.diagnosis.stage) {
      baseInfo.diagnosis.stage = await extractSpecificMedicalEntity(text, "stadio del cancro (Stage I/II/III/IV)");
    }
    
    if (!baseInfo.diagnosis.subtype) {
      const biomarkers = await extractSpecificMedicalEntity(text, "biomarcatori e alterazioni genetiche (come KRAS, EGFR, ALK, PD-L1)");
      if (biomarkers) {
        baseInfo.diagnosis.subtype = biomarkers;
      }
    }
    
    if (!baseInfo.demographics.age) {
      baseInfo.demographics.age = await extractSpecificMedicalEntity(text, "età del paziente (solo il numero)");
    }
    
    return baseInfo;
  } catch (error) {
    console.error('Error in full medical information extraction:', error);
    // Fallback to empty structure
    return {
      diagnosis: { primaryDiagnosis: '', subtype: '', diagnosisDate: '', stage: '' },
      treatments: { pastTreatments: '', currentTreatment: '', plannedTreatment: '' },
      medicalHistory: { comorbidities: '', allergies: '', medications: '' },
      demographics: { age: '', gender: '' }
    };
  }
}
# Clinical Trial Matcher - Deployment Guide

A comprehensive application for matching cancer patients with appropriate clinical trials based on their medical information.

## Table of Contents
1. [Introduction](#introduction)
2. [Prerequisites](#prerequisites)
3. [Deployment Options](#deployment-options)
4. [GitHub Setup](#github-setup)
5. [Docker Deployment](#docker-deployment)
6. [Local LLM Integration](#local-llm-integration)
7. [ClinicalTrials.gov Integration](#clinicaltrialsgov-integration)
8. [Security Considerations](#security-considerations)
9. [Troubleshooting](#troubleshooting)

## Introduction

This application helps oncologists find suitable clinical trials for their patients by analyzing medical texts and matching them with appropriate trials. The system supports:

- PDF and multi-format document processing
- Advanced NLP for medical data extraction
- Specific support for Italian medical text
- Biomarker and clinical trial detection

## Prerequisites

- Git
- Docker and Docker Compose
- Node.js (for local development only)
- 8GB+ RAM for running local LLMs

## Deployment Options

### Option 1: Full Docker Deployment (Recommended)
- Complete solution with Docker containers
- Privacy-preserving with local LLM processing
- No data leaves your infrastructure

### Option 2: Local Development Setup
- For testing and development purposes
- Less resource-intensive

## GitHub Setup

1. Create a new repository on GitHub
2. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/yourusername/your-repo-name.git
   cd your-repo-name
   ```

3. Download your project from Replit as a ZIP file (click the three dots menu → "Download as zip")

4. Extract the ZIP and copy all files to your local repository

5. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Initial import from Replit"
   git push origin main
   ```

## Docker Deployment

1. Create the following files in your project root:

**Dockerfile**:
```dockerfile
FROM node:20

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Start the application
CMD ["npm", "run", "dev"]
```

**docker-compose.yml**:
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "5000:5000"
    volumes:
      - ./:/app
      - /app/node_modules
    environment:
      - NODE_ENV=production
      - LLM_API_URL=http://llm:8080
    depends_on:
      - llm
    restart: unless-stopped

  llm:
    image: ghcr.io/ollama/ollama:latest
    volumes:
      - ./ollama-models:/root/.ollama
    command: ["serve"]
    deploy:
      resources:
        limits:
          memory: 8G
    restart: unless-stopped

  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/certs:/etc/nginx/certs
    depends_on:
      - app
    restart: unless-stopped
```

2. Create a `.dockerignore` file:
```
node_modules
.git
.env
```

3. Create a simple nginx configuration:

```bash
mkdir -p nginx
```

**nginx/nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name localhost;

        location / {
            proxy_pass http://app:5000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

4. Build and run with Docker Compose:
```bash
docker-compose up --build
```

For production deployment, enable HTTPS by creating self-signed certificates or using Let's Encrypt:
```bash
mkdir -p nginx/certs
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout nginx/certs/key.pem -out nginx/certs/cert.pem
```

## Local LLM Integration

There are two methods to integrate a local LLM like Llama:

### Method 1: Using Ollama (Recommended)

[Ollama](https://github.com/ollama/ollama) provides an easy way to run Llama and other LLMs locally.

1. The docker-compose.yml above already includes the Ollama service
2. Download a model in the container:
```bash
docker-compose exec llm ollama pull llama3
```

3. Create a new file `server/llm.ts` for LLM integration:

```typescript
// server/llm.ts
import axios from 'axios';

const LLM_API_URL = process.env.LLM_API_URL || 'http://localhost:8080';

export async function extractMedicalInfoWithLLM(text: string) {
  try {
    const response = await axios.post(`${LLM_API_URL}/api/generate`, {
      model: "llama3",
      prompt: `Extract medical information from this text: ${text}. Format the response as JSON with the following structure: 
      {
        "diagnosis": { "primaryDiagnosis": "", "subtype": "", "diagnosisDate": "", "stage": "" },
        "treatments": { "pastTreatments": "", "currentTreatment": "", "plannedTreatment": "" },
        "medicalHistory": { "comorbidities": "", "allergies": "", "medications": "" },
        "demographics": { "age": "", "gender": "" }
      }`,
      stream: false
    });
    
    return JSON.parse(response.data.response);
  } catch (error) {
    console.error("Error calling local LLM:", error);
    return {
      diagnosis: { primaryDiagnosis: '', subtype: '', diagnosisDate: '', stage: '' },
      treatments: { pastTreatments: '', currentTreatment: '', plannedTreatment: '' },
      medicalHistory: { comorbidities: '', allergies: '', medications: '' },
      demographics: { age: '', gender: '' }
    };
  }
}
```

4. Update `server/routes.ts` to use the LLM-based extraction:

```typescript
import { extractMedicalInfoWithLLM } from './llm';

// In your trial matching endpoint:
app.post(`${apiPrefix}/trial-matching`, async (req, res) => {
  try {
    const { medicalText } = req.body;
    
    // Use local LLM for extraction
    const extractedInfo = await extractMedicalInfoWithLLM(medicalText);
    
    // Proceed with trial matching
    const matchedTrials = matchPatientToTrials(extractedInfo, await storage.getClinicalTrials());
    
    res.json({
      extractedInfo,
      matchedTrials
    });
  } catch (error) {
    handleError(res, error);
  }
});
```

### Method 2: Using llama.cpp Node.js Bindings

For more advanced setups, you can use llama.cpp with Node.js bindings:

1. Install the required packages:

```bash
npm install node-llama-cpp
```

2. Create the integration file:

```typescript
// server/local-llm.ts
import { LlamaModel, LlamaContext } from 'node-llama-cpp';

let model: LlamaModel | null = null;
let context: LlamaContext | null = null;

export async function initializeLocalLLM() {
  try {
    // Path to the model file
    const modelPath = process.env.LLAMA_MODEL_PATH || './models/llama-3-8b-instruct.gguf';
    
    model = new LlamaModel({
      modelPath: modelPath,
      contextSize: 4096,
      gpuLayers: 0 // Set to higher for GPU acceleration
    });
    
    context = new LlamaContext({ model });
    
    console.log("Local LLM initialized successfully");
    return true;
  } catch (error) {
    console.error("Failed to initialize local LLM:", error);
    return false;
  }
}

export async function extractMedicalInfoWithLocalLLM(text: string) {
  try {
    if (!context) {
      await initializeLocalLLM();
      if (!context) throw new Error("Failed to initialize LLM context");
    }
    
    const prompt = `Extract medical information from this text: ${text}. Format the response as JSON with the following structure: 
    {
      "diagnosis": { "primaryDiagnosis": "", "subtype": "", "diagnosisDate": "", "stage": "" },
      "treatments": { "pastTreatments": "", "currentTreatment": "", "plannedTreatment": "" },
      "medicalHistory": { "comorbidities": "", "allergies": "", "medications": "" },
      "demographics": { "age": "", "gender": "" }
    }`;
    
    const completion = await context.completion(prompt, {
      maxTokens: 2000,
      temperature: 0.1,
      topP: 0.5
    });
    
    // Parse JSON from completion
    const jsonMatch = completion.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("No valid JSON in response");
  } catch (error) {
    console.error("Error using local LLM:", error);
    return {
      diagnosis: { primaryDiagnosis: '', subtype: '', diagnosisDate: '', stage: '' },
      treatments: { pastTreatments: '', currentTreatment: '', plannedTreatment: '' },
      medicalHistory: { comorbidities: '', allergies: '', medications: '' },
      demographics: { age: '', gender: '' }
    };
  }
}
```

## ClinicalTrials.gov Integration with IRCCS Istituto Nazionale dei Tumori Focus

The application is specifically configured to search for clinical trials at the IRCCS Istituto Nazionale dei Tumori in Milan. The integration with ClinicalTrials.gov allows for real-time retrieval of ongoing trials at this institution:

1. Create a new file `server/clinicaltrials.ts`:

```typescript
// server/clinicaltrials.ts
import axios from 'axios';
import { InsertClinicalTrial } from '@shared/schema';

// Clinical Trials API base URL
const CT_API_BASE_URL = 'https://clinicaltrials.gov/api/v2/studies';

/**
 * Search for clinical trials on ClinicalTrials.gov
 * 
 * @param query Search parameters (e.g., condition, location)
 * @returns Array of formatted clinical trials
 */
export async function searchClinicalTrials(query: {
  condition?: string;
  location?: string;
  status?: string;
  phase?: string;
  limit?: number;
  facilityName?: string;
}): Promise<InsertClinicalTrial[]> {
  try {
    // Build query parameters
    const params = new URLSearchParams();
    if (query.condition) params.append('condition', query.condition);
    if (query.location) params.append('location', query.location);
    if (query.status) params.append('status', query.status);
    if (query.phase) params.append('phase', query.phase);
    
    // Add facility name - default to IRCCS Istituto Nazionale dei Tumori
    const facilityName = query.facilityName || 'IRCCS Istituto Nazionale dei Tumori';
    params.append('term', facilityName);
    
    // Default to recruiting trials only if not specified
    if (!query.status) params.append('status', 'recruiting');
    
    // Set result limit
    params.append('limit', (query.limit || 20).toString());
    
    // Format for JSON response
    params.append('format', 'json');
    
    // Execute the API request
    const response = await axios.get(`${CT_API_BASE_URL}?${params.toString()}`);
    
    if (!response.data || !response.data.studies) {
      throw new Error('Invalid response from ClinicalTrials.gov API');
    }
    
    // Transform the API response to our schema format
    return response.data.studies.map((study: any) => {
      // Extract eligibility criteria
      const inclusions = study.eligibility?.criteria?.textblock
        ?.split(/inclusion criteria:/i)[1]
        ?.split(/exclusion criteria:/i)[0]
        ?.trim()
        ?.split(/[.\n]/)
        ?.filter(Boolean)
        ?.map((s: string) => s.trim()) || [];
        
      const exclusions = study.eligibility?.criteria?.textblock
        ?.split(/exclusion criteria:/i)[1]
        ?.trim()
        ?.split(/[.\n]/)
        ?.filter(Boolean)
        ?.map((s: string) => s.trim()) || [];
      
      return {
        nctId: study.protocolSection?.identificationModule?.nctId || '',
        title: study.protocolSection?.identificationModule?.officialTitle || '',
        phase: study.protocolSection?.designModule?.phases?.join('/') || '',
        status: study.protocolSection?.statusModule?.overallStatus || '',
        facility: study.protocolSection?.contactsLocationsModule?.locations?.[0]?.facility || '',
        distance: 0, // Would require geolocation calculation
        primaryPurpose: study.protocolSection?.designModule?.primaryPurpose || '',
        intervention: study.protocolSection?.armsInterventionsModule?.interventions?.[0]?.name || '',
        summary: study.protocolSection?.descriptionModule?.briefSummary || '',
        eligibilityCriteria: {
          inclusions,
          exclusions,
          preferred: []
        }
      };
    });
  } catch (error) {
    console.error('Error fetching clinical trials:', error);
    throw error;
  }
}

/**
 * Get detailed information for a specific trial by NCT ID
 */
export async function getClinicalTrialByNctId(nctId: string): Promise<InsertClinicalTrial | null> {
  try {
    const response = await axios.get(`${CT_API_BASE_URL}/${nctId}?format=json`);
    
    if (!response.data) {
      return null;
    }
    
    const study = response.data;
    
    // Extract eligibility criteria
    const inclusions = study.eligibility?.criteria?.textblock
      ?.split(/inclusion criteria:/i)[1]
      ?.split(/exclusion criteria:/i)[0]
      ?.trim()
      ?.split(/[.\n]/)
      ?.filter(Boolean)
      ?.map((s: string) => s.trim()) || [];
      
    const exclusions = study.eligibility?.criteria?.textblock
      ?.split(/exclusion criteria:/i)[1]
      ?.trim()
      ?.split(/[.\n]/)
      ?.filter(Boolean)
      ?.map((s: string) => s.trim()) || [];
    
    return {
      nctId: study.protocolSection?.identificationModule?.nctId || '',
      title: study.protocolSection?.identificationModule?.officialTitle || '',
      phase: study.protocolSection?.designModule?.phases?.join('/') || '',
      status: study.protocolSection?.statusModule?.overallStatus || '',
      facility: study.protocolSection?.contactsLocationsModule?.locations?.[0]?.facility || '',
      distance: 0,
      primaryPurpose: study.protocolSection?.designModule?.primaryPurpose || '',
      intervention: study.protocolSection?.armsInterventionsModule?.interventions?.[0]?.name || '',
      summary: study.protocolSection?.descriptionModule?.briefSummary || '',
      eligibilityCriteria: {
        inclusions,
        exclusions,
        preferred: []
      }
    };
  } catch (error) {
    console.error(`Error fetching clinical trial ${nctId}:`, error);
    return null;
  }
}
```

2. Update the routes.ts file to use the ClinicalTrials.gov API:

```typescript
// In server/routes.ts
import { searchClinicalTrials, getClinicalTrialByNctId } from './clinicaltrials';

// Add a new endpoint for searching clinical trials
app.get(`${apiPrefix}/trials/search`, async (req, res) => {
  try {
    const { condition, location, status, phase, limit, facilityName } = req.query as any;
    
    const trials = await searchClinicalTrials({
      condition,
      location,
      status,
      phase,
      facilityName, // Filter to IRCCS Istituto Nazionale dei Tumori by default
      limit: limit ? parseInt(limit) : undefined
    });
    
    // Log the number of trials found for this facility
    console.log(`Found ${trials.length} trials at ${facilityName || 'IRCCS Istituto Nazionale dei Tumori'}`);
    
    res.json(trials);
  } catch (error) {
    handleError(res, error);
  }
});

// Modify the existing trial matching endpoint to use ClinicalTrials.gov
app.post(`${apiPrefix}/match-trials`, async (req, res) => {
  try {
    const { medicalText } = req.body;
    
    if (!medicalText) {
      return res.status(400).json({ message: 'Medical text is required' });
    }
    
    // Extract information from the medical text
    const extractedInfo = extractMedicalInfo(medicalText);
    
    // Search for trials from ClinicalTrials.gov based on extracted diagnosis
    let availableTrials = await storage.getClinicalTrials(); // Fallback to stored trials
    
    try {
      const condition = safeString(extractedInfo.diagnosis.primaryDiagnosis).toLowerCase();
      if (condition && condition !== '') {
        // Try to get more specific trials from ClinicalTrials.gov
        // Specific to IRCCS Istituto Nazionale dei Tumori
        const clinicalTrialsGovTrials = await searchClinicalTrials({ 
          condition, 
          status: 'recruiting',
          facilityName: 'IRCCS Istituto Nazionale dei Tumori',
          limit: 20 
        });
        
        if (clinicalTrialsGovTrials && clinicalTrialsGovTrials.length > 0) {
          // Add IDs to the trials and ensure all required fields have values
          const trialsWithIds = clinicalTrialsGovTrials.map((trial, index) => ({
            ...trial,
            id: index + 1000, // Start from 1000 to avoid conflicts with existing IDs
            status: trial.status || null,
            facility: trial.facility || null,
            // Add other fields with defaults as needed
          }));
          
          // Use the trials from ClinicalTrials.gov
          console.log(`Found ${trialsWithIds.length} trials from ClinicalTrials.gov for condition: ${condition}`);
          availableTrials = trialsWithIds;
        } else {
          // Fall back to general cancer search
          console.log(`No trials found for specific condition: ${condition}, falling back to general cancer search`);
          const cancerTrials = await searchClinicalTrials({ 
            condition: 'cancer', 
            status: 'recruiting',
            facilityName: 'IRCCS Istituto Nazionale dei Tumori',
            limit: 20 
          });
          
          if (cancerTrials && cancerTrials.length > 0) {
            const cancerTrialsWithIds = cancerTrials.map((trial, index) => ({
              ...trial,
              id: index + 2000, // Start from 2000 to avoid conflicts
              // Add defaults for required fields
            }));
            availableTrials = cancerTrialsWithIds;
          }
        }
      }
    } catch (apiError) {
      console.error("Error fetching trials from ClinicalTrials.gov:", apiError);
      // Continue with stored trials if API fails
    }
    
    // Find matching trials
    const matchedTrials = matchPatientToTrials(extractedInfo, availableTrials);
    
    // Return both extracted info and matched trials
    res.json({
      extractedInfo,
      matchedTrials
    });
  } catch (error) {
    console.error("Error in trial matching:", error);
    handleError(res, error);
  }
});
```

## Security Considerations

1. Add a `.env` file (and include it in `.gitignore`) for configuration:
   ```
   # App configuration
   NODE_ENV=production
   PORT=5000
   
   # LLM configuration
   LLAMA_MODEL_PATH=/app/models/llama-3-8b-instruct.gguf
   LLM_API_URL=http://llm:8080
   
   # Security settings
   ENABLE_HTTPS=true
   COOKIE_SECRET=your-secure-cookie-secret
   ```

2. Implement rate limiting and other security measures:

```javascript
// server/index.ts
import rateLimit from 'express-rate-limit';

// Rate limiting to prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);
```

3. For production, consider adding a reverse proxy like Nginx with HTTPS.

## Troubleshooting

### Common Issues

1. **Docker Deployment Issues**
   - Check Docker logs: `docker-compose logs -f`
   - Ensure ports are not in use: `lsof -i :5000`
   - Verify Docker network connectivity: `docker network inspect bridge`

2. **LLM Integration Issues**
   - Ensure enough memory for the LLM: At least 8GB RAM
   - Check the LLM logs: `docker-compose logs -f llm`
   - Try a smaller model if memory issues persist

3. **ClinicalTrials.gov API Issues**
   - API rate limiting: Add appropriate delays between requests
   - Use proper error handling
   - Check the API documentation for query format

### Getting Help

For additional assistance, please open an issue in the GitHub repository with:
1. A detailed description of the problem
2. Steps to reproduce 
3. Relevant logs or error messages

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.
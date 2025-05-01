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
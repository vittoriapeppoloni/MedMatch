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
    // Build query parameters for ClinicalTrials.gov API v2
    // Documentation: https://clinicaltrials.gov/data-api/api-docs
    const params = new URLSearchParams();
    
    // Build search query based on parameters
    let searchQuery = "";
    
    // Add condition to search query
    if (query.condition) searchQuery += `AREA[ConditionSearch] ${query.condition} AND `;
    
    // Add status to search query if provided, default to recruiting
    const status = query.status || 'recruiting';
    searchQuery += `AREA[OverallStatus] ${status} AND `;
    
    // Add phase to search query if provided
    if (query.phase && query.phase !== 'all') searchQuery += `AREA[Phase] Phase ${query.phase} AND `;
    
    // Add facility name - default to IRCCS Istituto Nazionale dei Tumori
    const facilityName = query.facilityName || 'IRCCS Istituto Nazionale dei Tumori';
    searchQuery += `AREA[LocationFacility] "${facilityName}"`;
    
    // Remove trailing AND if present
    searchQuery = searchQuery.replace(/ AND $/, '');
    
    // Add the expression parameter with our search query
    params.append('query.expr', searchQuery);
    
    // Set fields to retrieve all available data
    params.append('fields', 'FullStudiesResponse');
    
    // Set result limit
    params.append('pageSize', (query.limit || 20).toString());
    
    // Format for JSON response
    params.append('format', 'json');
    
    console.log("API Query:", searchQuery);
    
    // Execute the API request
    const response = await axios.get(`${CT_API_BASE_URL}?${params.toString()}`);
    
    // Log the response structure for debugging
    console.log("API Response structure:", JSON.stringify(Object.keys(response.data || {})));
    
    // Check if we have valid study data
    if (!response.data || !response.data.fullStudiesResponse || 
        !response.data.fullStudiesResponse.fullStudies || 
        !Array.isArray(response.data.fullStudiesResponse.fullStudies)) {
      console.warn('No valid data returned from ClinicalTrials.gov API');
      return [];
    }
    
    // Log how many studies we found
    const studies = response.data.fullStudiesResponse.fullStudies;
    console.log(`Found ${studies.length} studies at ${facilityName}`);
    
    // Transform the API response to our schema format
    return studies.map((studyData: any) => {
      const study = studyData.study || {};
      
      // Get protocol section which contains most of the data
      const protocolSection = study.protocolSection || {};
      
      // Get eligibility criteria text
      const eligibilityText = protocolSection.eligibilityModule?.eligibilityCriteria || '';
      
      // Extract inclusion/exclusion criteria
      const inclusionMatch = /inclusion criteria:([^]*?)(?:exclusion criteria:|$)/i.exec(eligibilityText);
      const exclusionMatch = /exclusion criteria:([^]*?)$/i.exec(eligibilityText);
      
      const inclusions = inclusionMatch ? 
        inclusionMatch[1].trim().split(/[.\n]/).filter(Boolean).map((s: string) => s.trim()) : [];
      
      const exclusions = exclusionMatch ? 
        exclusionMatch[1].trim().split(/[.\n]/).filter(Boolean).map((s: string) => s.trim()) : [];
      
      // Get locations information
      const locations = protocolSection.contactsLocationsModule?.locations || [];
      const facilityInfo = locations.find((loc: any) => 
        loc.facility?.toLowerCase().includes('irccs istituto nazionale dei tumori')) || locations[0] || {};
      
      // Get interventions
      const interventions = protocolSection.armsInterventionsModule?.interventions || [];
      const intervention = interventions.length > 0 ? interventions[0].name : '';
      
      return {
        nctId: protocolSection.identificationModule?.nctId || '',
        title: protocolSection.identificationModule?.briefTitle || '',
        phase: Array.isArray(protocolSection.designModule?.phases) ? 
          protocolSection.designModule?.phases.join('/') : protocolSection.designModule?.phaseList || '',
        status: protocolSection.statusModule?.overallStatus || '',
        facility: facilityInfo.facility || facilityName,
        distance: 0, // Would require geolocation calculation
        primaryPurpose: protocolSection.designModule?.primaryPurpose || '',
        intervention: intervention,
        summary: protocolSection.descriptionModule?.briefSummary || '',
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
    // Parameters
    const params = new URLSearchParams();
    params.append('format', 'json');
    
    // API v2 uses a different endpoint structure for individual studies
    const response = await axios.get(`${CT_API_BASE_URL}/${nctId}?${params.toString()}`);
    
    if (!response.data || !response.data.fullStudy || !response.data.fullStudy.study) {
      console.warn(`No data found for NCT ID: ${nctId}`);
      return null;
    }
    
    // Get the study data
    const study = response.data.fullStudy.study;
    const protocolSection = study.protocolSection || {};
    
    // Get eligibility criteria text
    const eligibilityText = protocolSection.eligibilityModule?.eligibilityCriteria || '';
      
    // Extract inclusion/exclusion criteria
    const inclusionMatch = /inclusion criteria:([^]*?)(?:exclusion criteria:|$)/i.exec(eligibilityText);
    const exclusionMatch = /exclusion criteria:([^]*?)$/i.exec(eligibilityText);
    
    const inclusions = inclusionMatch ? 
      inclusionMatch[1].trim().split(/[.\n]/).filter(Boolean).map((s: string) => s.trim()) : [];
    
    const exclusions = exclusionMatch ? 
      exclusionMatch[1].trim().split(/[.\n]/).filter(Boolean).map((s: string) => s.trim()) : [];
    
    // Get locations information
    const locations = protocolSection.contactsLocationsModule?.locations || [];
    const facilityInfo = locations.find((loc: any) => 
      loc.facility?.toLowerCase().includes('irccs istituto nazionale dei tumori')) || locations[0] || {};
    
    // Get interventions
    const interventions = protocolSection.armsInterventionsModule?.interventions || [];
    const intervention = interventions.length > 0 ? interventions[0].name : '';
    
    return {
      nctId: protocolSection.identificationModule?.nctId || '',
      title: protocolSection.identificationModule?.briefTitle || 
             protocolSection.identificationModule?.officialTitle || '',
      phase: Array.isArray(protocolSection.designModule?.phases) ? 
        protocolSection.designModule?.phases.join('/') : protocolSection.designModule?.phaseList || '',
      status: protocolSection.statusModule?.overallStatus || '',
      facility: facilityInfo.facility || 'Unknown Facility',
      distance: 0,
      primaryPurpose: protocolSection.designModule?.primaryPurpose || '',
      intervention: intervention,
      summary: protocolSection.descriptionModule?.briefSummary || '',
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
/**
 * Trial matching utilities to determine patient eligibility for clinical trials
 */

import { ExtractedMedicalInfo } from "./nlp";

// Define types for trial matching
export interface MatchFactor {
  factor: string;
  description: string;
}

export interface TrialMatchResult {
  trialId: number;
  matchScore: number;
  matchReasons: MatchFactor[];
  limitingFactors: MatchFactor[];
}

interface GroupedMatchFactors {
  strongMatchFactors: MatchFactor[];
  limitingFactors: MatchFactor[];
}

/**
 * Calculate a match score between patient information and trial eligibility criteria
 */
export function calculateMatchScore(patientInfo: ExtractedMedicalInfo, trial: any): TrialMatchResult {
  const matchReasons: MatchFactor[] = [];
  const limitingFactors: MatchFactor[] = [];
  let score = 0;
  
  // Check cancer type and subtype matches
  if (trial.eligibilityCriteria?.inclusions) {
    const inclusions = trial.eligibilityCriteria.inclusions;
    
    // Check for subtype match (very important)
    if (patientInfo.diagnosis.subtype && 
        inclusions.some((criteria: string) => criteria.includes(patientInfo.diagnosis.subtype!))) {
      score += 30;
      matchReasons.push({
        factor: `${patientInfo.diagnosis.subtype} Status`,
        description: `This hormone receptor status matches trial requirements`
      });
    }
    
    // Check for stage match
    const patientStage = patientInfo.diagnosis.primaryDiagnosis.match(/Stage\s+\d+/i);
    if (patientStage && inclusions.some((criteria: string) => criteria.includes(patientStage[0]))) {
      score += 25;
      matchReasons.push({
        factor: `${patientStage[0]} Cancer`,
        description: `Cancer stage matches trial requirements`
      });
    }
    
    // Check for treatment history match
    const pastTreatments = patientInfo.treatments.pastTreatments.split(", ");
    const hasSurgery = pastTreatments.some(tx => 
      ['Surgery', 'Lumpectomy', 'Mastectomy'].includes(tx)
    );
    
    if (hasSurgery && inclusions.some((criteria: string) => 
        criteria.includes('Surgery') || criteria.includes('Complete'))) {
      score += 20;
      matchReasons.push({
        factor: 'Completed Primary Surgery',
        description: 'Surgical requirements for trial are met'
      });
    }
    
    // Check for recent diagnosis (within last year)
    const currentYear = new Date().getFullYear();
    const diagnosisYear = patientInfo.diagnosis.diagnosisDate.match(/\d{4}/);
    if (diagnosisYear && parseInt(diagnosisYear[0]) >= currentYear - 1) {
      score += 15;
      matchReasons.push({
        factor: 'Recent Diagnosis',
        description: 'Diagnosis within past year meets timing requirements'
      });
    }
  }
  
  // Check comorbidities as limiting factors
  if (patientInfo.medicalHistory.comorbidities) {
    const comorbidities = patientInfo.medicalHistory.comorbidities.split(", ");
    
    if (comorbidities.includes('Diabetes')) {
      score -= 5;
      limitingFactors.push({
        factor: 'Type 2 Diabetes',
        description: 'Some trials exclude patients with diabetes or require specific HbA1c levels'
      });
    }
    
    if (comorbidities.includes('Hypertension')) {
      score -= 5;
      limitingFactors.push({
        factor: 'Concurrent Medication',
        description: 'Medications for hypertension may interact with some investigational drugs'
      });
    }
  }
  
  // Check age restrictions
  if (trial.eligibilityCriteria?.limitations) {
    const limitations = trial.eligibilityCriteria.limitations;
    
    const ageRestriction = limitations.find((limitation: string) => 
      limitation.includes('Age') || limitation.includes('age')
    );
    
    if (ageRestriction && patientInfo.demographics.age) {
      const patientAge = parseInt(patientInfo.demographics.age);
      const requiredAge = ageRestriction.match(/\d+/);
      
      if (requiredAge && patientAge < parseInt(requiredAge[0])) {
        score -= 10;
        limitingFactors.push({
          factor: 'Age Requirement',
          description: `Trial requires patients ${requiredAge[0]}+ years old`
        });
      }
    }
  }
  
  // Normalize score to be between 0-100
  score = Math.max(0, Math.min(100, score));
  
  return {
    trialId: trial.id,
    matchScore: score,
    matchReasons,
    limitingFactors
  };
}

/**
 * Group match factors from multiple trial matches to identify common strong and limiting factors
 */
export function groupMatchFactors(trialMatches: any[]): GroupedMatchFactors {
  const factorCounts: Record<string, number> = {};
  const factorDescriptions: Record<string, string> = {};
  const limitingFactorCounts: Record<string, number> = {};
  const limitingFactorDescriptions: Record<string, string> = {};
  
  // Count occurrences of each factor
  trialMatches.forEach(match => {
    // Process match reasons
    match.matchReasons?.forEach((reason: MatchFactor) => {
      factorCounts[reason.factor] = (factorCounts[reason.factor] || 0) + 1;
      factorDescriptions[reason.factor] = reason.description;
    });
    
    // Process limiting factors
    match.limitingFactors?.forEach((factor: MatchFactor) => {
      limitingFactorCounts[factor.factor] = (limitingFactorCounts[factor.factor] || 0) + 1;
      limitingFactorDescriptions[factor.factor] = factor.description;
    });
  });
  
  // Create arrays of factors sorted by frequency
  const strongMatchFactors = Object.keys(factorCounts)
    .map(factor => ({
      factor,
      description: factorDescriptions[factor],
      count: factorCounts[factor]
    }))
    .sort((a, b) => b.count - a.count)
    .map(({ factor, description }) => ({ factor, description }));
  
  const limitingFactors = Object.keys(limitingFactorCounts)
    .map(factor => ({
      factor,
      description: limitingFactorDescriptions[factor],
      count: limitingFactorCounts[factor]
    }))
    .sort((a, b) => b.count - a.count)
    .map(({ factor, description }) => ({ factor, description }));
  
  return {
    strongMatchFactors,
    limitingFactors
  };
}

/**
 * Find eligible trials for a patient based on their medical information
 */
export function findEligibleTrials(patientInfo: ExtractedMedicalInfo, availableTrials: any[]): TrialMatchResult[] {
  const matches = availableTrials.map(trial => calculateMatchScore(patientInfo, trial));
  
  // Sort by match score (highest first)
  return matches.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Enhanced Italian trial matcher
 * This module provides specialized matching for Italian medical documents to clinical trials
 */

/**
 * Match patient information to clinical trials with a focus on Italian medical terminology
 * @param extractedInfo The extracted patient information
 * @param trials The available clinical trials
 * @returns Array of matching trials with scores
 */
export function matchPatientToTrials(extractedInfo: any, trials: any[]) {
  try {
    console.log("Italian trial matcher - Processing patient info:", JSON.stringify(extractedInfo, null, 2));
    
    // Skip if no trials or no patient info
    if (!trials || trials.length === 0 || !extractedInfo) {
      console.log("No trials or patient info available");
      return [];
    }
    
    // Extract relevant patient information
    const diagnosis = safeString(extractedInfo.diagnosis.primaryDiagnosis).toLowerCase();
    const stage = safeString(extractedInfo.diagnosis.stage).toLowerCase();
    const subtype = safeString(extractedInfo.diagnosis.subtype).toLowerCase();
    const age = extractedInfo.demographics.age ? parseInt(extractedInfo.demographics.age) : null;
    const gender = safeString(extractedInfo.demographics.gender).toLowerCase();
    const treatments = safeString(extractedInfo.treatments.pastTreatments).toLowerCase();
    const medications = safeString(extractedInfo.medicalHistory.medications).toLowerCase();
    const comorbidities = safeString(extractedInfo.medicalHistory.comorbidities).toLowerCase();
    
    // Extracted matched trials
    const matchedTrials = [];
    
    // Determine cancer specifics
    const isLungCancer = diagnosis.includes('lung') || 
                        diagnosis.includes('polmon') || 
                        diagnosis.includes('nsclc');
                        
    const isAdenocarcinoma = diagnosis.includes('adenocarcinoma') || 
                            diagnosis.includes('adeno') || 
                            subtype.includes('adenocarcinoma');
                            
    // Biomarker detection
    const hasKRAS = subtype.includes('kras') || subtype.includes('g12c');
    const krasG12C = subtype.includes('g12c');
    const hasSTK11 = subtype.includes('stk11');
    const hasPDL1 = subtype.includes('pd-l1') || subtype.includes('pdl1');
    
    // Extract PD-L1 percentage if available
    let pdl1Percentage = 0;
    const pdl1Match = subtype.match(/pd-?l1[\s:]*(\d+)%/i);
    if (pdl1Match && pdl1Match[1]) {
      pdl1Percentage = parseInt(pdl1Match[1]);
    }
    
    // Extract metastatic status
    const isMetastatic = stage.includes('iv') || 
                         stage.includes('4') || 
                         stage.includes('metastatic') ||
                         diagnosis.includes('metastat');
    
    console.log(`Cancer type detection - Lung: ${isLungCancer}, Adenocarcinoma: ${isAdenocarcinoma}, Metastatic: ${isMetastatic}`);
    console.log(`Biomarker detection - KRAS: ${hasKRAS}, KRAS G12C: ${krasG12C}, STK11: ${hasSTK11}, PD-L1: ${hasPDL1} (${pdl1Percentage}%)`);
    
    // Process each trial
    console.log(`Processing ${trials.length} trials for matching`);
    for (const trial of trials) {
      const title = safeString(trial.title).toLowerCase();
      const condition = safeString(trial.condition).toLowerCase();
      const inclusions = safeString(trial.eligibilityCriteria?.inclusions).toLowerCase();
      const exclusions = safeString(trial.eligibilityCriteria?.exclusions).toLowerCase();
      const summary = safeString(trial.summary).toLowerCase();
      
      let score = 10; // Higher base score to ensure more trials match
      const matchReasons = [];
      const limitingFactors = [];
      
      // CANCER TYPE MATCHING
      
      // Strong match: Trial specifically for lung cancer
      if (isLungCancer && (
        condition.includes('lung') ||
        condition.includes('polmon') ||
        condition.includes('nsclc') ||
        title.includes('lung cancer') ||
        title.includes('nsclc') ||
        title.includes('polmon')
      )) {
        score += 50;
        matchReasons.push({
          factor: 'Cancer Type',
          description: 'Lung cancer matching trial for lung cancer'
        });
      }
      
      // Strong match: Trial specifically for adenocarcinoma
      else if (isAdenocarcinoma && (
        condition.includes('adenocarcinoma') ||
        title.includes('adenocarcinoma') 
      )) {
        score += 40;
        matchReasons.push({
          factor: 'Cancer Type',
          description: 'Adenocarcinoma matching trial'
        });
      }
      
      // Medium match: Trial for solid tumors or general cancer
      else if (
        condition.includes('solid tumor') ||
        condition.includes('advanced cancer') ||
        title.includes('solid tumor') 
      ) {
        score += 20;
        matchReasons.push({
          factor: 'Cancer Type',
          description: 'Solid tumor trial applicable'
        });
      }
      
      // Weak match: General cancer trial
      else if (
        condition.includes('cancer') ||
        condition.includes('neoplasm') ||
        condition.includes('carcinoma')
      ) {
        score += 10;
        matchReasons.push({
          factor: 'Cancer Type',
          description: 'General cancer trial'
        });
      }
      
      // Exclusion: Wrong cancer type
      else {
        score -= 25;
        limitingFactors.push({
          factor: 'Cancer Type',
          description: 'Trial not specific for this cancer type'
        });
      }
      
      // STAGE/METASTATIC MATCHING
      
      // For metastatic/stage IV patients
      if (isMetastatic) {
        if (
          condition.includes('metastatic') ||
          condition.includes('advanced') ||
          title.includes('metastatic') ||
          title.includes('advanced') ||
          inclusions.includes('metastatic') ||
          inclusions.includes('stage iv')
        ) {
          score += 30;
          matchReasons.push({
            factor: 'Disease Stage',
            description: 'Stage IV/Metastatic patient matches trial for advanced disease'
          });
        }
        // Exclusion: If explicitly for early-stage only
        else if (
          condition.includes('early stage') ||
          condition.includes('non-metastatic') ||
          exclusions.includes('metastatic')
        ) {
          score -= 50;
          limitingFactors.push({
            factor: 'Disease Stage',
            description: 'Trial appears to exclude metastatic/Stage IV patients'
          });
        }
      }
      // For non-metastatic patients
      else if (!isMetastatic && stage) {
        if (
          condition.includes('early stage') ||
          condition.includes('non-metastatic') ||
          title.includes('early stage')
        ) {
          score += 30;
          matchReasons.push({
            factor: 'Disease Stage',
            description: 'Non-metastatic patient matches trial for early-stage disease'
          });
        }
        // Exclusion: If metastatic disease is required
        else if (
          inclusions.includes('metastatic disease required') ||
          inclusions.includes('must have metastatic')
        ) {
          score -= 50;
          limitingFactors.push({
            factor: 'Disease Stage',
            description: 'Trial requires metastatic disease'
          });
        }
      }
      
      // BIOMARKER MATCHING
      
      // KRAS mutation
      if (hasKRAS) {
        // G12C specific
        if (krasG12C && (
          title.includes('g12c') ||
          condition.includes('g12c') ||
          inclusions.includes('g12c')
        )) {
          score += 80;
          matchReasons.push({
            factor: 'Biomarker',
            description: 'KRAS G12C mutation matches trial specifically for G12C'
          });
        }
        // General KRAS
        else if (
          title.includes('kras') ||
          condition.includes('kras') ||
          inclusions.includes('kras')
        ) {
          score += 60;
          matchReasons.push({
            factor: 'Biomarker',
            description: 'KRAS mutation matches trial for KRAS'
          });
        }
        // Exclusion: KRAS wild-type only
        else if (
          exclusions.includes('kras mutation') ||
          exclusions.includes('kras mutant') ||
          inclusions.includes('kras wild type')
        ) {
          score -= 70;
          limitingFactors.push({
            factor: 'Biomarker Exclusion',
            description: 'Trial excludes patients with KRAS mutations'
          });
        }
      }
      
      // STK11 mutation
      if (hasSTK11 && (
        title.includes('stk11') ||
        condition.includes('stk11') ||
        inclusions.includes('stk11')
      )) {
        score += 40;
        matchReasons.push({
          factor: 'Biomarker',
          description: 'STK11 mutation matches trial'
        });
      }
      
      // PD-L1 expression
      if (hasPDL1) {
        // PD-L1 focused trial
        if (
          title.includes('pd-l1') ||
          title.includes('pdl1') ||
          condition.includes('pd-l1')
        ) {
          // With specific threshold
          const pdl1ThresholdMatch = inclusions.match(/pd-?l1(?:.+?)(?:>|greater than|maggiore di)\s*(\d+)%/i);
          
          if (pdl1ThresholdMatch && pdl1Percentage > 0) {
            const threshold = parseInt(pdl1ThresholdMatch[1]);
            
            if (pdl1Percentage >= threshold) {
              score += 50;
              matchReasons.push({
                factor: 'PD-L1 Expression',
                description: `PD-L1 ${pdl1Percentage}% meets trial requirement of >${threshold}%`
              });
            } else {
              score -= 35;
              limitingFactors.push({
                factor: 'PD-L1 Expression',
                description: `PD-L1 ${pdl1Percentage}% below trial requirement of >${threshold}%`
              });
            }
          } else {
            // General PD-L1 match
            score += 30;
            matchReasons.push({
              factor: 'PD-L1 Expression',
              description: 'PD-L1 expression matches trial focus'
            });
          }
        }
      }
      
      // AGE MATCHING
      
      if (age) {
        // Check for specific age restrictions
        const ageMaxPattern = /age\s*(?:<=?|less than|younger than|below|meno di|inferiore a)\s*(\d+)/i;
        const ageMinPattern = /age\s*(?:>=?|greater than|older than|above|oltre|superiore a)\s*(\d+)/i;
        
        // Check exclusions first
        const maxMatch = exclusions.match(ageMaxPattern);
        const minMatch = exclusions.match(ageMinPattern);
        
        if (maxMatch && age > parseInt(maxMatch[1])) {
          score -= 60;
          limitingFactors.push({
            factor: 'Age',
            description: `Patient age (${age}) exceeds maximum allowed (${maxMatch[1]})`
          });
        } else if (minMatch && age < parseInt(minMatch[1])) {
          score -= 60;
          limitingFactors.push({
            factor: 'Age',
            description: `Patient age (${age}) below minimum required (${minMatch[1]})`
          });
        } else {
          // Age appears compatible
          score += 10;
          matchReasons.push({
            factor: 'Age',
            description: `Patient age (${age}) appears compatible with trial criteria`
          });
        }
      }
      
      // GENDER MATCHING
      
      if (gender) {
        // Check if trial explicitly excludes this gender
        if (
          (gender === 'female' && (exclusions.includes('females excluded') || inclusions.includes('males only'))) ||
          (gender === 'male' && (exclusions.includes('males excluded') || inclusions.includes('females only')))
        ) {
          score -= 80;
          limitingFactors.push({
            factor: 'Gender',
            description: `Trial excludes patients of gender: ${gender}`
          });
        } else {
          // Gender seems compatible
          score += 5;
          matchReasons.push({
            factor: 'Gender',
            description: 'Gender compatible with trial'
          });
        }
      }
      
      // Only include trials with positive score
      if (score > 0) {
        matchedTrials.push({
          trialId: trial.id,
          matchScore: score,
          matchReasons: matchReasons.slice(0, 5), // Top 5 reasons only
          limitingFactors,
          trial // Include full trial data
        });
      }
    }
    
    // Sort by match score (highest first)
    matchedTrials.sort((a, b) => b.matchScore - a.matchScore);
    
    // Return more trials - up to 20
    return matchedTrials.slice(0, 20);
    
  } catch (error) {
    console.error("Error in Italian trial matcher:", error);
    return [];
  }
}

// Helper functions
function safeString(value: any): string {
  if (!value) return '';
  return typeof value === 'string' ? value : String(value);
}

function safeLowerIncludes(text: string | null | undefined, searchStr: string | null | undefined): boolean {
  if (!text || !searchStr) return false;
  return text.toLowerCase().includes(searchStr.toLowerCase());
}
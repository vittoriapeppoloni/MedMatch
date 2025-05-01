import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PatientForm from "@/components/trial-matcher/patient-form";
import ExtractedInformation from "@/components/trial-matcher/extracted-information";
import MatchingTrials from "@/components/trial-matcher/matching-trials";
import EligibilitySummary from "@/components/trial-matcher/eligibility-summary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function TrialMatching() {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(1);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [matchedTrials, setMatchedTrials] = useState<any[]>([]);

  // Mutation for analyzing medical text (storing in database)
  const analyzeMutation = useMutation({
    mutationFn: async (data: { patientId: number; text: string }) => {
      const res = await apiRequest('POST', '/api/analyze-medical-text', data);
      return res.json();
    },
    onSuccess: (data) => {
      setPatientId(data.extractedInfo.patientId);
      setActiveStep(2);
      queryClient.invalidateQueries({ queryKey: [`/api/extracted-info/${data.extractedInfo.patientId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/trial-matches/${data.extractedInfo.patientId}`] });
      toast({
        title: "Analysis Complete",
        description: "Medical information extracted and trials matched successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "An error occurred while processing the medical data.",
        variant: "destructive",
      });
    },
  });

  // Mutation for direct trial matching using ClinicalTrials.gov
  const matchTrialsMutation = useMutation({
    mutationFn: async (data: { medicalText: string }) => {
      const res = await apiRequest('POST', '/api/match-trials', data);
      return res.json();
    },
    onSuccess: (data) => {
      setExtractedData(data.extractedInfo);
      setMatchedTrials(data.matchedTrials);
      setActiveStep(2);
      toast({
        title: "Matching Complete",
        description: "Medical information extracted and trials matched from ClinicalTrials.gov.",
      });
    },
    onError: (error) => {
      toast({
        title: "Matching Failed",
        description: error.message || "An error occurred while matching clinical trials.",
        variant: "destructive",
      });
    },
  });

  // Query for extracted medical info (when using database storage)
  const { data: extractedInfo, isLoading: infoLoading } = useQuery({
    queryKey: [`/api/extracted-info/${patientId}`],
    enabled: !!patientId && activeStep >= 2,
  });

  // Query for trial matches (when using database storage)
  const { data: trialMatches, isLoading: matchesLoading } = useQuery({
    queryKey: [`/api/trial-matches/${patientId}`],
    enabled: !!patientId && activeStep >= 2,
  });

  const handleProcessMedicalData = async (formData: { patientId: number; medicalText: string }) => {
    // Use the ClinicalTrials.gov integration
    await matchTrialsMutation.mutateAsync({
      medicalText: formData.medicalText
    });
  };

  // Determine which data to use - either from direct API call or from database
  const displayExtractedInfo = extractedData || (extractedInfo && !infoLoading ? extractedInfo : null);
  const displayTrialMatches = matchedTrials.length > 0 ? 
    matchedTrials.map(match => ({ ...match, trial: match })) : 
    (trialMatches && !matchesLoading ? trialMatches : [] as any[]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-600">Clinical Trial Matching</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Match patients to appropriate clinical trials from ClinicalTrials.gov based on their medical data
        </p>
      </div>

      {/* Step 1: Patient Form */}
      <PatientForm 
        onSubmit={handleProcessMedicalData} 
        isProcessing={matchTrialsMutation.isPending} 
      />

      {/* Step 2: Show extracted information and matched trials when available */}
      {activeStep >= 2 && displayExtractedInfo && (
        <ExtractedInformation data={displayExtractedInfo} />
      )}

      {activeStep >= 2 && Array.isArray(displayTrialMatches) && displayTrialMatches.length > 0 && (
        <MatchingTrials trials={displayTrialMatches} />
      )}

      {activeStep >= 2 && Array.isArray(displayTrialMatches) && displayTrialMatches.length > 0 && displayExtractedInfo && (
        <EligibilitySummary 
          extractedInfo={displayExtractedInfo}
          matchedTrials={displayTrialMatches}
        />
      )}
    </div>
  );
}

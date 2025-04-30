import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import PatientForm from "@/components/trial-matcher/patient-form";
import ExtractedInformation from "@/components/trial-matcher/extracted-information";
import MatchingTrials from "@/components/trial-matcher/matching-trials";
import EligibilitySummary from "@/components/trial-matcher/eligibility-summary";

export default function TrialMatching() {
  const { toast } = useToast();
  const [patientId, setPatientId] = useState<number | null>(null);
  const [activeStep, setActiveStep] = useState(1);

  // Mutation for analyzing medical text
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

  // Query for extracted medical info
  const { data: extractedInfo, isLoading: infoLoading } = useQuery({
    queryKey: [`/api/extracted-info/${patientId}`],
    enabled: !!patientId && activeStep >= 2,
  });

  // Query for trial matches
  const { data: trialMatches, isLoading: matchesLoading } = useQuery({
    queryKey: [`/api/trial-matches/${patientId}`],
    enabled: !!patientId && activeStep >= 2,
  });

  const handleProcessMedicalData = async (formData: { patientId: number; medicalText: string }) => {
    await analyzeMutation.mutateAsync({
      patientId: formData.patientId,
      text: formData.medicalText
    });
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-600">Clinical Trial Matching</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Match patients to appropriate clinical trials based on their medical data
        </p>
      </div>

      {/* Step 1: Patient Form */}
      <PatientForm 
        onSubmit={handleProcessMedicalData} 
        isProcessing={analyzeMutation.isPending} 
      />

      {/* Step 2: Show extracted information and matched trials when available */}
      {activeStep >= 2 && !infoLoading && extractedInfo && (
        <ExtractedInformation data={extractedInfo} />
      )}

      {activeStep >= 2 && !matchesLoading && trialMatches && (
        <MatchingTrials trials={trialMatches} />
      )}

      {activeStep >= 2 && !matchesLoading && trialMatches && (
        <EligibilitySummary 
          extractedInfo={extractedInfo}
          matchedTrials={trialMatches}
        />
      )}
    </div>
  );
}

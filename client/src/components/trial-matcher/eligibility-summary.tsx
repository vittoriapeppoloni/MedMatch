import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { groupMatchFactors } from "@/lib/trial-matcher";

interface EligibilitySummaryProps {
  extractedInfo: any;
  matchedTrials: any[];
}

export default function EligibilitySummary({ extractedInfo, matchedTrials }: EligibilitySummaryProps) {
  const { toast } = useToast();
  
  // Group match factors and limiting factors
  const { strongMatchFactors, limitingFactors } = groupMatchFactors(matchedTrials);
  
  const handleSaveToPatient = () => {
    toast({
      title: "Saved to Patient Record",
      description: "The trial match report has been saved to the patient's record.",
    });
  };
  
  const handleDownloadReport = () => {
    toast({
      title: "Report Downloaded",
      description: "The trial eligibility report has been downloaded.",
    });
  };
  
  const handleContactCoordinator = () => {
    toast({
      title: "Contact Initiated",
      description: "Contact form for the trial coordinator has been opened.",
    });
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="text-lg font-semibold text-neutral-600 mb-4">Patient Eligibility Summary</h2>
      
      <div className="bg-neutral-100 p-4 rounded-lg mb-4">
        <div className="flex items-start mb-3">
          <div className="w-6 h-6 rounded-full bg-success text-white flex items-center justify-center mr-2 mt-0.5">
            <Icon name="check" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-medium text-neutral-700">Strong Match Factors</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Key characteristics that make this patient eligible for multiple trials
            </p>
            
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {strongMatchFactors.length > 0 ? (
                strongMatchFactors.map((factor, index) => (
                  <div key={index} className="bg-white p-3 rounded-md shadow-sm">
                    <h4 className="text-sm font-medium text-neutral-600">{factor.factor}</h4>
                    <p className="text-xs text-neutral-500 mt-1">{factor.description}</p>
                  </div>
                ))
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm col-span-2">
                  <p className="text-sm text-neutral-500">No strong match factors identified.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-neutral-100 p-4 rounded-lg">
        <div className="flex items-start mb-3">
          <div className="w-6 h-6 rounded-full bg-warning text-white flex items-center justify-center mr-2 mt-0.5">
            <Icon name="warning" className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-medium text-neutral-700">Potential Limiting Factors</h3>
            <p className="text-sm text-neutral-500 mt-1">
              Characteristics that might limit eligibility for some trials
            </p>
            
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
              {limitingFactors.length > 0 ? (
                limitingFactors.map((factor, index) => (
                  <div key={index} className="bg-white p-3 rounded-md shadow-sm">
                    <h4 className="text-sm font-medium text-neutral-600">{factor.factor}</h4>
                    <p className="text-xs text-neutral-500 mt-1">{factor.description}</p>
                  </div>
                ))
              ) : (
                <div className="bg-white p-3 rounded-md shadow-sm col-span-2">
                  <p className="text-sm text-neutral-500">No limiting factors identified.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-5 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handleDownloadReport}
        >
          Download Report
        </Button>
        
        <div className="flex items-center">
          <Button
            variant="outline"
            className="text-primary border-primary hover:bg-primary/5 transition-colors mr-2"
            onClick={handleSaveToPatient}
          >
            Save to Patient Record
          </Button>
          <Button
            onClick={handleContactCoordinator}
          >
            Contact Trial Coordinator
          </Button>
        </div>
      </div>
    </Card>
  );
}

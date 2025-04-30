import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

interface ExtractedInfoProps {
  data: any;
}

export default function ExtractedInformation({ data }: ExtractedInfoProps) {
  return (
    <Card className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-600">Extracted Medical Information</h2>
        <div className="flex items-center">
          <span className="text-xs bg-success/20 text-success px-2 py-1 rounded-full flex items-center">
            <Icon name="check" className="mr-1 h-3 w-3" /> Processed
          </span>
          <Button variant="ghost" size="icon" className="ml-2 text-neutral-500 hover:text-primary">
            <Icon name="edit" className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold text-neutral-600 mb-2">Diagnosis</h3>
          <div className="bg-neutral-100 rounded-md p-3">
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-500">Primary Diagnosis:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.diagnosis?.primaryDiagnosis || "Breast Cancer (Stage 2, T2N0M0)"}
              </p>
            </div>
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-500">Subtype:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.diagnosis?.subtype || "HR+/HER2-"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Diagnosis Date:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.diagnosis?.diagnosisDate || "October 2023"}
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-neutral-600 mb-2">Treatments</h3>
          <div className="bg-neutral-100 rounded-md p-3">
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-500">Past Treatments:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.treatments?.pastTreatments || "Lumpectomy, Sentinel lymph node biopsy"}
              </p>
            </div>
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-500">Current Treatment:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.treatments?.currentTreatment || "Radiation therapy"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Planned Treatment:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.treatments?.plannedTreatment || "Hormone therapy"}
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-neutral-600 mb-2">Medical History</h3>
          <div className="bg-neutral-100 rounded-md p-3">
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-500">Comorbidities:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.medicalHistory?.comorbidities || "Hypertension (controlled), Type 2 Diabetes (HbA1c 6.8%)"}
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Allergies:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.medicalHistory?.allergies || "No known drug allergies"}
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-semibold text-neutral-600 mb-2">Demographics</h3>
          <div className="bg-neutral-100 rounded-md p-3">
            <div className="mb-2">
              <span className="text-xs font-medium text-neutral-500">Age:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.demographics?.age || "57"} years
              </p>
            </div>
            <div>
              <span className="text-xs font-medium text-neutral-500">Gender:</span>
              <p className="text-sm font-medium text-neutral-700">
                {data.demographics?.gender || "Female"}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-primary/10 rounded-md">
        <div className="flex items-start">
          <Icon name="info" className="text-primary mr-2 h-5 w-5 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-primary">Additional Context</p>
            <p className="text-xs text-neutral-600 mt-1">
              The system has extracted key medical information from the patient's records. 
              Review the information for accuracy and make any necessary corrections before 
              proceeding with trial matching.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

import { useState, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { readFileAsText } from "@/lib/file-utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  medicalText: z.string().min(10, "Medical text is required"),
});

interface PatientFormProps {
  onSubmit: (data: { patientId: number; medicalText: string }) => void;
  isProcessing: boolean;
}

export default function PatientForm({ onSubmit, isProcessing }: PatientFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      medicalText: "57-year-old female with Stage 2 (T2N0M0) HR+/HER2- breast cancer diagnosed in October 2023. Patient underwent lumpectomy with negative margins and sentinel lymph node biopsy with 0/3 nodes positive. Currently completing radiation therapy and scheduled to start hormone therapy next month. Medical history includes hypertension (controlled with lisinopril) and type 2 diabetes (HbA1c 6.8%). No known drug allergies.",
    },
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      
      // Show a loading message while processing the file
      form.setValue('medicalText', 'Processing file, please wait...');
      
      try {
        // For PDF files, use a simplified approach since we're having issues with PDF.js
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          // Simple fallback for text-based PDFs
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              const result = event.target.result.toString();
              if (result.length > 50) {
                form.setValue('medicalText', result);
              } else {
                // Message if extraction fails
                form.setValue('medicalText', 
                `We've detected you're trying to upload a PDF, but the system couldn't extract readable text from it.

This happens because:
1. The PDF contains image-based content instead of text
2. The PDF has security restrictions
3. The PDF structure is not standard

Please open your PDF in another application (like Adobe Reader), select the text content, and paste it directly into this field. Or try uploading a plain text (.txt) file instead.`);
              }
            }
          };
          reader.readAsText(file);
        } else {
          // For non-PDF files, use standard text extraction
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              form.setValue('medicalText', event.target.result.toString());
            }
          };
          reader.readAsText(file);
        }
      } catch (error) {
        console.error('Error reading file:', error);
        form.setValue('medicalText', 'Error reading file. Please try again or paste the text manually.');
      }
    }
  };
  
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      patientId: 1, // Using a default patient ID since we removed the field
      medicalText: values.medicalText,
    });
  };
  
  const handleClear = () => {
    form.reset({
      medicalText: "",
    });
    setUploadedFile(null);
  };
  
  return (
    <Card className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="text-lg font-semibold text-neutral-600 mb-4">Patient Information</h2>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>

          
          <div className="mb-4">
            <FormLabel className="block text-sm font-medium text-neutral-600 mb-1">Upload Medical Documentation</FormLabel>
            <div 
              className={`border-2 border-dashed ${isDragging ? 'border-primary' : 'border-neutral-300'} 
                         rounded-md p-4 text-center hover:border-primary transition-colors`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={async (e) => {
                e.preventDefault();
                setIsDragging(false);
                
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  const file = e.dataTransfer.files[0];
                  setUploadedFile(file);
                  
                  // Show a loading message while processing the file
                  form.setValue('medicalText', 'Processing file, please wait...');
                  
                  try {
                    // For PDF files, use a simplified approach since we're having issues with PDF.js
                    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                      // Simple fallback for text-based PDFs
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          const result = event.target.result.toString();
                          if (result.length > 50) {
                            form.setValue('medicalText', result);
                          } else {
                            // Message if extraction fails
                            form.setValue('medicalText', 
                            `We've detected you're trying to upload a PDF, but the system couldn't extract readable text from it.

This happens because:
1. The PDF contains image-based content instead of text
2. The PDF has security restrictions
3. The PDF structure is not standard

Please open your PDF in another application (like Adobe Reader), select the text content, and paste it directly into this field. Or try uploading a plain text (.txt) file instead.`);
                          }
                        }
                      };
                      reader.readAsText(file);
                    } else {
                      // For non-PDF files, use standard text extraction
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          form.setValue('medicalText', event.target.result.toString());
                        }
                      };
                      reader.readAsText(file);
                    }
                  } catch (error) {
                    console.error('Error reading file:', error);
                    form.setValue('medicalText', 'Error reading file. Please try again or paste the text manually.');
                  }
                }
              }}
            >
              <Icon name="upload" className={`mx-auto h-8 w-8 ${isDragging ? 'text-primary' : 'text-neutral-400'} mb-2`} />
              <p className="text-sm text-neutral-500 mb-2">
                {uploadedFile 
                  ? `File selected: ${uploadedFile.name}`
                  : "Drag and drop files here, or click to browse"
                }
              </p>
              <p className="text-xs text-neutral-500">Supported formats: TXT, PDF, DOC, DOCX (max 10MB)</p>
              <Input
                type="file"
                id="fileUpload"
                className="hidden"
                onChange={handleFileChange}
                accept=".txt,.pdf,.doc,.docx"
              />
              <Button
                type="button"
                className="mt-3"
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById('fileUpload')?.click();
                }}
              >
                Browse Files
              </Button>
            </div>
          </div>
          
          <FormField
            control={form.control}
            name="medicalText"
            render={({ field }) => (
              <FormItem className="mb-4">
                <FormLabel className="block text-sm font-medium text-neutral-600 mb-1">Or Input Medical Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter relevant medical information..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleClear}
              className="mr-2"
            >
              Clear
            </Button>
            <Button type="submit" disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Process & Find Matches"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}

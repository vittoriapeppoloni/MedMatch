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
      medicalText: "", // Empty default value as requested
    },
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      
      // Show a loading message while processing the file
      form.setValue('medicalText', 'Processing file, please wait...\n\nOur server is extracting text from your PDF using high-performance tools.');
      setIsProcessingFile(true);
      
      try {
        // For PDF files, use server-side processing (much faster and more reliable)
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            // Create a FormData object to send the file
            const formData = new FormData();
            formData.append('file', file);
            
            // Make a request to the server endpoint
            console.log('Sending PDF to server for processing...');
            const response = await fetch('/api/process-pdf', {
              method: 'POST',
              body: formData,
            });
            
            if (!response.ok) {
              throw new Error(`Server returned ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log(`PDF processed in ${result.processingTime}ms`);
            
            // Use the extracted text
            form.setValue('medicalText', result.text);
          } catch (error) {
            console.error('Error processing PDF:', error);
            const errorMessage = error.toString().includes('400') ? 
              'The server rejected this PDF because it appears to be encrypted or contains binary data.' :
              'Error extracting text from the PDF.';
            
            form.setValue('medicalText', 
            `${errorMessage}

This PDF appears to be encrypted, secured, or contains binary data that cannot be extracted as text.

Please try one of the following options:
1. Open the PDF in a PDF reader application and copy/paste the text directly
2. Upload a different PDF that contains directly extractable text
3. Use a text file format instead (.txt)

For medical documents, you can also manually enter the key patient information.`);
          }
        } else {
          // For non-PDF files, use standard text extraction
          const reader = new FileReader();
          reader.onload = (event) => {
            if (event.target?.result) {
              form.setValue('medicalText', event.target.result.toString());
              setIsProcessingFile(false);
            }
          };
          reader.readAsText(file);
          return; // Exit early as we're using async reader
        }
      } catch (error) {
        console.error('Error reading file:', error);
        form.setValue('medicalText', 'Error reading file. Please try again or paste the text manually.');
      }
      
      // If we reach here, we've completed processing
      setIsProcessingFile(false);
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
                  // Use the same handler as for the file input to maintain consistency
                  const fileList = e.dataTransfer.files;
                  const event = {
                    target: {
                      files: fileList
                    }
                  } as unknown as React.ChangeEvent<HTMLInputElement>;
                  
                  // Call the existing handler
                  handleFileChange(event);
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
                <div className="flex justify-between items-center mb-1">
                  <FormLabel className="block text-sm font-medium text-neutral-600">
                    Or Input Medical Notes
                  </FormLabel>
                  {isProcessingFile && (
                    <div className="flex items-center text-sm text-primary font-medium">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing PDF...
                    </div>
                  )}
                </div>
                <FormControl>
                  <Textarea
                    placeholder="Insert here the text"
                    rows={6}
                    className={isProcessingFile ? "border-primary" : ""}
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
            <Button type="submit" disabled={isProcessing || isProcessingFile}>
              {isProcessing 
                ? "Processing..." 
                : isProcessingFile 
                  ? "File Processing..." 
                  : "Process & Find Matches"}
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
}

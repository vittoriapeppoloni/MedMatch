import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  patientId: z.number().positive(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  medicalText: z.string().min(10, "Medical text is required").max(10000),
});

interface PatientFormProps {
  onSubmit: (data: { patientId: number; medicalText: string }) => void;
  isProcessing: boolean;
}

export default function PatientForm({ onSubmit, isProcessing }: PatientFormProps) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patientId: 1, // Default to first patient
      dob: "1975-06-15",
      gender: "female",
      medicalText: "57-year-old female with Stage 2 (T2N0M0) HR+/HER2- breast cancer diagnosed in October 2023. Patient underwent lumpectomy with negative margins and sentinel lymph node biopsy with 0/3 nodes positive. Currently completing radiation therapy and scheduled to start hormone therapy next month. Medical history includes hypertension (controlled with lisinopril) and type 2 diabetes (HbA1c 6.8%). No known drug allergies.",
    },
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      
      // In a real application, we would extract text from the file here
      // For this demo, we'll just show the filename
    }
  };
  
  const handleFormSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit({
      patientId: values.patientId,
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <FormField
              control={form.control}
              name="patientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-neutral-600">Patient ID</FormLabel>
                  <FormControl>
                    <Input {...field} value={`PT-2023${field.value}`} disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="dob"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-neutral-600">Date of Birth</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-neutral-600">Gender</FormLabel>
                  <Select
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <div className="mb-4">
            <FormLabel className="block text-sm font-medium text-neutral-600 mb-1">Upload Medical Documentation</FormLabel>
            <div className="border-2 border-dashed border-neutral-300 rounded-md p-4 text-center">
              <Icon name="upload" className="mx-auto h-8 w-8 text-neutral-400 mb-2" />
              <p className="text-sm text-neutral-500 mb-2">
                {uploadedFile 
                  ? `File selected: ${uploadedFile.name}`
                  : "Drag and drop files here, or click to browse"
                }
              </p>
              <p className="text-xs text-neutral-500">Supported formats: PDF, DOC, DOCX (max 10MB)</p>
              <Input
                type="file"
                id="fileUpload"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx"
              />
              <Button
                type="button"
                className="mt-3"
                onClick={() => document.getElementById('fileUpload')?.click()}
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

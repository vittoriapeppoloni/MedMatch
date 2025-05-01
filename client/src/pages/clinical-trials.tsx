import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";

export default function ClinicalTrials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("recruiting");
  const [condition, setCondition] = useState("cancer");
  
  // Add a condition selection dropdown
  const handleConditionChange = (value: string) => {
    setCondition(value);
    // Clear the search query
    setSearchQuery("");
  };
  
  // Use the clinical trials search endpoint specifically for IRCCS trials
  const { data: irccsTrials, isLoading: isIrccsLoading, refetch: refetchIrccsTrials } = useQuery({
    queryKey: ['/api/trials/search', condition, statusFilter, phaseFilter],
    queryFn: async () => {
      // Build the query params
      const params = new URLSearchParams();
      if (condition) params.append('condition', condition);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (phaseFilter !== 'all') params.append('phase', phaseFilter);
      
      // Always filter for IRCCS Istituto Nazionale dei Tumori
      params.append('facilityName', 'IRCCS Istituto Nazionale dei Tumori');
      
      const response = await fetch(`/api/trials/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch IRCCS trials');
      }
      return await response.json();
    },
    enabled: true // Always run this query when the component mounts
  });
  
  // Effect to update filters
  useEffect(() => {
    refetchIrccsTrials();
  }, [statusFilter, phaseFilter, condition]);
  
  // Use IRCCS trials or empty array if no trials found
  const allTrials = irccsTrials || [];
  const isLoadingTrials = isIrccsLoading;
  
  // Filter trials based only on text search (other filters are applied at the API level)
  const filteredTrials = allTrials.filter(
    (trial: any) => {
      // Only apply the text search filter
      const matchesSearch = !searchQuery || searchQuery === "" || 
        trial.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trial.nctId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trial.facility && trial.facility.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    }
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-600">Clinical Trials</h1>
          <p className="text-sm text-neutral-500 mt-1">Browse and search available clinical trials</p>
        </div>
        <Button>
          <Icon name="trials" className="mr-2 h-4 w-4" />
          Import Trials
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Trial Database</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            {/* Search and filter controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="relative w-full md:w-96">
                <Input
                  type="text"
                  placeholder="Search trials by name, ID, or facility..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Phases</SelectItem>
                    <SelectItem value="1">Phase 1</SelectItem>
                    <SelectItem value="2">Phase 2</SelectItem>
                    <SelectItem value="3">Phase 3</SelectItem>
                    <SelectItem value="4">Phase 4</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="recruiting">Recruiting</SelectItem>
                    <SelectItem value="not recruiting">Not Recruiting</SelectItem>
                    <SelectItem value="active, not recruiting">Active, Not Recruiting</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Cancer type selection */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
              <div className="flex-1">
                <Select value={condition} onValueChange={handleConditionChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Cancer Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cancer">All Cancer Types</SelectItem>
                    <SelectItem value="breast cancer">Breast Cancer</SelectItem>
                    <SelectItem value="lung cancer">Lung Cancer</SelectItem>
                    <SelectItem value="prostate cancer">Prostate Cancer</SelectItem>
                    <SelectItem value="colorectal cancer">Colorectal Cancer</SelectItem>
                    <SelectItem value="melanoma">Melanoma</SelectItem>
                    <SelectItem value="leukemia">Leukemia</SelectItem>
                    <SelectItem value="lymphoma">Lymphoma</SelectItem>
                    <SelectItem value="pancreatic cancer">Pancreatic Cancer</SelectItem>
                    <SelectItem value="ovarian cancer">Ovarian Cancer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="shrink-0">
                <Badge className="bg-primary-100 text-primary-900 hover:bg-primary-200 transition-colors">
                  IRCCS Istituto Nazionale dei Tumori
                </Badge>
              </div>
            </div>
          </div>

          {isLoadingTrials ? (
            <div className="h-[400px] flex items-center justify-center">
              <p className="text-neutral-500">Loading clinical trials...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTrials.length > 0 ? (
                filteredTrials.map((trial: any) => (
                  <div 
                    key={trial.id} 
                    className="border border-neutral-200 rounded-lg p-4 hover:border-primary transition-colors"
                  >
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-700">{trial.title}</h3>
                        <p className="text-sm text-neutral-500 mt-1">
                          {trial.nctId} • {trial.phase} • {trial.facility}
                        </p>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge variant="default" className="bg-primary">
                          {trial.status}
                        </Badge>
                        <span className="text-xs text-neutral-500 mt-2">
                          {trial.distance} miles away
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Primary Purpose</h4>
                        <p className="text-sm text-neutral-700">{trial.primaryPurpose}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Intervention</h4>
                        <p className="text-sm text-neutral-700">{trial.intervention}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Status</h4>
                        <p className="text-sm text-neutral-700">{trial.status}</p>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Summary</h4>
                      <p className="text-sm text-neutral-700 line-clamp-2">{trial.summary}</p>
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Key Eligibility Factors</h4>
                        <div className="flex flex-wrap gap-2">
                          {trial.eligibilityCriteria?.inclusions?.map((criteria: string, index: number) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 bg-success/10 text-success text-xs rounded-full"
                            >
                              <Icon name="check" className="mr-1 h-3 w-3" /> {criteria}
                            </span>
                          ))}
                          {trial.eligibilityCriteria?.limitations?.map((criteria: string, index: number) => (
                            <span 
                              key={index}
                              className="inline-flex items-center px-2 py-0.5 bg-warning/10 text-warning text-xs rounded-full"
                            >
                              <Icon name="warning" className="mr-1 h-3 w-3" /> {criteria}
                            </span>
                          ))}
                        </div>
                      </div>
                      <Button variant="link">View Details</Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-neutral-500">
                  <Icon name="trials" className="h-12 w-12 mb-2 text-neutral-300" />
                  <p>No clinical trials found matching your criteria.</p>
                  <p className="text-sm mt-1">Try adjusting your search filters.</p>
                </div>
              )}
              
              {/* Link to search for more trials */}
              {filteredTrials.length > 0 && (
                <div className="text-center py-2">
                  <Button variant="link" onClick={() => handleConditionChange("cancer")}>
                    Load More Trials
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function ClinicalTrials() {
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("recruiting");
  
  const { data: trials, isLoading } = useQuery({
    queryKey: ['/api/trials'],
  });

  // Filter trials based on filters
  const filteredTrials = trials ? trials.filter(
    (trial: any) => {
      // Search filter
      const matchesSearch = 
        trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trial.nctId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (trial.facility && trial.facility.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Phase filter
      const matchesPhase = 
        phaseFilter === "all" || 
        (trial.phase && trial.phase.toLowerCase().includes(phaseFilter.toLowerCase()));
      
      // Status filter
      const matchesStatus = 
        statusFilter === "all" || 
        (trial.status && trial.status.toLowerCase() === statusFilter.toLowerCase());
      
      return matchesSearch && matchesPhase && matchesStatus;
    }
  ) : [];

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
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
                  <SelectItem value="not-recruiting">Not Recruiting</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Icon name="filter" className="mr-2 h-4 w-4" />
                More Filters
              </Button>
            </div>
          </div>

          {isLoading ? (
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
              
              {/* Default trials if none are loaded */}
              {!trials && (
                <div 
                  className="border border-neutral-200 rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <div className="flex justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-neutral-700">PALLAS: PALbociclib CoLlaborative Adjuvant Study</h3>
                      <p className="text-sm text-neutral-500 mt-1">NCT02513394 • Phase 3 • University Medical Center</p>
                    </div>
                    <div className="flex flex-col items-end">
                      <Badge variant="default" className="bg-primary">Recruiting</Badge>
                      <span className="text-xs text-neutral-500 mt-2">2.4 miles away</span>
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Primary Purpose</h4>
                      <p className="text-sm text-neutral-700">Treatment</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Intervention</h4>
                      <p className="text-sm text-neutral-700">Palbociclib + Standard Endocrine Therapy</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Status</h4>
                      <p className="text-sm text-neutral-700">Recruiting</p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Summary</h4>
                    <p className="text-sm text-neutral-700 line-clamp-2">
                      A randomized phase III trial evaluating palbociclib with standard adjuvant endocrine therapy 
                      versus standard adjuvant endocrine therapy alone for hormone receptor positive (HR+) / human 
                      epidermal growth factor receptor 2 (HER2)-negative early breast cancer.
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center">
                    <div>
                      <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Key Eligibility Factors</h4>
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                          <Icon name="check" className="mr-1 h-3 w-3" /> Stage 2
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                          <Icon name="check" className="mr-1 h-3 w-3" /> HR+/HER2-
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
                          <Icon name="check" className="mr-1 h-3 w-3" /> Completed Surgery
                        </span>
                      </div>
                    </div>
                    <Button variant="link">View Details</Button>
                  </div>
                </div>
              )}
              
              {(filteredTrials.length > 0 || !trials) && (
                <div className="text-center py-2">
                  <Button variant="link">Load More Results</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

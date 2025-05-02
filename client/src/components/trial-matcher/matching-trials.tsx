import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Check, CheckCircle, AlertCircle, Filter, 
  Calendar, User, Microscope, Beaker, 
  Pill, Info, AlertTriangle, BadgeCheck 
} from 'lucide-react';

interface MatchingTrialsProps {
  trials: any[];
}

export default function MatchingTrials({ trials }: MatchingTrialsProps) {
  const [sortBy, setSortBy] = useState("relevance");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [distanceFilter, setDistanceFilter] = useState("50");
  const [statusFilter, setStatusFilter] = useState("recruiting");
  const [selectedTrial, setSelectedTrial] = useState<any>(null);
  
  // Filter and sort trials
  const filteredTrials = trials.filter(trial => {
    // Phase filter
    if (phaseFilter !== "all" && !trial.trial?.phase?.includes(`Phase ${phaseFilter}`)) {
      return false;
    }
    
    // Distance filter (if available)
    if (distanceFilter !== "any" && trial.trial?.distance > parseInt(distanceFilter)) {
      return false;
    }
    
    // Status filter
    if (statusFilter !== "all" && trial.trial?.status?.toLowerCase() !== statusFilter) {
      return false;
    }
    
    return true;
  });
  
  // Sort the trials
  const sortedTrials = [...filteredTrials].sort((a, b) => {
    if (sortBy === "relevance") {
      return b.matchScore - a.matchScore;
    } else if (sortBy === "distance") {
      return (a.trial?.distance || 0) - (b.trial?.distance || 0);
    } else if (sortBy === "phase") {
      // Extract phase number for sorting
      const getPhaseNum = (trial: any) => {
        const phase = trial.trial?.phase || "";
        const match = phase.match(/Phase (\d+)/);
        return match ? parseInt(match[1]) : 0;
      };
      return getPhaseNum(b) - getPhaseNum(a);
    }
    return 0;
  });
  
  return (
    <Card className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-600">Matching Clinical Trials</h2>
        <div className="flex items-center">
          <div className="text-sm text-neutral-600 mr-2">
            <span className="font-medium">{sortedTrials.length}</span> trials found
          </div>
          <Select defaultValue={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Sort by: Relevance</SelectItem>
              <SelectItem value="distance">Sort by: Distance</SelectItem>
              <SelectItem value="phase">Sort by: Trial Phase</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-600 rounded-md text-sm">
          <span>Phase:</span>
          <Select defaultValue={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="ml-1 bg-transparent text-sm border-none p-0 h-auto">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1">Phase 1</SelectItem>
              <SelectItem value="2">Phase 2</SelectItem>
              <SelectItem value="3">Phase 3</SelectItem>
              <SelectItem value="4">Phase 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-600 rounded-md text-sm">
          <span>Distance:</span>
          <Select defaultValue={distanceFilter} onValueChange={setDistanceFilter}>
            <SelectTrigger className="ml-1 bg-transparent text-sm border-none p-0 h-auto">
              <SelectValue placeholder="Within 50 miles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">Within 10 miles</SelectItem>
              <SelectItem value="25">Within 25 miles</SelectItem>
              <SelectItem value="50">Within 50 miles</SelectItem>
              <SelectItem value="100">Within 100 miles</SelectItem>
              <SelectItem value="any">Any distance</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="inline-flex items-center px-2 py-1 bg-neutral-100 text-neutral-600 rounded-md text-sm">
          <span>Status:</span>
          <Select defaultValue={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="ml-1 bg-transparent text-sm border-none p-0 h-auto">
              <SelectValue placeholder="Recruiting" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="recruiting">Recruiting</SelectItem>
              <SelectItem value="not-recruiting">Not Recruiting</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Button variant="link" className="text-primary text-sm">
          <Filter className="mr-1 h-4 w-4" />
          More Filters
        </Button>
      </div>
      
      {/* Trial Cards */}
      <div className="space-y-4">
        {sortedTrials.length > 0 ? (
          sortedTrials.map((match) => {
            const trial = match.trial;
            return (
              <div 
                key={match.id || match.trialId} 
                className="border border-neutral-200 rounded-lg p-4 hover:border-primary transition-colors"
              >
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-neutral-700">{trial?.title}</h3>
                    <p className="text-sm text-neutral-500 mt-1">
                      {trial?.nctId} • {trial?.phase} • {trial?.facility}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="px-3 py-1 bg-success text-white text-xs font-medium rounded-full">
                      {typeof match.matchScore === 'number' ? Math.round(match.matchScore) : match.matchScore}% Match
                    </span>
                    <span className="text-xs text-neutral-500 mt-2">
                      {trial?.distance ? `${trial.distance} miles away` : 'IRCCS INT Milano'}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Primary Purpose</h4>
                    <p className="text-sm text-neutral-700">{trial?.primaryPurpose}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Intervention</h4>
                    <p className="text-sm text-neutral-700">{trial?.intervention}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Status</h4>
                    <p className="text-sm text-neutral-700">{trial?.status}</p>
                  </div>
                </div>
                
                <div className="mt-3">
                  <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Summary</h4>
                  <p className="text-sm text-neutral-700 line-clamp-2">
                    {trial?.summary}
                  </p>
                </div>
                
                <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Key Eligibility Factors</h4>
                    <div className="flex flex-wrap gap-2">
                      {match.matchReasons?.map((reason: any, index: number) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 bg-success/10 text-success text-xs rounded-full"
                        >
                          <Check className="mr-1 h-3 w-3" />
                          {reason.factor}
                        </span>
                      ))}
                      
                      {match.limitingFactors?.map((factor: any, index: number) => (
                        <span 
                          key={index}
                          className="inline-flex items-center px-2 py-0.5 bg-warning/10 text-warning text-xs rounded-full"
                        >
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          {factor.factor}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="link" 
                        onClick={() => setSelectedTrial(trial)}
                      >
                        View Details
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>{trial?.title}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 mt-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm text-neutral-500">
                              {trial?.nctId} • {trial?.phase} • {trial?.facility}
                            </p>
                          </div>
                          <span className="px-3 py-1 bg-success text-white text-xs font-medium rounded-full">
                            {typeof match.matchScore === 'number' ? Math.round(match.matchScore) : match.matchScore}% Match
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Primary Purpose</h4>
                            <p className="text-sm text-neutral-700">{trial?.primaryPurpose}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Intervention</h4>
                            <p className="text-sm text-neutral-700">{trial?.intervention}</p>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Status</h4>
                            <p className="text-sm text-neutral-700">{trial?.status}</p>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Summary</h4>
                          <p className="text-sm text-neutral-700">
                            {trial?.summary}
                          </p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Inclusion Criteria</h4>
                            <ul className="list-disc list-inside text-sm text-neutral-700 space-y-1">
                              {trial?.eligibilityCriteria?.inclusions?.map((criteria: string, index: number) => (
                                <li key={index}>{criteria}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Exclusion Criteria</h4>
                            <ul className="list-disc list-inside text-sm text-neutral-700 space-y-1">
                              {trial?.eligibilityCriteria?.exclusions?.map((criteria: string, index: number) => (
                                <li key={index}>{criteria}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Match Reasons</h4>
                          <div className="space-y-2 mt-1">
                            {match.matchReasons?.map((reason: any, index: number) => (
                              <div key={index} className="flex items-start">
                                <CheckCircle className="text-success mr-1 h-4 w-4 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium">{reason.factor}</p>
                                  <p className="text-xs text-neutral-500">{reason.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {match.limitingFactors?.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-neutral-500 uppercase mb-1">Limiting Factors</h4>
                            <div className="space-y-2 mt-1">
                              {match.limitingFactors?.map((factor: any, index: number) => (
                                <div key={index} className="flex items-start">
                                  <AlertTriangle className="text-warning mr-1 h-4 w-4 mt-0.5" />
                                  <div>
                                    <p className="text-sm font-medium">{factor.factor}</p>
                                    <p className="text-xs text-neutral-500">{factor.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-end space-x-2 pt-4">
                          <Button variant="outline">Contact Trial Coordinator</Button>
                          <Button>Save to Patient Record</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-600">No matching trials found with the current filters.</p>
            <p className="text-sm text-neutral-500 mt-1">Try adjusting your filter criteria.</p>
          </div>
        )}
        
        {sortedTrials.length > 3 && (
          <div className="text-center py-2">
            <Button variant="link">Load More Results</Button>
          </div>
        )}
      </div>
    </Card>
  );
}

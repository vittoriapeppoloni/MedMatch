import { Icon } from "@/components/ui/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: patientCount, isLoading: patientLoading } = useQuery({
    queryKey: ['/api/patients/count'],
    enabled: false // Disabled for now since we don't have this endpoint yet
  });
  
  const { data: trialCount, isLoading: trialLoading } = useQuery({
    queryKey: ['/api/trials/count'],
    enabled: false // Disabled for now
  });
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-neutral-600">Dashboard</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Welcome to MedMatch - Clinical Trial Matching System
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Patients</CardTitle>
            <Icon name="patients" className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientLoading ? '...' : patientCount || 42}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Active patient records in system
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Available Trials</CardTitle>
            <Icon name="trials" className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trialLoading ? '...' : trialCount || 214}</div>
            <p className="text-xs text-neutral-500 mt-1">
              Clinical trials currently recruiting
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Trial Matches</CardTitle>
            <Icon name="check" className="h-4 w-4 text-neutral-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18</div>
            <p className="text-xs text-neutral-500 mt-1">
              Patient-trial matches this month
            </p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Patient PT-20231142 matched with 7 clinical trials</p>
                  <p className="text-xs text-neutral-500">Today at 10:23 AM</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New clinical trial added: PERSEE: Personalized Treatment Approach</p>
                  <p className="text-xs text-neutral-500">Yesterday at 4:15 PM</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-neutral-300 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Patient PT-20231135 medical records updated</p>
                  <p className="text-xs text-neutral-500">2 days ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-2 h-2 bg-neutral-300 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Trial NCT03701334 status changed to "Recruiting"</p>
                  <p className="text-xs text-neutral-500">3 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Link href="/trial-matching">
                <Button className="w-full justify-start" variant="outline">
                  <Icon name="trials" className="mr-2 h-4 w-4" />
                  Match Patient to Trials
                </Button>
              </Link>
              <Link href="/patients">
                <Button className="w-full justify-start" variant="outline">
                  <Icon name="patients" className="mr-2 h-4 w-4" />
                  Add New Patient
                </Button>
              </Link>
              <Link href="/clinical-trials">
                <Button className="w-full justify-start" variant="outline">
                  <Icon name="search" className="mr-2 h-4 w-4" />
                  Browse Clinical Trials
                </Button>
              </Link>
              <Button className="w-full justify-start" variant="outline">
                <Icon name="reports" className="mr-2 h-4 w-4" />
                Generate Reports
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>System Updates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-3 bg-primary/10 rounded-md">
                <p className="text-sm font-medium text-primary">New Feature Released</p>
                <p className="text-xs text-neutral-600 mt-1">
                  Enhanced trial matching algorithm now available with improved NLP capabilities.
                </p>
              </div>
              
              <div className="p-3 bg-neutral-100 rounded-md">
                <p className="text-sm font-medium text-neutral-600">Clinical Trial Database Updated</p>
                <p className="text-xs text-neutral-500 mt-1">
                  Latest clinical trials from ClinicalTrials.gov have been imported (June 16, 2023).
                </p>
              </div>
              
              <div className="p-3 bg-neutral-100 rounded-md">
                <p className="text-sm font-medium text-neutral-600">Upcoming Maintenance</p>
                <p className="text-xs text-neutral-500 mt-1">
                  System maintenance scheduled for June 25, 2023 at 2:00 AM EST.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

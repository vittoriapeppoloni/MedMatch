import { useQuery } from "@tanstack/react-query";
import { Icon } from "@/components/ui/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { useState } from "react";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: patients, isLoading } = useQuery({
    queryKey: ['/api/patients'],
  });

  // Filter patients based on search query
  const filteredPatients = patients ? patients.filter(
    (patient: any) => 
      patient.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.medicalInfo?.demographics?.gender || '').toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-600">Patients</h1>
          <p className="text-sm text-neutral-500 mt-1">Manage patient records and medical information</p>
        </div>
        <Button>
          <Icon name="patients" className="mr-2 h-4 w-4" />
          Add New Patient
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Patient Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div className="relative w-full md:w-64">
              <Input
                type="text"
                placeholder="Search patients..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Icon name="filter" className="mr-2 h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" size="sm">Export</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              <p className="text-neutral-500">Loading patients...</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient ID</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.length > 0 ? (
                      filteredPatients.map((patient: any) => (
                        <TableRow key={patient.id}>
                          <TableCell className="font-medium">{patient.patientId}</TableCell>
                          <TableCell>{patient.gender || patient.medicalInfo?.demographics?.gender || '-'}</TableCell>
                          <TableCell>{patient.dob || '-'}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                              {patient.status || 'Active'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Link href={`/patients/${patient.id}`}>
                                <Button variant="ghost" size="sm">View</Button>
                              </Link>
                              <Link href={`/trial-matching?patientId=${patient.id}`}>
                                <Button variant="outline" size="sm">Match Trials</Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          No patients found
                        </TableCell>
                      </TableRow>
                    )}
                    
                    {/* Default example row if no patients */}
                    {!patients || patients.length === 0 && (
                      <TableRow>
                        <TableCell className="font-medium">PT-20231142</TableCell>
                        <TableCell>Female</TableCell>
                        <TableCell>1975-06-15</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                            Active
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">View</Button>
                            <Link href="/trial-matching">
                              <Button variant="outline" size="sm">Match Trials</Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  1
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                >
                  2
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

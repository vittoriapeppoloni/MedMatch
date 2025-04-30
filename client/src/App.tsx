import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TrialMatching from "@/pages/trial-matching";
import Patients from "@/pages/patients";
import ClinicalTrials from "@/pages/clinical-trials";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/trial-matching" component={TrialMatching} />
      <Route path="/patients" component={Patients} />
      <Route path="/clinical-trials" component={ClinicalTrials} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light">
      <TooltipProvider>
        <div className="h-screen flex flex-col">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-neutral-100 p-4 md:p-6">
              <Router />
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </ThemeProvider>
  );
}

export default App;

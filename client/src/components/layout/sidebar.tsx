import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Sidebar() {
  const [location] = useLocation();
  
  const menuItems = [
    { path: "/", label: "Dashboard", icon: "dashboard" },
    { path: "/patients", label: "Patients", icon: "patients" },
    { path: "/trial-matching", label: "Clinical Trial Matching", icon: "trials" },
    { path: "/clinical-trials", label: "Clinical Trials", icon: "reports" },
  ];
  
  const settingsItems = [
    { path: "/settings", label: "Preferences", icon: "settings" },
    { path: "/security", label: "Security", icon: "security" },
    { path: "/help", label: "Help & Support", icon: "help" },
  ];
  
  return (
    <aside className="hidden md:block w-64 bg-white border-r border-neutral-300 overflow-y-auto">
      <nav className="mt-5 px-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Main Menu
          </p>
          
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={cn(
                  "flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location === item.path
                    ? "text-neutral-600 bg-neutral-100"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
              >
                <Icon
                  name={item.icon}
                  className={cn(
                    "text-lg mr-3",
                    location === item.path ? "text-primary" : "text-neutral-500"
                  )}
                />
                {item.label}
              </a>
            </Link>
          ))}
        </div>
        
        <div className="mt-8 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
            Settings
          </p>
          
          {settingsItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a className="flex items-center px-2 py-2 text-sm font-medium rounded-md text-neutral-600 hover:bg-neutral-100">
                <Icon name={item.icon} className="text-lg mr-3 text-neutral-500" />
                {item.label}
              </a>
            </Link>
          ))}
        </div>
      </nav>
      
      <div className="px-4 mt-8 mb-6">
        <div className="p-3 bg-primary/10 rounded-lg">
          <p className="text-sm font-medium text-primary mb-1">Need assistance?</p>
          <p className="text-xs text-neutral-600">
            Contact support for help with trial matching or patient data.
          </p>
          <button className="mt-2 text-xs font-medium text-primary hover:underline flex items-center">
            Contact Support <Icon name="arrowRight" className="ml-1 h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}

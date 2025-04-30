import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");
  
  return (
    <header className="bg-white shadow-sm z-20">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Icon name="logo" className="h-8 w-8 text-primary" />
            <span className="ml-2 text-xl font-semibold text-neutral-600">MedMatch</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search patients or trials..."
                className="pl-10 pr-4 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
            </div>
            
            <Button variant="ghost" size="icon">
              <Icon name="notification" className="h-5 w-5 text-neutral-600" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-white">
                      DR
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-neutral-600">Dr. Sarah Chen</span>
                  <Icon name="arrowDown" className="h-4 w-4 text-neutral-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuItem>Help</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Log out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <Button variant="ghost" size="icon" className="md:hidden">
            <Icon name="menu" className="h-6 w-6 text-neutral-600" />
          </Button>
        </div>
      </div>
    </header>
  );
}

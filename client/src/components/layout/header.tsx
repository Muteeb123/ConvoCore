import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { NotificationModal } from "@/components/modals/notification-model";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false); // State for modal

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {subtitle && (
              <span className="ml-4 text-sm text-gray-500">{subtitle}</span>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="relative p-2"
              onClick={() => setIsNotificationOpen(true)} // Open modal on click
            >
              <Bell className="w-5 h-5 text-gray-400" />
              <Badge className="absolute -top-1 -right-1 w-3 h-3 p-0 bg-red-500"></Badge>
            </Button>
          </div>
        </div>
      </header>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen} 
        onClose={() => setIsNotificationOpen(false)} 
      />
    </>
  );
}
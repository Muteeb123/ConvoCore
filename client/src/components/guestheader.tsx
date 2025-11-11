"use client";

import React from "react";
import { X } from "lucide-react";

// --- Sidebar Component ---

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const GuestSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* MAIN SIDEBAR CONTAINER 
        h-screen + flex-col is the key layout.
      */}
      <aside
        className={`h-screen w-[240px] flex flex-col bg-[#001E40] text-white fixed md:relative z-50 transform transition-transform duration-300
      ${isOpen ? "translate-x-0" : "-translate-x-full"}
      md:translate-x-0`}
      >
        {/* Mobile close button */}
        <div className="absolute top-4 right-4 md:hidden">
          <button onClick={onClose} className="text-white p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Header / Logo (Fixed Top) */}
        <div className="flex items-center justify-center pt-8 pb-6 border-b border-[#ffffff1a] flex-shrink-0">
          <img
            src="https://storage.googleapis.com/crmlogs/crm_assets/Logo.png"
            alt="Integriti Logo"
            className="w-[160px] h-auto mr-[27px]" // Kept original margin for consistency
          />
        </div>

        {/* 2. Simplified Content Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 min-h-0">
          <p className="px-4 py-3 text-[#FFFFFF80] text-[15px] font-[400]">
            Thanks for joining!
          </p>
        </div>

        {/* 3. Removed Profile Section */}
        {/* The profile and logout section has been completely removed. */}
      </aside>
    </>
  );
};

export default GuestSidebar;

// src/components/Header.tsx

import React from 'react';
import { Search, Bell } from 'lucide-react';

// Define the props for the component for type safety
type HeaderProps = {
  userName: string;
};

const Header: React.FC<HeaderProps> = ({ userName }) => {
  return (
    <header className="flex w-full items-center justify-between bg-white px-6 py-4">
      {/* Left Section: Welcome Message */}
      <div>
        <p className="text-sm text-slate-500">Welcome back,</p>
        <h1 className="text-2xl font-bold text-slate-800">{userName}</h1>
      </div>

      {/* Right Section: Search and Notifications */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="flex w-72 cursor-pointer items-center justify-between rounded-full bg-slate-100 px-4 py-2 text-slate-500 transition-colors hover:bg-slate-200">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            <span>Search</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-white px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
            <span className="text-sm">⌘</span>K
          </kbd>
        </div>

        {/* Notification Button */}
        <button
          type="button"
          className="rounded-full border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800"
          aria-label="View notifications"
        >
          <Bell className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};

export default Header;
import React from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';

export default function Navbar({ autoMode, onMenuClick }) {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Articles Feed';
      case '/dashboard':
        return 'Control Panel';
      default:
        if (location.pathname.startsWith('/posts/')) {
          return 'Article Details';
        }
        return 'SAMHITA';
    }
  };

  return (
    <header className="h-16 border-b border-dark-800 bg-dark-950/60 backdrop-blur-md sticky top-0 flex items-center justify-between px-6 md:px-8 z-10">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg border border-dark-800 text-dark-400 hover:text-white hover:bg-dark-800 transition-all duration-200 cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h2 className="text-xl font-bold text-white tracking-tight">{getPageTitle()}</h2>
      </div>
      
      {autoMode && autoMode.active && (
        <div className="flex items-center gap-2 bg-primary-950/40 border border-primary-500/20 px-3.5 py-1.5 rounded-full shadow-inner animate-pulse">
          <span className="h-2 w-2 rounded-full bg-primary-400"></span>
          <span className="text-[11px] font-extrabold text-primary-400 tracking-wider uppercase select-none">
            Auto Mode: {autoMode.secondsLeft}s
          </span>
        </div>
      )}
    </header>
  );
}

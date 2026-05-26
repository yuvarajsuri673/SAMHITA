import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Sparkles, LogOut } from 'lucide-react';
import { api } from '../services/api';

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    {
      name: 'Articles Feed',
      path: '/',
      icon: BookOpen,
    },
    {
      name: 'Control Panel',
      path: '/dashboard',
      icon: LayoutDashboard,
    },
  ];

  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch (err) {
      console.error('Error logging out:', err);
    } finally {
      localStorage.removeItem('samhita_token');
      onLogout();
    }
  };

  return (
    <aside className="w-64 bg-dark-900 border-r border-dark-800 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-6 border-b border-dark-800 text-center">
        <h1 className="font-black text-2xl tracking-[0.25em] bg-gradient-to-r from-primary-400 via-teal-350 to-cyan-400 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(20,184,166,0.3)] select-none">
          SAMHITA
        </h1>
        <p className="text-[9px] text-primary-400/80 tracking-[0.22em] font-extrabold uppercase mt-1">
          Agentic AI Engine
        </p>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary-600/10 text-primary-400 border-l-4 border-primary-500'
                  : 'text-dark-400 hover:bg-dark-800 hover:text-dark-100'
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile Info */}
      <div className="p-4 border-t border-dark-800 bg-dark-950/40 space-y-3">
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="flex items-center gap-2.5 truncate">
            {/* Avatar badge */}
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-cyan-500 p-0.5 flex items-center justify-center shrink-0 shadow-md">
              <span className="bg-dark-900 text-white font-extrabold text-xs h-full w-full rounded-full flex items-center justify-center uppercase">
                {user?.username?.substring(0, 1) || 'U'}
              </span>
            </div>
            {/* Username details */}
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate leading-tight">{user?.username}</p>
              <p className="text-[10px] text-dark-500 truncate mt-0.5">{user?.email}</p>
            </div>
          </div>
          
          {/* Logout Trigger */}
          <button
            onClick={handleLogout}
            title="Log Out"
            className="p-2 rounded-lg border border-dark-800 hover:border-red-500/20 text-dark-400 hover:text-red-400 bg-dark-900 hover:bg-red-500/5 transition-all duration-200 cursor-pointer shrink-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}

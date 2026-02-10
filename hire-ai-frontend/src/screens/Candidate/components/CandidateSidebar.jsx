'use client';

import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Briefcase,
  Bookmark,
  CheckSquare,
  User,
  Star,
  LogOut,
  X,
} from "lucide-react";

const navItems = [
  {
    name: "Jobs",
    icon: Briefcase,
    path: "/candidate",
  },
  {
    name: "Saved Jobs",
    icon: Bookmark,
    path: "/candidate/saved-jobs",
  },
  {
    name: "Applied Jobs",
    icon: CheckSquare,
    path: "/candidate/applied-jobs",
  },
  {
    name: "Matched Jobs",
    icon: Star,
    path: "/candidate/matched-jobs",
  },
  {
    name: "Profile",
    icon: User,
    path: "/candidate/profile",
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Optional: clear auth tokens / localStorage here
    navigate("/candidate-signin");
  };

  return (
    <div className="h-dvh flex flex-col bg-[#0F1629] text-white border-r border-[#1E2A4A] shadow-2xl shadow-black/40 sticky top-0 z-30">
      {/* Header / Logo */}
      <div className="flex items-center justify-between p-5 border-b border-[#1E2A4A]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2B7FFF] to-[#1E90FF] flex items-center justify-center font-bold text-lg shadow-lg shadow-[#2B7FFF]/30 text-white">
            C
          </div>
          <div>
            <h1 className="font-semibold text-lg tracking-tight">Candidate Portal</h1>
            <p className="text-xs text-gray-400">Find your dream job</p>
          </div>
        </div>

        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-[#1A2342] transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
              className={`
                group flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300
                ${
                  isActive
                    ? "bg-gradient-to-r from-[#2B7FFF] to-[#1E90FF] text-white shadow-lg shadow-[#2B7FFF]/30"
                    : "text-gray-300 hover:bg-[#1A2342] hover:text-white hover:shadow-md hover:shadow-[#2B7FFF]/10 border border-transparent hover:border-[#2A3A5A]"
                }
              `}
            >
              <Icon
                className={`w-5 h-5 transition-colors ${
                  isActive ? "text-white" : "text-gray-400 group-hover:text-gray-200"
                }`}
              />
              <span>{item.name}</span>

              {isActive && (
                <div className="ml-auto w-2 h-2 rounded-full bg-white/80 shadow-sm" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout Section */}
      <div className="p-4 border-t border-[#1E2A4A]">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-300 hover:bg-red-950/30 hover:text-red-400 transition-all duration-300 group border border-transparent hover:border-red-900/50"
        >
          <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-400 transition-colors" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
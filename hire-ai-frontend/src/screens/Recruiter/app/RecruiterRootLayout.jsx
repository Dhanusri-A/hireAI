"use client";

import React, { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  ChevronDown,
  Bell,
  User,
  Briefcase,
  Users,
  Sparkles,
  ChevronRight,
  Search,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon } from "lucide-react";

export default function RecruiterRootLayout() {
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const getInitials = (name = "") => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();

  // Navigation Item with Hover Dropdown
  const NavDropdown = ({ title, children }) => (
    <div className="relative group flex items-center h-full cursor-pointer">
      <div className="flex items-center gap-1 text-gray-600 group-hover:text-emerald-600 font-semibold transition-colors">
        <span>{title}</span>
        <ChevronDown className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
      </div>

      {/* Dropdown Menu */}
      <div className="absolute top-full left-0 min-w-[200px] bg-white border border-gray-100 shadow-xl rounded-b-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        {children}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* 1. TOP NAVBAR */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 h-16">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/recruiter" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Briefcase className="text-white w-5 h-5" />
            </div>
            <span className="text-lg font-bold text-gray-900">Hire AI</span>
          </Link>

          {/* Hover Navigation */}
          <nav className="hidden md:flex items-center gap-8 h-full">
            <NavDropdown title="Jobs">
              <Link
                to="/recruiter/generate-jd"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Generate Job Description
              </Link>
              <Link
                to="/recruiter/my-jobs"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                My Listings
              </Link>
              <Link
                to="/recruiter/applications"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Applications
              </Link>
            </NavDropdown>

            <NavDropdown title="Candidates">
              <Link
                to="/recruiter"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Search Talent
              </Link>
              <Link
                to="/recruiter/create-profile"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Create Profile
              </Link>
              <Link
                to="/recruiter/resume-match"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Resume Matcher
              </Link>
            </NavDropdown>

            <NavDropdown title="Company">
              <Link
                to="/recruiter/profile"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Profile
              </Link>
              <Link
                to="/recruiter/contact"
                className="block px-4 py-2 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700"
              >
                Help Center
              </Link>
            </NavDropdown>
          </nav>

          <div className="relative group">
            <div className="flex items-center gap-3 cursor-pointer select-none">
              <span className="text-sm font-semibold text-gray-700 hidden sm:block">
                {user?.full_name || user?.username}
              </span>

              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                {getInitials(user?.full_name || user?.username)}
              </div>
            </div>

            {/* Dropdown */}
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-100 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              {/* User Info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>

              {/* Actions */}
              <button
                onClick={() => navigate("/recruiter/profile")}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 transition"
              >
                <UserIcon size={16} />
                View Profile
              </button>

              <button
                onClick={() => setShowLogoutDialog(true)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition rounded-b-xl"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 2. PERSISTENT HERO HEADER (Integrated Layout Header) */}

      {/* 3. PAGE CONTENT (Landing Page or others will inject here) */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <Outlet />
        </div>
      </main>
      {showLogoutDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Confirm Logout
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to log out of your account?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutDialog(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  logout();
                  setShowLogoutDialog(false);
                  navigate("/recruiter-signin", { replace: true });
                }}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/CandidateNavbar";
import Sidebar from "../components/CandidateSidebar";
import { Menu } from "lucide-react";

export default function RootLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change in mobile view
  useEffect(() => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Fixed on desktop, slide-in on mobile */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-auto
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top Navbar with mobile menu button */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-slate-200">
          <div className="flex items-center gap-4 px-4 py-3 lg:px-6">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="w-6 h-6" />
            </button>
            
            {/* Navbar content */}
            <div className="flex-1">
              <Navbar />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 md:px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-sm text-slate-500 text-center md:text-left">
                © {new Date().getFullYear()} Candidate Profile AI. All rights reserved.
              </p>

              <nav className="flex flex-wrap justify-center md:justify-end gap-4 md:gap-6">
                <Link
                  to="/privacy"
                  className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Privacy
                </Link>
                <Link
                  to="/terms"
                  className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Terms
                </Link>
                <Link
                  to="/refund"
                  className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Refund Policy
                </Link>
                <Link
                  to="/contact"
                  className="text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                  Contact
                </Link>
              </nav>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

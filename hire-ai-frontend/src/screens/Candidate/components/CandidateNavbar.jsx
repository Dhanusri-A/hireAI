'use client';

import { useState, useEffect, useRef } from "react";
import { Bell, Calendar, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";

export default function Navbar() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [username, setUsername] = useState("User");
  const [userInitial, setUserInitial] = useState("U");
  const notificationRef = useRef(null);

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const notifications = [
    {
      id: 1,
      title: "New job match found",
      time: "10 minutes ago",
      read: false,
    },
    {
      id: 2,
      title: "Your application was viewed",
      time: "1 hour ago",
      read: false,
    },
    {
      id: 3,
      title: "Profile update reminder",
      time: "3 hours ago",
      read: true,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      setUserInitial(storedUsername.charAt(0).toUpperCase());
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between w-full">
      {/* Left - Date (hidden on small mobile) */}
      <div className="hidden sm:flex items-center gap-2 text-slate-500">
        <Calendar className="w-4 h-4" />
        <span className="text-sm font-medium">{currentDate}</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Notifications</h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !notification.read ? "bg-blue-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 flex-shrink-0" />
                      )}
                      <div className={!notification.read ? "" : "ml-5"}>
                        <p className="text-sm font-medium text-slate-900">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                to="/notifications"
                className="block px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-slate-50 border-t border-slate-100"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>

        {/* User profile */}
        <Link
          to="/profile"
          className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm shadow-md">
            {userInitial}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-900 leading-tight">
              {username}
            </p>
            <p className="text-xs text-slate-500">Candidate</p>
          </div>
          <ChevronDown className="hidden md:block w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}

"use client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Mail, Phone, MapPin, Linkedin, Globe, Edit2, Building2,
  Users, Briefcase, Calendar, Twitter, Youtube, Tag,
  ExternalLink, Loader2,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { getRecruiterProfile } from "../../../api/api";

export default function RecruiterProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecruiterProfile()
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
    </div>
  );

  if (!profile) return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <Building2 className="w-12 h-12 text-gray-300 mb-4" />
      <p className="text-gray-500 mb-4">No company profile found.</p>
      <button
        onClick={() => navigate("/recruiter/company-setup")}
        className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
      >
        Set Up Company Profile
      </button>
    </div>
  );

  const fullName  = profile.full_name  || user?.full_name  || user?.username || "—";
  const email     = user?.email || "—";
  const location  = [profile.city, profile.country].filter(Boolean).join(", ");

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-emerald-600 to-teal-500" />

        <div className="p-6 -mt-16">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="w-24 h-24 bg-white rounded-2xl border-4 border-white shadow-lg flex items-center justify-center overflow-hidden">
                {profile.profile_photo_url
                  ? <img src={profile.profile_photo_url} alt={fullName} className="w-full h-full object-cover" />
                  : <Building2 className="w-12 h-12 text-emerald-600" />
                }
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-slate-900">{fullName}</h1>
                <p className="text-emerald-600 font-medium">{profile.job_title}</p>
                <p className="text-slate-500">{profile.company_name}</p>
              </div>
            </div>

            <button
              onClick={() => navigate("/recruiter/company-setup")}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          {/* Contact */}
          <div className="flex flex-wrap gap-4 mt-6 text-sm">
            <a href={`mailto:${email}`} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors">
              <Mail className="w-4 h-4" />{email}
            </a>
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 transition-colors">
                <Phone className="w-4 h-4" />{profile.phone}
              </a>
            )}
            {location && (
              <span className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4" />{location}
              </span>
            )}
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-3 mt-4">
            {profile.recruiter_linkedin && (
              <LinkPill href={profile.recruiter_linkedin} icon={Linkedin} label="LinkedIn" color="blue" />
            )}
            {profile.website && (
              <LinkPill href={profile.website} icon={Globe} label="Website" color="slate" />
            )}
            {profile.twitter_url && (
              <LinkPill href={profile.twitter_url} icon={Twitter} label="Twitter / X" color="sky" />
            )}
            {profile.glassdoor_url && (
              <LinkPill href={profile.glassdoor_url} icon={ExternalLink} label="Glassdoor" color="green" />
            )}
            {profile.video_url && (
              <LinkPill href={profile.video_url} icon={Youtube} label="Company Video" color="red" />
            )}
          </div>
        </div>
      </div>

      {/* Company Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-600" />
          About Company
        </h2>

        {profile.description && (
          <p className="text-slate-600 leading-relaxed mb-6">{profile.description}</p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {profile.industry && (
            <InfoTile icon={Briefcase} label="Industry" value={profile.industry} />
          )}
          {profile.company_size && (
            <InfoTile icon={Users} label="Company Size" value={profile.company_size} />
          )}
          {profile.company_type && (
            <InfoTile icon={Building2} label="Company Type" value={profile.company_type} />
          )}
          {profile.founded_year && (
            <InfoTile icon={Calendar} label="Founded" value={profile.founded_year} />
          )}
          {profile.headquarters && (
            <InfoTile icon={MapPin} label="Headquarters" value={profile.headquarters} />
          )}
          {profile.department && (
            <InfoTile icon={Briefcase} label="Department" value={profile.department} />
          )}
        </div>

        {/* Specializations */}
        {profile.specializations?.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Tag className="w-4 h-4 text-emerald-600" /> Specializations
            </p>
            <div className="flex flex-wrap gap-2">
              {profile.specializations.map((s) => (
                <span key={s} className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-sm font-medium">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hiring Preferences */}
      {(profile.hiring_roles?.length > 0 || profile.experience_levels?.length > 0 ||
        profile.employment_types?.length > 0 || profile.work_modes?.length > 0 ||
        profile.salary_range_min || profile.salary_range_max) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-emerald-600" />
            Hiring Preferences
          </h2>

          <div className="space-y-4">
            {profile.hiring_roles?.length > 0 && (
              <PrefRow label="Hiring Roles" items={profile.hiring_roles} color="blue" />
            )}
            {profile.experience_levels?.length > 0 && (
              <PrefRow label="Experience" items={profile.experience_levels} color="purple" />
            )}
            {profile.employment_types?.length > 0 && (
              <PrefRow label="Employment Type" items={profile.employment_types} color="amber" />
            )}
            {profile.work_modes?.length > 0 && (
              <PrefRow label="Work Mode" items={profile.work_modes} color="teal" />
            )}
            {(profile.salary_range_min || profile.salary_range_max) && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500 w-36 shrink-0">Salary Range</span>
                <span className="text-sm font-semibold text-slate-800">
                  {[profile.salary_range_min, profile.salary_range_max].filter(Boolean).join(" – ")}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LinkPill({ href, icon: Icon, label, color }) {
  const colors = {
    blue:  "bg-blue-50 text-blue-600 hover:bg-blue-100",
    slate: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    sky:   "bg-sky-50 text-sky-600 hover:bg-sky-100",
    green: "bg-green-50 text-green-700 hover:bg-green-100",
    red:   "bg-red-50 text-red-600 hover:bg-red-100",
  };
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${colors[color]}`}>
      <Icon className="w-4 h-4" />{label}
    </a>
  );
}

function InfoTile({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
      <Icon className="w-5 h-5 text-slate-400 shrink-0" />
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="font-medium text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function PrefRow({ label, items, color }) {
  const colors = {
    blue:   "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-purple-50 text-purple-700 border-purple-200",
    amber:  "bg-amber-50 text-amber-700 border-amber-200",
    teal:   "bg-teal-50 text-teal-700 border-teal-200",
  };
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-slate-500 w-36 shrink-0 pt-1">{label}</span>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[color]}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

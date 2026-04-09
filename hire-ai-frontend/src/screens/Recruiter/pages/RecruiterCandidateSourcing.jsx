// screens/Recruiter/pages/RecruiterCandidateSourcing.jsx
// Only the JdPickerModal and its selected-job display are changed.
// All other logic is identical to the original.
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, MapPin, ExternalLink, Heart, Mail, Loader2, Users,
  Briefcase, X, FileText, AlertCircle, Building2,
  ChevronFirst, ChevronLeft, ChevronRight, ChevronLast,
  Sparkles, PlusCircle, CheckCircle2, Hash, Copy,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  getRecruiterJobs, searchCandidatesByJob, searchCandidatesByInput, getRecruiterCandidates,
} from "../../../api/api";
import toast from "react-hot-toast";

import { RecruiterSearchBar }            from "../components/RecruiterSearchBar";
import { RecruiterAdvancedFilters }      from "../components/RecruiterAdvancedFilters";
import { RecruiterTableView }            from "../components/RecruiterTableView";
import { RecruiterCardView }             from "../components/RecruiterCardView";
import { RecruiterCandidateDetailPanel } from "../components/RecruiterCandidateDetailPanel";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  {
    id: "linkedin", label: "LinkedIn Results",
    color: "text-blue-700", badgeBg: "bg-blue-100 text-blue-700", underline: "bg-blue-600",
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    id: "talent-pool", label: "Talent Pool",
    color: "text-emerald-700", badgeBg: "bg-emerald-100 text-emerald-700",
    underline: "bg-gradient-to-r from-emerald-600 to-teal-600",
    icon: <Users className="w-4 h-4" />,
  },
];

const ITEMS_PER_PAGE = 10;
const STATUS_OPTIONS = ["All Status", "New", "Active", "In Pool", "Contacted", "Interview Scheduled", "High Potential"];
const LOCATION_OPTIONS = ["All Locations", "Singapore", "Bangalore", "Dubai", "Manila", "Kuala Lumpur", "Amsterdam", "San Francisco"];
const SOURCE_OPTIONS = ["All Sources", "LinkedIn", "Resume Upload", "Database"];
const EXPERIENCE_RANGES = [
  { label: "All Experience", min: 0, max: 100 },
  { label: "0-2 years", min: 0, max: 2 },
  { label: "3-5 years", min: 3, max: 5 },
  { label: "6-8 years", min: 6, max: 8 },
  { label: "9+ years", min: 9, max: 100 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRelativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const diffDays = Math.floor((new Date() - new Date(dateStr)) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7)  return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
}

function getStatusColor(status) {
  const map = {
    New: "bg-blue-100 text-blue-700 border-blue-200",
    Active: "bg-green-100 text-green-700 border-green-200",
    "In Pool": "bg-gray-100 text-gray-700 border-gray-200",
    Contacted: "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Interview Scheduled": "bg-purple-100 text-purple-700 border-purple-200",
    "High Potential": "bg-emerald-100 text-emerald-700 border-emerald-200",
    sourced:   "bg-gray-100 text-gray-700 border-gray-200",
    matched:   "bg-blue-100 text-blue-700 border-blue-200",
    screening: "bg-yellow-100 text-yellow-700 border-yellow-200",
    interview: "bg-purple-100 text-purple-700 border-purple-200",
    offer:     "bg-orange-100 text-orange-700 border-orange-200",
    hired:     "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return map[status] || "bg-gray-100 text-gray-700 border-gray-200";
}

function mapCandidate(c) {
  return {
    id: c.id,
    name: `${c.first_name || ""} ${c.last_name || ""}`.trim() || "Unknown Name",
    title: c.title || "Not specified",
    location: c.location || "Not specified",
    experience: parseInt((c.total_years_experience || "0").replace(/\D/g, "")) || 0,
    skills: c.skills ? c.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
    status: c.status,
    lastUpdated: getRelativeTime(c.updated_at),
    source: "Database",
    avatar: (c.first_name?.[0] || "") + (c.last_name?.[0] || ""),
    email: c.email || "No email",
    phone: c.phone || "No phone",
    summary: c.profile_summary || "No summary available",
    image_url: c.image_url,
    notice_period: c.notice_period || "N/A",
    expected_salary: c.expected_salary || "N/A",
    preferred_mode: c.preferred_mode || "N/A",
    profiles: c.profiles || {},
    languages: c.languages || {},
    education_records: c.education_records || [],
    work_experiences: c.work_experiences || [],
  };
}

function parseSearchResult(item) {
  const techKeywords = ["React","Node","Python","Java","Angular","Vue","TypeScript","JavaScript","MongoDB","PostgreSQL","AWS","Docker","Kubernetes","Next.js","HTML","CSS","Tailwind","Redux","GraphQL","REST","Git",".NET","C#","PHP","Laravel","React Native","Express","Firebase"];
  const haystack = `${item.job_title || ""} ${item.description || ""}`.toLowerCase();
  const skills = techKeywords.filter((kw) => haystack.includes(kw.toLowerCase()));
  const expMatch = (item.description || "").match(/(\d+)\s*years?/i);
  const experience = expMatch ? `${expMatch[1]} yrs` : "";
  const companyMatch = (item.description || "").match(/Experience:\s*([^·\n]+)/i);
  const company = companyMatch ? companyMatch[1].trim() : (item.company || "");
  return { id: item.source, name: item.name || "", jobTitle: item.job_title || "", location: item.location || "", description: item.description || "", link: item.source, company, experience, skills: skills.slice(0, 6) };
}

function getInitials(name) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
}

// ─── JD Picker Modal ──────────────────────────────────────────────────────────
function JdPickerModal({ isOpen, onClose, selectedJob, onSelect, userId, navigate }) {
  const [allJobs, setAllJobs]         = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoadingJobs(true);
    getRecruiterJobs(userId, { skip: 0, limit: 100 })
      .then((d) => setAllJobs(d || []))
      .catch(() => setAllJobs([]))
      .finally(() => setLoadingJobs(false));
  }, [isOpen, userId]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allJobs;
    const q = searchQuery.toLowerCase();
    return allJobs.filter((j) =>
      [j.job_title, j.company_name, j.location, j.department, j.level, j.input_description, String(j.id)]
        .filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
    );
  }, [allJobs, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <Briefcase className="w-6 h-6" /> Select Job Description
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
        </div>

        {/* Search */}
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, company, location, or JD ID…"
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" />
          </div>
          <p className="text-xs text-gray-400 mt-1.5 ml-1">Tip: paste a JD ID to jump directly to that job</p>
        </div>

        {/* Jobs grid */}
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {loadingJobs ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading jobs…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-14 h-14 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{searchQuery ? "No matching jobs" : "No jobs found"}</h3>
              <p className="text-gray-600 mb-6">{searchQuery ? "Try a different title or paste the JD ID" : "Create a job first"}</p>
              {!searchQuery && (
                <button onClick={() => { onClose(); navigate("/recruiter/generate-jd"); }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium inline-flex items-center gap-2 transition-colors">
                  <PlusCircle className="w-5 h-5" /> Create New Job
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((job) => (
                <div key={job.id}
                  onClick={() => { onSelect(job); onClose(); setSearchQuery(""); }}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    selectedJob?.id === job.id
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{job.job_title || "No title"}</h3>
                    {selectedJob?.id === job.id && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                  </div>

                  {/* ── JD ID badge ── */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded font-mono">
                      <Hash className="w-3 h-3" />{job.id}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(String(job.id)); toast.success("JD ID copied!"); }}
                      className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-600"
                      title="Copy JD ID">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                    {job.company_name && <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{job.company_name}</span>}
                    {job.location    && <span className="flex items-center gap-1"><MapPin    className="w-4 h-4" />{job.location}</span>}
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{job.input_description || "No description"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={onClose} className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors">Cancel</button>
          <button onClick={() => { onClose(); navigate("/recruiter/generate-jd"); }}
            className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 transition-colors">
            <PlusCircle className="w-5 h-5" /> New Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LinkedIn result card ─────────────────────────────────────────────────────
function LinkedInCard({ result, saved, onSave }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 overflow-hidden flex flex-col h-full">
      <div className="h-1.5 bg-gradient-to-r from-blue-600 to-blue-400" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-base flex-shrink-0">
            {getInitials(result.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 truncate leading-tight">{result.name}</h3>
            <p className="text-sm text-blue-700 font-medium truncate mt-0.5">{result.jobTitle}</p>
            {result.company && <p className="text-xs text-gray-500 truncate">{result.company}</p>}
          </div>
          <div className="flex-shrink-0 w-7 h-7 bg-blue-600 rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          {result.location   && <span className="flex items-center gap-1 truncate"><MapPin   className="w-3 h-3 flex-shrink-0" />{result.location}</span>}
          {result.experience && <span className="flex items-center gap-1 flex-shrink-0"><Briefcase className="w-3 h-3" />{result.experience}</span>}
        </div>
        <p className="text-xs text-gray-600 leading-relaxed mb-3 flex-1"
          style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {result.description || "No description available."}
        </p>
        {result.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {result.skills.map((s) => (
              <span key={s} className="px-2 py-0.5 rounded text-xs font-medium border bg-blue-50 text-blue-700 border-blue-200">{s}</span>
            ))}
          </div>
        )}
        <div className="flex gap-2 mt-auto">
          <a href={result.link} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> View Profile
          </a>
          <button onClick={() => onSave(result.id)}
            className={`p-2 rounded-lg border-2 transition-all ${saved ? "border-red-400 bg-red-50 text-red-500" : "border-gray-300 hover:border-red-300 text-gray-500 hover:text-red-500"}`}>
            <Heart className={`w-4 h-4 ${saved ? "fill-current" : ""}`} />
          </button>
          <button className="p-2 rounded-lg border-2 border-gray-300 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-all">
            <Mail className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── LinkedIn Results tab ─────────────────────────────────────────────────────
function LinkedInResultsTab({ results, hasSearched, searchLabel, savedIds, onSave }) {
  if (!hasSearched) {
    return (
      <div className="py-20 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Search className="w-8 h-8 text-gray-300" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Source candidates to see results</h3>
        <p className="text-sm text-gray-500">Use the sourcing panels above to find LinkedIn candidates</p>
      </div>
    );
  }
  if (results.length === 0) {
    return (
      <div className="py-16 text-center bg-white rounded-xl border border-gray-200">
        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Search className="w-7 h-7 text-gray-300" />
        </div>
        <h4 className="text-base font-semibold text-gray-900 mb-1">No candidates found</h4>
        <p className="text-sm text-gray-500">Try different search criteria or broaden your filters</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">Found <strong className="text-gray-900">{results.length}</strong> candidates{searchLabel && <> for <strong className="text-gray-900">"{searchLabel}"</strong></>}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
        {results.map((result) => (
          <LinkedInCard key={result.id} result={result} saved={savedIds.has(result.id)} onSave={onSave} />
        ))}
      </div>
    </div>
  );
}

// ─── Talent Pool tab ──────────────────────────────────────────────────────────
function TalentPoolTab({ searchLabel, searchLocation }) {
  const { user } = useAuth();
  const [candidates, setCandidates]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode]       = useState("table");
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate]   = useState(null);
  const [sortColumn, setSortColumn]   = useState("lastUpdated");
  const [sortDirection, setSortDirection] = useState("desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter]         = useState("All Status");
  const [locFilter, setLocFilter]               = useState("All Locations");
  const [sourceFilter, setSourceFilter]         = useState("All Sources");
  const [experienceFilter, setExperienceFilter] = useState("All Experience");
  const [selectedSkills, setSelectedSkills]     = useState([]);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);

  useEffect(() => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true);
    getRecruiterCandidates(user.id, { skip: 0, limit: 500 })
      .then((data) => setCandidates(data.map(mapCandidate)))
      .catch(() => setError("Failed to load talent pool"))
      .finally(() => setLoading(false));
  }, [user?.id]);

  useEffect(() => { if (searchLabel) { setSearchQuery(""); setCurrentPage(1); } }, [searchLabel]);

  const handleStatusUpdated = (candidateId, newStatus) => {
    setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, status: newStatus } : c));
    setSelectedCandidate((prev) => prev?.id === candidateId ? { ...prev, status: newStatus } : prev);
  };

  const allSkills = useMemo(() => { const set = new Set(); candidates.forEach((c) => c.skills.forEach((s) => set.add(s))); return Array.from(set).sort(); }, [candidates]);

  const filteredCandidates = useMemo(() => {
    let result = [...candidates];
    if (searchLabel?.trim()) { const q = searchLabel.toLowerCase(); result = result.filter((c) => c.title.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.skills.some((s) => s.toLowerCase().includes(q)) || (c.summary || "").toLowerCase().includes(q)); }
    if (searchLocation?.trim()) { const q = searchLocation.toLowerCase(); result = result.filter((c) => c.location.toLowerCase().includes(q)); }
    if (searchQuery.trim()) { const q = searchQuery.toLowerCase(); result = result.filter((c) => c.name.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.location.toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q) || c.skills.some((s) => s.toLowerCase().includes(q))); }
    if (selectedSkills.length > 0) result = result.filter((c) => selectedSkills.every((sel) => c.skills.some((s) => s.toLowerCase() === sel.toLowerCase())));
    if (statusFilter !== "All Status")  result = result.filter((c) => c.status === statusFilter);
    if (locFilter !== "All Locations")  result = result.filter((c) => c.location === locFilter);
    if (sourceFilter !== "All Sources") result = result.filter((c) => c.source === sourceFilter);
    const expRange = EXPERIENCE_RANGES.find((r) => r.label === experienceFilter);
    if (expRange && experienceFilter !== "All Experience") result = result.filter((c) => c.experience >= expRange.min && c.experience <= expRange.max);
    result.sort((a, b) => { const aVal = a[sortColumn], bVal = b[sortColumn]; if (typeof aVal === "string" && typeof bVal === "string") return sortDirection === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal); if (aVal < bVal) return sortDirection === "asc" ? -1 : 1; if (aVal > bVal) return sortDirection === "asc" ? 1 : -1; return 0; });
    return result;
  }, [candidates, searchLabel, searchLocation, searchQuery, selectedSkills, statusFilter, locFilter, sourceFilter, experienceFilter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredCandidates.length / ITEMS_PER_PAGE);
  const currentPageCandidates = filteredCandidates.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const hasActiveFilters = !!(searchQuery || statusFilter !== "All Status" || locFilter !== "All Locations" || sourceFilter !== "All Sources" || experienceFilter !== "All Experience" || selectedSkills.length > 0);
  const clearAllFilters = () => { setSearchQuery(""); setStatusFilter("All Status"); setLocFilter("All Locations"); setSourceFilter("All Sources"); setExperienceFilter("All Experience"); setSelectedSkills([]); setCurrentPage(1); };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto" /><p className="mt-3 text-gray-500 text-sm">Loading talent pool…</p></div></div>;
  if (error) return <p className="text-center text-red-500 py-10">{error}</p>;

  return (
    <div>
      {(searchLabel || searchLocation) && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
          <Search className="w-4 h-4 flex-shrink-0" />
          Filtering by sourcing criteria:
          {searchLabel   && <strong className="ml-1">"{searchLabel}"</strong>}
          {searchLocation && <><span className="mx-1">in</span><strong>"{searchLocation}"</strong></>}
          <span className="ml-1 text-emerald-600">— {filteredCandidates.length} match{filteredCandidates.length !== 1 ? "es" : ""}</span>
        </div>
      )}
      <div className="mb-4">
        <RecruiterSearchBar searchQuery={searchQuery} onSearchChange={(q) => { setSearchQuery(q); setCurrentPage(1); }} viewMode={viewMode} onViewModeChange={setViewMode} showAdvancedFilters={showAdvancedFilters} onToggleAdvancedFilters={() => setShowAdvancedFilters(!showAdvancedFilters)} hasActiveFilters={hasActiveFilters}
          filterCount={selectedSkills.length + (statusFilter !== "All Status" ? 1 : 0) + (locFilter !== "All Locations" ? 1 : 0) + (sourceFilter !== "All Sources" ? 1 : 0) + (experienceFilter !== "All Experience" ? 1 : 0) + (searchQuery ? 1 : 0)} />
        {showAdvancedFilters && (
          <RecruiterAdvancedFilters statusFilter={statusFilter} onStatusChange={(v) => { setStatusFilter(v); setCurrentPage(1); }} statusOptions={STATUS_OPTIONS}
            locationFilter={locFilter} onLocationChange={(v) => { setLocFilter(v); setCurrentPage(1); }} locationOptions={LOCATION_OPTIONS}
            sourceFilter={sourceFilter} onSourceChange={(v) => { setSourceFilter(v); setCurrentPage(1); }} sourceOptions={SOURCE_OPTIONS}
            experienceFilter={experienceFilter} onExperienceChange={(v) => { setExperienceFilter(v); setCurrentPage(1); }} experienceRanges={EXPERIENCE_RANGES}
            selectedSkills={selectedSkills} onToggleSkill={(skill) => { setSelectedSkills((p) => p.includes(skill) ? p.filter((s) => s !== skill) : [...p, skill]); setCurrentPage(1); }}
            skillSearchQuery={skillSearchQuery} onSkillSearchChange={setSkillSearchQuery}
            showSkillsDropdown={showSkillsDropdown} onShowSkillsDropdown={setShowSkillsDropdown}
            filteredSkillOptions={allSkills.filter((s) => s.toLowerCase().includes(skillSearchQuery.toLowerCase()) && !selectedSkills.includes(s))}
            hasActiveFilters={hasActiveFilters} filteredCount={filteredCandidates.length} totalCount={candidates.length} onClearFilters={clearAllFilters} />
        )}
      </div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-600">Showing <strong>{currentPageCandidates.length}</strong> of <strong>{filteredCandidates.length}</strong> candidates</p>
        {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />}
      </div>
      {viewMode === "table" ? (
        <RecruiterTableView candidates={currentPageCandidates} selectedCandidates={selectedCandidates}
          onSelectAll={() => setSelectedCandidates(selectedCandidates.length === currentPageCandidates.length ? [] : currentPageCandidates.map((c) => c.id))}
          onSelectCandidate={(id) => setSelectedCandidates((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id])}
          onCandidateClick={setSelectedCandidate} sortColumn={sortColumn} sortDirection={sortDirection}
          onSort={(col) => { if (sortColumn === col) setSortDirection(sortDirection === "asc" ? "desc" : "asc"); else { setSortColumn(col); setSortDirection("desc"); } setCurrentPage(1); }}
          getStatusColor={getStatusColor} onClearFilters={clearAllFilters} />
      ) : (
        <RecruiterCardView candidates={currentPageCandidates} selectedCandidates={selectedCandidates}
          onSelectCandidate={(id) => setSelectedCandidates((p) => p.includes(id) ? p.filter((c) => c !== id) : [...p, id])}
          onCandidateClick={setSelectedCandidate} getStatusColor={getStatusColor} onClearFilters={clearAllFilters} />
      )}
      {totalPages > 1 && <div className="flex justify-center mt-6"><Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} /></div>}
      {selectedCandidate && <RecruiterCandidateDetailPanel candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} getStatusColor={getStatusColor} onStatusUpdated={handleStatusUpdated} />}
      {showSkillsDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowSkillsDropdown(false)} />}
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="flex items-center gap-1">
      <button onClick={() => onPageChange(1)} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronFirst className="w-4 h-4" /></button>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
      <span className="text-sm text-gray-600 px-2">Page {currentPage} of {totalPages}</span>
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
      <button onClick={() => onPageChange(totalPages)} disabled={currentPage === totalPages} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"><ChevronLast className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RecruiterCandidateSourcing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("linkedin");
  const [selectedJob, setSelectedJob]   = useState(null);
  const [showJdModal, setShowJdModal]   = useState(false);
  const [sourcingByJd, setSourcingByJd] = useState(false);
  const [jdError, setJdError]           = useState(null);
  const [jobTitle, setJobTitle]         = useState("");
  const [location, setLocation]         = useState("");
  const [yearsOfExp, setYearsOfExp]     = useState("");
  const [sourcingByInput, setSourcingByInput] = useState(false);
  const [inputError, setInputError]     = useState(null);
  const [linkedInResults, setLinkedInResults] = useState(null);
  const [searchLabel, setSearchLabel]         = useState("");
  const [searchLocation, setSearchLocation]   = useState("");
  const [savedIds, setSavedIds]               = useState(new Set());
  const [hasSearched, setHasSearched]         = useState(false);

  const handleSourceByJd = async () => {
    if (!selectedJob) return;
    setSourcingByJd(true); setJdError(null); setLinkedInResults(null); setHasSearched(false);
    try {
      const data = await searchCandidatesByJob(selectedJob.id);
      const parsed = (data || []).filter((i) => i.name?.trim()).map(parseSearchResult);
      setLinkedInResults(parsed); setSearchLabel(selectedJob.job_title); setSearchLocation(selectedJob.location || ""); setHasSearched(true);
    } catch { setJdError("Failed to source candidates. Please try again."); }
    finally { setSourcingByJd(false); }
  };

  const handleSourceByInput = async () => {
    if (!jobTitle.trim()) return;
    setSourcingByInput(true); setInputError(null); setLinkedInResults(null); setHasSearched(false);
    try {
      const payload = { job_title: jobTitle.trim() };
      if (location.trim())   payload.location     = location.trim();
      if (yearsOfExp.trim()) payload.years_of_exp = yearsOfExp.trim();
      const data = await searchCandidatesByInput(payload);
      const parsed = (data || []).filter((i) => i.name?.trim()).map(parseSearchResult);
      setLinkedInResults(parsed); setSearchLabel(jobTitle.trim()); setSearchLocation(location.trim()); setHasSearched(true);
    } catch { setInputError("Failed to source candidates. Please try again."); }
    finally { setSourcingByInput(false); }
  };

  const toggleSave = (id) => setSavedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const isSearching = sourcingByJd || sourcingByInput;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Candidate Sourcing</h1>
              <p className="text-sm text-gray-500">Search LinkedIn or browse your Talent Pool</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            {/* Panel 1 — Source by JD */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" /> Source by Job Description
              </h2>
              <p className="text-xs text-gray-500 mb-4">Pick a saved JD to match candidates from LinkedIn &amp; your Talent Pool</p>

              {selectedJob ? (
                <div className="bg-emerald-50/60 border border-emerald-200 rounded-lg p-3.5 relative mb-4">
                  <button onClick={() => setSelectedJob(null)} className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>
                  <div className="flex items-start gap-3 pr-5">
                    <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0"><Briefcase className="w-4 h-4 text-emerald-600" /></div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{selectedJob.job_title}</p>

                      {/* ── JD ID badge ── */}
                      <div className="flex items-center gap-1.5 mt-1 mb-1">
                        <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded font-mono">
                          <Hash className="w-3 h-3" />{selectedJob.id}
                        </span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(String(selectedJob.id)); toast.success("JD ID copied!"); }}
                          className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-600"
                          title="Copy JD ID">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                        {selectedJob.company_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{selectedJob.company_name}</span>}
                        {selectedJob.location     && <span className="flex items-center gap-1"><MapPin    className="w-3 h-3" />{selectedJob.location}</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowJdModal(true)} className="mt-2 text-xs text-emerald-700 hover:text-emerald-800 font-medium transition-colors">Change Job</button>
                </div>
              ) : (
                <button onClick={() => setShowJdModal(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg font-medium text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 mb-4">
                  <Briefcase className="w-4 h-4" /> Select Job Description
                </button>
              )}

              {jdError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{jdError}
                </div>
              )}

              <button onClick={handleSourceByJd} disabled={!selectedJob || isSearching}
                className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${selectedJob && !isSearching ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                {sourcingByJd ? <><Loader2 className="w-4 h-4 animate-spin" />Sourcing…</> : <><Sparkles className="w-4 h-4" />Source Candidates</>}
              </button>
            </div>

            {/* Panel 2 — Source by Input */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-1 flex items-center gap-2">
                <Search className="w-4 h-4 text-blue-600" /> Source by Input
              </h2>
              <p className="text-xs text-gray-500 mb-4">Enter a job title and filters to search LinkedIn &amp; your Talent Pool</p>
              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Job Title <span className="text-red-500">*</span></label>
                  <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. React Developer"
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Location <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Coimbatore"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Experience <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input type="text" value={yearsOfExp} onChange={(e) => setYearsOfExp(e.target.value)} placeholder="e.g. 3"
                      className="w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" />
                  </div>
                </div>
              </div>
              {inputError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-3">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{inputError}
                </div>
              )}
              <button onClick={handleSourceByInput} disabled={!jobTitle.trim() || isSearching}
                className={`w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all ${jobTitle.trim() && !isSearching ? "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-sm active:scale-95" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}>
                {sourcingByInput ? <><Loader2 className="w-4 h-4 animate-spin" />Sourcing…</> : <><Search className="w-4 h-4" />Source Candidates</>}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const count = tab.id === "linkedin" && linkedInResults !== null ? linkedInResults.length : null;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm whitespace-nowrap relative transition-colors ${isActive ? tab.color : "text-gray-500 hover:text-gray-800"}`}>
                  {tab.icon}{tab.label}
                  {count !== null && <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab.badgeBg}`}>{count}</span>}
                  {isSearching && isActive && <Loader2 className="w-3 h-3 animate-spin" />}
                  {isActive && <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${tab.underline}`} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "linkedin" ? (
          <LinkedInResultsTab results={linkedInResults || []} hasSearched={hasSearched} searchLabel={searchLabel} savedIds={savedIds} onSave={toggleSave} />
        ) : (
          <TalentPoolTab searchLabel={searchLabel} searchLocation={searchLocation} />
        )}
      </div>

      <JdPickerModal
        isOpen={showJdModal} onClose={() => setShowJdModal(false)}
        selectedJob={selectedJob}
        onSelect={(job) => { setSelectedJob(job); setJdError(null); setLinkedInResults(null); setHasSearched(false); }}
        userId={user?.id} navigate={navigate}
      />
    </div>
  );
}

export { RecruiterCandidateSourcing };
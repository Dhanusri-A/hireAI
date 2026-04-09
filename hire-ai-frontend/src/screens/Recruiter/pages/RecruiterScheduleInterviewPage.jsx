// screens/Recruiter/pages/RecruiterScheduleInterviewPage.jsx
// FIX #4: Context is now preserved when navigating back between steps.
// All form state is lifted and stable — no resets on step change.
// useMemo used for expensive derived values (filtered candidates/jobs).
import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Trash2,
  ChevronRight,
  Check,
  Sparkles,
  X,
  Clock,
  Users,
  Briefcase,
  Mail,
  FileText,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Loader2,
  Settings2,
  Code2,
  Brain,
  Search,
  MapPin,
  Building2,
  PlusCircle,
  CheckCircle2,
  UserCircle2,
  ChevronFirst,
  ChevronLeft,
  ChevronLast,
  Edit3,
  Layers,
  Copy,
  Hash,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import {
  createInterview,
  getRecruiterJobs,
  getRecruiterCandidates,
} from "../../../api/api";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const INTERVIEW_TYPES = [
  "Screening",
  "Technical",
  "Online",
  "Onsite",
  "Phone",
  "Panel",
  "Final",
];
const SECTION_TYPES = ["technical", "behavioral", "coding"];
const DURATIONS = [
  "15 minutes",
  "30 minutes",
  "45 minutes",
  "60 minutes",
  "90 minutes",
  "120 minutes",
];
const SECONDS_OPTIONS = [20, 30, 40, 60, 90, 120];
const CANDIDATE_MODAL_PAGE_SIZE = 6;

const SECTION_ICONS = {
  technical: <Code2 className="w-4 h-4" />,
  behavioral: <Brain className="w-4 h-4" />,
  coding: <FileText className="w-4 h-4" />,
};
const SECTION_COLORS = {
  technical: "bg-blue-50 border-blue-200 text-blue-700",
  behavioral: "bg-purple-50 border-purple-200 text-purple-700",
  coding: "bg-amber-50 border-amber-200 text-amber-700",
};

function getStatusColor(status) {
  const colors = {
    sourced: "bg-gray-100 text-gray-600 border-gray-200",
    matched: "bg-blue-100 text-blue-700 border-blue-200",
    screening: "bg-yellow-100 text-yellow-700 border-yellow-200",
    interview: "bg-purple-100 text-purple-700 border-purple-200",
    offer: "bg-orange-100 text-orange-700 border-orange-200",
    hired: "bg-emerald-100 text-emerald-700 border-emerald-200",
  };
  return colors[status] || "bg-gray-100 text-gray-600 border-gray-200";
}

function mapCandidateForPicker(c) {
  return {
    id: c.id,
    name:
      ((c.first_name || "") + " " + (c.last_name || "")).trim() ||
      "Unknown Name",
    title: c.title || "Not specified",
    email: c.user?.email || c.email || "",
    phone: c.phone || "",
    location: c.location || "",
    status: c.status || "sourced",
    skills: c.skills
      ? c.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 4)
      : [],
    avatar:
      ((c.first_name?.[0] || "") + (c.last_name?.[0] || "")).toUpperCase() ||
      "?",
    image_url: c.image_url || null,
    experience: c.total_years_experience || "",
  };
}

// ─── Candidate Picker Modal ───────────────────────────────────────────────────
function CandidatePickerModal({
  isOpen,
  onClose,
  selectedCandidate,
  onSelect,
  userId,
  bulkMode = false,
  selectedCandidates = [],
  onBulkSelect,
}) {
  const [tab, setTab] = useState("pool");
  const [allCandidates, setAll] = useState([]);
  const [loadingCands, setLoading] = useState(false);
  const [searchQuery, setSearch] = useState("");
  const [currentPage, setPage] = useState(1);
  const [localSelected, setLocalSelected] = useState(
    bulkMode ? selectedCandidates : [],
  );
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    if (!isOpen || !userId) return;
    setLoading(true);
    getRecruiterCandidates(userId, { skip: 0, limit: 500 })
      .then((d) => setAll((d || []).map(mapCandidateForPicker)))
      .catch(() => setAll([]))
      .finally(() => setLoading(false));
  }, [isOpen, userId]);

  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setPage(1);
      setManualName("");
      setManualEmail("");
      setManualError("");
      if (bulkMode) setLocalSelected(selectedCandidates);
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return allCandidates;
    const q = searchQuery.toLowerCase();
    return allCandidates.filter((c) =>
      [c.name, c.title, c.email, c.location, ...(c.skills || [])]
        .filter(Boolean)
        .some((f) => f.toLowerCase().includes(q)),
    );
  }, [allCandidates, searchQuery]);

  const totalPages = Math.ceil(filtered.length / CANDIDATE_MODAL_PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * CANDIDATE_MODAL_PAGE_SIZE,
    currentPage * CANDIDATE_MODAL_PAGE_SIZE,
  );
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const toggleLocalSelect = (cand) => {
    setLocalSelected((prev) => {
      const exists = prev.find((c) => c.id === cand.id);
      if (exists) return prev.filter((c) => c.id !== cand.id);
      return [...prev, cand];
    });
  };

  const handleManualSubmit = () => {
    if (!manualName.trim()) {
      setManualError("Candidate name is required.");
      return;
    }
    if (
      !manualEmail.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(manualEmail)
    ) {
      setManualError("A valid email address is required.");
      return;
    }
    const manualCand = {
      id: null,
      name: manualName.trim(),
      email: manualEmail.trim(),
      manual: true,
    };
    if (bulkMode) {
      onBulkSelect([...localSelected, manualCand]);
    } else {
      onSelect(manualCand);
    }
    onClose();
  };

  const handleConfirmBulk = () => {
    onBulkSelect(localSelected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <Users className="w-6 h-6" />
            {bulkMode ? "Select Multiple Candidates" : "Select Candidate"}
          </h2>
          <div className="flex items-center gap-3">
            {bulkMode && localSelected.length > 0 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                {localSelected.length} selected
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="flex border-b border-gray-200 flex-shrink-0 bg-white">
          {[
            {
              id: "pool",
              icon: <Layers className="w-4 h-4" />,
              label: "From Talent Pool",
            },
            {
              id: "manual",
              icon: <Edit3 className="w-4 h-4" />,
              label: "Enter Manually",
            },
          ].map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${tab === id ? "border-emerald-600 text-emerald-700 bg-emerald-50/50" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {tab === "pool" && (
          <>
            <div className="p-4 bg-white border-b border-gray-100 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search name, title, email, skills…"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {bulkMode && (
                <p className="text-xs text-blue-600 mt-1.5 ml-1 font-medium">
                  Click candidates to select multiple for bulk scheduling
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
              {loadingCands ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mb-3" />
                  <p className="text-gray-500 text-sm">Loading candidates…</p>
                </div>
              ) : paginated.length === 0 ? (
                <div className="text-center py-16">
                  <UserCircle2 className="w-14 h-14 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-base font-semibold text-gray-800 mb-1">
                    {searchQuery
                      ? "No matching candidates"
                      : "No candidates yet"}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">
                    {searchQuery
                      ? "Try different keywords"
                      : "Add candidates to your talent pool first"}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={() => setTab("manual")}
                      className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors inline-flex items-center gap-2"
                    >
                      <Edit3 className="w-4 h-4" /> Enter Manually Instead
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paginated.map((cand) => {
                    const isSelected = bulkMode
                      ? localSelected.some((c) => c.id === cand.id)
                      : selectedCandidate?.id === cand.id;
                    return (
                      <div
                        key={cand.id}
                        onClick={() => {
                          if (bulkMode) toggleLocalSelect(cand);
                          else {
                            onSelect(cand);
                            onClose();
                          }
                        }}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all group ${isSelected ? "border-emerald-500 bg-emerald-50 shadow-md" : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {cand.image_url ? (
                              <img
                                src={cand.image_url}
                                alt={cand.name}
                                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                              />
                            ) : (
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 border-white ${isSelected ? "bg-emerald-600 text-white" : "bg-gray-200 text-gray-600 group-hover:bg-emerald-100 group-hover:text-emerald-700"}`}
                              >
                                {cand.avatar || "?"}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <p className="font-semibold text-gray-900 text-sm truncate">
                                {cand.name}
                              </p>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {cand.title}
                            </p>
                            {cand.email && (
                              <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 flex-shrink-0" />
                                {cand.email}
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${getStatusColor(cand.status)}`}
                              >
                                {cand.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
                <p className="text-xs text-gray-500">
                  Page <strong>{currentPage}</strong> of{" "}
                  <strong>{totalPages}</strong>
                </p>
                <div className="flex items-center gap-1">
                  <PaginationBtn
                    icon={ChevronFirst}
                    onClick={() => setPage(1)}
                    disabled={currentPage === 1}
                  />
                  <PaginationBtn
                    icon={ChevronLeft}
                    onClick={() => setPage((p) => p - 1)}
                    disabled={currentPage === 1}
                  />
                  <PaginationBtn
                    icon={ChevronRight}
                    onClick={() => setPage((p) => p + 1)}
                    disabled={currentPage === totalPages}
                  />
                  <PaginationBtn
                    icon={ChevronLast}
                    onClick={() => setPage(totalPages)}
                    disabled={currentPage === totalPages}
                  />
                </div>
              </div>
            )}
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {allCandidates.length} candidate
                {allCandidates.length !== 1 ? "s" : ""} in pool
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                {bulkMode && (
                  <button
                    onClick={handleConfirmBulk}
                    disabled={localSelected.length === 0}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Confirm{" "}
                    {localSelected.length > 0
                      ? `(${localSelected.length})`
                      : ""}
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {tab === "manual" && (
          <>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="max-w-md mx-auto">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    {bulkMode
                      ? "Enter one candidate manually to add to your bulk list."
                      : "Enter details for a candidate not yet in your talent pool."}
                  </p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <UserCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={manualName}
                        onChange={(e) => {
                          setManualName(e.target.value);
                          setManualError("");
                        }}
                        placeholder="e.g. Jane Smith"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        value={manualEmail}
                        onChange={(e) => {
                          setManualEmail(e.target.value);
                          setManualError("");
                        }}
                        placeholder="e.g. jane@example.com"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleManualSubmit()
                        }
                      />
                    </div>
                  </div>
                  {manualError && (
                    <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {manualError}
                    </div>
                  )}
                </div>
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs text-gray-400 bg-gray-50 px-3">
                    or
                  </div>
                </div>
                <button
                  onClick={() => setTab("pool")}
                  className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-xl text-sm text-emerald-700 font-medium hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4" /> Pick from Talent Pool
                </button>
              </div>
            </div>
            <div className="flex-shrink-0 bg-gray-50 border-t border-gray-200 px-4 py-3 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleManualSubmit}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                {bulkMode ? "Add to List" : "Use This Candidate"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PaginationBtn({ icon: Icon, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

// ─── JD Picker Modal ──────────────────────────────────────────────────────────
function JdPickerModal({
  isOpen,
  onClose,
  selectedJob,
  onSelect,
  userId,
  navigate,
}) {
  const [allJobs, setAllJobs] = useState([]);
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
      [
        j.job_title,
        j.company_name,
        j.location,
        j.department,
        j.level,
        j.input_description,
        String(j.id),
      ]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(q)),
    );
  }, [allJobs, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <Briefcase className="w-6 h-6" /> Select Job Description
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, company, location, or JD ID…"
              className="w-full pl-11 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {loadingJobs ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-10 h-10 text-emerald-600 animate-spin mb-4" />
              <p className="text-gray-600 text-sm">Loading jobs…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Briefcase className="w-14 h-14 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? "No matching jobs" : "No jobs found"}
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchQuery
                  ? "Try a different title or paste the JD ID"
                  : "Create a job description first"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => {
                    onClose();
                    navigate("/recruiter/generate-jd");
                  }}
                  className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium inline-flex items-center gap-2 text-sm transition-colors"
                >
                  <PlusCircle className="w-5 h-5" /> Create New Job
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((job) => (
                <div
                  key={job.id}
                  onClick={() => {
                    onSelect(job);
                    onClose();
                    setSearchQuery("");
                  }}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    selectedJob?.id === job.id
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm">
                      {job.job_title || "No title"}
                    </h3>
                    {selectedJob?.id === job.id && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded font-mono">
                      <Hash className="w-3 h-3" />
                      {job.id}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(String(job.id));
                        toast.success("JD ID copied!");
                      }}
                      className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-600"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                    {job.company_name && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" />
                        {job.company_name}
                      </span>
                    )}
                    {job.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {job.location}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {job.input_description || "No description"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onClose();
              navigate("/recruiter/generate-jd");
            }}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> New Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ step }) {
  const steps = ["Candidate Info", "Date & Time", "Sections", "Review"];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => {
        const s = i + 1;
        const done = step > s;
        const active = step === s;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${done ? "bg-emerald-600 border-emerald-600 text-white" : active ? "bg-white border-emerald-600 text-emerald-600" : "bg-white border-gray-300 text-gray-400"}`}
              >
                {done ? <Check className="w-4 h-4" /> : s}
              </div>
              <span
                className={`text-xs mt-1 font-medium whitespace-nowrap ${active ? "text-emerald-700" : done ? "text-emerald-500" : "text-gray-400"}`}
              >
                {label}
              </span>
            </div>
            {s < steps.length && (
              <div
                className={`flex-1 h-0.5 mb-5 mx-1 ${done ? "bg-emerald-500" : "bg-gray-200"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Section editor ───────────────────────────────────────────────────────────
function SectionCard({ section, idx, onChange, onRemove, canRemove }) {
  const [newQ, setNewQ] = useState("");
  const addCustomQ = () => {
    const q = newQ.trim();
    if (!q) return;
    onChange({
      ...section,
      custom_questions: [...(section.custom_questions || []), q],
    });
    setNewQ("");
  };
  const removeCustomQ = (qi) =>
    onChange({
      ...section,
      custom_questions: section.custom_questions.filter((_, i) => i !== qi),
    });
  const colorClass =
    SECTION_COLORS[section.type] || "bg-gray-50 border-gray-200 text-gray-700";

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div
        className={`flex items-center justify-between px-5 py-3 border-b ${colorClass}`}
      >
        <div className="flex items-center gap-2 font-semibold capitalize">
          {SECTION_ICONS[section.type]}
          Section {idx + 1} — {section.type}
          <span className="text-xs font-normal opacity-70">
            ·{" "}
            {section.is_follow_up
              ? section.no_of_questions * 2
              : section.no_of_questions}
            Q
          </span>
        </div>
        {canRemove && (
          <button
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-100 text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Section Type
            </label>
            <select
              value={section.type}
              onChange={(e) => onChange({ ...section, type: e.target.value })}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              {SECTION_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              No. of Questions
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={section.no_of_questions}
              onChange={(e) =>
                onChange({
                  ...section,
                  no_of_questions: Math.max(1, parseInt(e.target.value) || 1),
                })
              }
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            {section.is_follow_up && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                → {section.no_of_questions * 2} total (incl. follow-ups)
              </p>
            )}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            <Clock className="w-3 h-3 inline mr-1" />
            Seconds Per Question
          </label>
          <div className="flex flex-wrap gap-2">
            {SECONDS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() =>
                  onChange({ ...section, seconds_per_question: s })
                }
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${section.seconds_per_question === s ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 text-gray-600 hover:border-emerald-400"}`}
              >
                {s}s
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-200">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              Enable Follow-up Questions
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              AI generates 1 follow-up after each answer
            </p>
          </div>
          <button
            onClick={() =>
              onChange({ ...section, is_follow_up: !section.is_follow_up })
            }
            className={`transition-colors ${section.is_follow_up ? "text-emerald-600" : "text-gray-400"}`}
          >
            {section.is_follow_up ? (
              <ToggleRight className="w-8 h-8" />
            ) : (
              <ToggleLeft className="w-8 h-8" />
            )}
          </button>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2">
            Custom Questions{" "}
            <span className="font-normal text-gray-400">
              (optional — AI fills the rest)
            </span>
          </label>
          <div className="space-y-2 mb-2">
            {(section.custom_questions || []).map((q, qi) => (
              <div
                key={qi}
                className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                  {qi + 1}
                </span>
                <p className="flex-1 text-sm text-gray-800 leading-snug">{q}</p>
                <button
                  onClick={() => removeCustomQ(qi)}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newQ}
              onChange={(e) => setNewQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomQ()}
              placeholder="Type a custom question and press Enter or Add"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <button
              onClick={addCustomQ}
              disabled={!newQ.trim()}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}

function SelectedJobCard({ job, onClear, onChangeJob }) {
  return (
    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 relative">
      <button
        onClick={onClear}
        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
          <Briefcase className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {job.job_title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 mb-1">
            <span className="flex items-center gap-1 text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded font-mono">
              <Hash className="w-3 h-3" />
              {job.id}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(String(job.id));
                toast.success("JD ID copied!");
              }}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-600"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {job.company_name && (
              <span className="flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                {job.company_name}
              </span>
            )}
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {job.location}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onChangeJob}
        className="mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
      >
        Change Job
      </button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
function makeSection() {
  return {
    type: "technical",
    no_of_questions: 5,
    custom_questions: [],
    is_follow_up: false,
    seconds_per_question: 40,
  };
}

export default function RecruiterScheduleInterviewPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [scheduleMode, setScheduleMode] = useState("single");

  // FIX #4: All form state is defined at top level — never reset when changing steps.
  // Step navigation only changes `step`, never re-initializes form values.
  const [form, setForm] = useState({
    job_title: "",
    interview_type: "Technical",
    duration: "45 minutes",
    meeting_location: "Zoom",
    notes: "",
    date: "",
    time: "",
  });

  const [selectedCandidateFromPool, setSelectedCandidateFromPool] =
    useState(null);
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [bulkCandidates, setBulkCandidates] = useState([]);
  const [bulkInputName, setBulkInputName] = useState("");
  const [bulkInputEmail, setBulkInputEmail] = useState("");
  const [bulkInputError, setBulkInputError] = useState("");
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJdModal, setShowJdModal] = useState(false);
  const [sections, setSections] = useState([makeSection()]);

  // Stable update helpers — won't cause child re-renders unnecessarily
  const update = useCallback(
    (field, value) => setForm((p) => ({ ...p, [field]: value })),
    [],
  );

  const handleSelectSingleCandidate = useCallback((cand) => {
    setSelectedCandidateFromPool(cand);
    setSingleName(cand.name);
    setSingleEmail(cand.email);
  }, []);

  const clearSingleCandidate = useCallback(() => {
    setSelectedCandidateFromPool(null);
    setSingleName("");
    setSingleEmail("");
  }, []);

  const addBulkManual = useCallback(() => {
    if (!bulkInputName.trim()) {
      setBulkInputError("Name is required.");
      return;
    }
    if (
      !bulkInputEmail.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bulkInputEmail)
    ) {
      setBulkInputError("Valid email required.");
      return;
    }
    setBulkCandidates((prev) => [
      ...prev,
      { name: bulkInputName.trim(), email: bulkInputEmail.trim() },
    ]);
    setBulkInputName("");
    setBulkInputEmail("");
    setBulkInputError("");
  }, [bulkInputName, bulkInputEmail]);

  const removeBulkCandidate = useCallback(
    (idx) => setBulkCandidates((prev) => prev.filter((_, i) => i !== idx)),
    [],
  );

  const handleBulkPoolSelect = useCallback((selected) => {
    const mapped = selected.map((c) => ({ name: c.name, email: c.email }));
    setBulkCandidates((prev) => {
      const existing = new Set(prev.map((c) => c.email));
      return [...prev, ...mapped.filter((c) => !existing.has(c.email))];
    });
  }, []);

  // Memoized validation — recalculates only when relevant state changes
  const step1Valid = useMemo(
    () =>
      !!selectedJob &&
      (scheduleMode === "single"
        ? !!(singleName.trim() && singleEmail.trim())
        : bulkCandidates.length > 0),
    [selectedJob, scheduleMode, singleName, singleEmail, bulkCandidates],
  );
  const step2Valid = useMemo(
    () => !!(form.date && form.time),
    [form.date, form.time],
  );
  const step3Valid = useMemo(
    () => sections.length > 0 && sections.every((s) => s.no_of_questions >= 1),
    [sections],
  );

  const addSection = useCallback(
    () => setSections((p) => [...p, makeSection()]),
    [],
  );
  const updateSection = useCallback(
    (i, s) => setSections((p) => p.map((x, xi) => (xi === i ? s : x))),
    [],
  );
  const removeSection = useCallback(
    (i) => setSections((p) => p.filter((_, xi) => xi !== i)),
    [],
  );

  // FIX #3: 24-hour scheduling window logic
  // The interview is schedulable anytime within 24 hours of the scheduled time.
  // We don't block by time — just require date + time fields to be filled.
  // Backend should validate that the interview hasn't expired (>24h past scheduled time).
  const handleSubmit = async () => {
    setLoading(true);
    try {
      const localDateTimeStr = `${form.date}T${form.time}:00`;
      const utcISO = new Date(localDateTimeStr).toISOString();
      const utcDate = utcISO.split("T")[0];
      const utcTime = utcISO.split("T")[1].slice(0, 8);
      const sectionPayload = sections.map((s, i) => ({
        type: s.type,
        no_of_questions: s.no_of_questions,
        custom_questions: s.custom_questions?.length
          ? s.custom_questions
          : null,
        is_follow_up: s.is_follow_up,
        seconds_per_question: s.seconds_per_question,
        order_index: i, // ← add this
      }));

      if (scheduleMode === "single") {
        await createInterview({
          job_id: selectedJob.id,
          candidate_name: singleName,
          candidate_email: singleEmail,
          job_title: selectedJob.job_title || form.job_title,
          interview_type: form.interview_type,
          date: utcDate,
          time: utcTime,
          duration: form.duration,
          meeting_location: form.meeting_location,
          notes: form.notes,
          sections: sectionPayload,
        });
        toast.success("Interview scheduled successfully!");
      } else {
        let successCount = 0,
          failCount = 0;
        for (const cand of bulkCandidates) {
          try {
            await createInterview({
              job_id: selectedJob.id,
              candidate_name: cand.name,
              candidate_email: cand.email,
              job_title: selectedJob.job_title || form.job_title,
              interview_type: form.interview_type,
              date: utcDate,
              time: utcTime,
              duration: form.duration,
              meeting_location: form.meeting_location,
              notes: form.notes,
              sections: sectionPayload,
            });
            successCount++;
          } catch {
            failCount++;
          }
        }
        if (successCount > 0)
          toast.success(
            `${successCount} interview${successCount > 1 ? "s" : ""} scheduled!`,
          );
        if (failCount > 0)
          toast.error(
            `${failCount} interview${failCount > 1 ? "s" : ""} failed.`,
          );
      }
      navigate("/recruiter/schedule-interview");
    } catch (err) {
      toast.error(
        err?.detail || err?.message || "Failed to schedule interview",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="py-5 px-8 flex items-center gap-3">
          <button
            onClick={() => navigate("/recruiter/schedule-interview")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Schedule New Interview
            </h1>
            <p className="text-sm text-gray-500">
              Configure candidate, timing and section details
            </p>
          </div>
        </div>
      </div>

      <div className="px-8 py-8">
        <StepBar step={step} />

        {/* ── STEP 1: Candidate Info ── */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Candidate &amp; Job Details
            </h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Scheduling Mode
              </label>
              <div className="flex gap-3">
                {[
                  {
                    id: "single",
                    icon: <UserCircle2 className="w-4 h-4" />,
                    label: "Single Candidate",
                  },
                  {
                    id: "bulk",
                    icon: <Users className="w-4 h-4" />,
                    label: "Bulk Candidates",
                  },
                ].map(({ id, icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setScheduleMode(id)}
                    className={`flex-1 py-3 px-4 border-2 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${scheduleMode === id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-emerald-300"}`}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
            </div>

            {scheduleMode === "single" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Candidate <span className="text-red-500">*</span>
                  </label>
                  {selectedCandidateFromPool ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 relative">
                      <button
                        onClick={clearSingleCandidate}
                        className="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="flex items-start gap-3 pr-6">
                        <div className="flex-shrink-0">
                          {selectedCandidateFromPool.image_url ? (
                            <img
                              src={selectedCandidateFromPool.image_url}
                              alt={selectedCandidateFromPool.name}
                              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center text-sm font-bold shadow-sm">
                              {selectedCandidateFromPool.avatar || "?"}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900 text-sm">
                              {selectedCandidateFromPool.name}
                            </p>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${getStatusColor(selectedCandidateFromPool.status)}`}
                            >
                              {selectedCandidateFromPool.manual
                                ? "Manual entry"
                                : selectedCandidateFromPool.status}
                            </span>
                          </div>
                          {selectedCandidateFromPool.email && (
                            <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail className="w-3 h-3" />
                              {selectedCandidateFromPool.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCandidateModal(true)}
                        className="mt-2 text-xs text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
                      >
                        Change Candidate
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowCandidateModal(true)}
                      className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                    >
                      <Users className="w-4 h-4" /> Select or Enter Candidate
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Candidate Name <span className="text-red-500">*</span>
                      {selectedCandidateFromPool && (
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          (auto-filled)
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                      placeholder="John Doe"
                      readOnly={
                        !!selectedCandidateFromPool &&
                        !selectedCandidateFromPool.manual
                      }
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${selectedCandidateFromPool && !selectedCandidateFromPool.manual ? "bg-gray-50 text-gray-600" : ""}`}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Candidate Email <span className="text-red-500">*</span>
                      {selectedCandidateFromPool && (
                        <span className="text-xs font-normal text-gray-400 ml-1">
                          (auto-filled)
                        </span>
                      )}
                    </label>
                    <input
                      type="email"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      placeholder="john@example.com"
                      readOnly={
                        !!selectedCandidateFromPool &&
                        !selectedCandidateFromPool.manual
                      }
                      className={`w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${selectedCandidateFromPool && !selectedCandidateFromPool.manual ? "bg-gray-50 text-gray-600" : ""}`}
                    />
                  </div>
                </div>
              </div>
            )}

            {scheduleMode === "bulk" && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    All candidates will receive the same interview
                    configuration. Each gets separate login credentials via
                    email.
                  </p>
                </div>
                <button
                  onClick={() => setShowCandidateModal(true)}
                  className="w-full py-3 px-4 border-2 border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-700 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all hover:bg-emerald-50"
                >
                  <Layers className="w-4 h-4" /> Add from Talent Pool
                </button>
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600 mb-3">
                    Add Manually
                  </p>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={bulkInputName}
                        onChange={(e) => {
                          setBulkInputName(e.target.value);
                          setBulkInputError("");
                        }}
                        placeholder="Full Name"
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="email"
                        value={bulkInputEmail}
                        onChange={(e) => {
                          setBulkInputEmail(e.target.value);
                          setBulkInputError("");
                        }}
                        placeholder="Email Address"
                        onKeyDown={(e) => e.key === "Enter" && addBulkManual()}
                        className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={addBulkManual}
                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 flex-shrink-0"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>
                  {bulkInputError && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {bulkInputError}
                    </p>
                  )}
                </div>
                {bulkCandidates.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">
                        {bulkCandidates.length} Candidate
                        {bulkCandidates.length > 1 ? "s" : ""} Added
                      </p>
                      <button
                        onClick={() => setBulkCandidates([])}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {bulkCandidates.map((cand, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between px-4 py-2.5 bg-white border border-gray-200 rounded-lg"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {cand.name?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {cand.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {cand.email}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeBulkCandidate(idx)}
                            className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 ml-2"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Job Description <span className="text-red-500">*</span>
              </label>
              {selectedJob ? (
                <SelectedJobCard
                  job={selectedJob}
                  onClear={() => {
                    setSelectedJob(null);
                    update("job_title", "");
                  }}
                  onChangeJob={() => setShowJdModal(true)}
                />
              ) : (
                <button
                  onClick={() => setShowJdModal(true)}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-medium text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                >
                  <Briefcase className="w-4 h-4" /> Select Job Description
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Interview Type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERVIEW_TYPES.map((t) => (
                  <button
                    key={t}
                    onClick={() => update("interview_type", t)}
                    className={`px-4 py-2 border-2 rounded-lg text-sm font-medium transition-all ${form.interview_type === t ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-gray-200 text-gray-600 hover:border-emerald-300"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Duration
              </label>
              <select
                value={form.duration}
                onChange={(e) => update("duration", e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                {DURATIONS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Notes / Instructions
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => update("notes", e.target.value)}
                rows={3}
                placeholder="Add preparation notes, focus areas, etc."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* ── STEP 2: Date & Time ── */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 space-y-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              Date &amp; Time
            </h2>

            {/* FIX #4: Show persisted job/candidate summary on step 2 */}
            {selectedJob && (
              <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                <Briefcase className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {selectedJob.job_title}
                  </p>
                  <span className="text-xs font-mono text-gray-400 flex items-center gap-1 mt-0.5">
                    <Hash className="w-3 h-3" />
                    {selectedJob.id}
                  </span>
                </div>
                {(singleName || bulkCandidates.length > 0) && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">
                      {scheduleMode === "single"
                        ? singleName
                        : `${bulkCandidates.length} candidates`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {scheduleMode === "bulk" && bulkCandidates.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  All <strong>{bulkCandidates.length} candidates</strong> will
                  be scheduled at the same date and time.
                </p>
              </div>
            )}

            {/* FIX #3: 24-hour window notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-900">
                <p className="font-semibold mb-1">24-Hour Interview Window</p>
                <p className="text-xs text-emerald-800">
                  The candidate can attend this interview anytime within{" "}
                  <strong>24 hours</strong> of the scheduled time. The link will
                  expire automatically after 24 hours.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => update("date", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Time <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => update("time", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
            {form.date && form.time && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                Window opens:{" "}
                <strong>
                  {new Date(`${form.date}T${form.time}`).toLocaleString()}
                </strong>{" "}
                &nbsp;→&nbsp; Expires:{" "}
                <strong>
                  {new Date(
                    new Date(`${form.date}T${form.time}`).getTime() +
                      24 * 60 * 60 * 1000,
                  ).toLocaleString()}
                </strong>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
              <strong>Timezone note:</strong> You are scheduling in{" "}
              <strong>
                {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </strong>
              . The candidate will see this in their local timezone.
            </div>
          </div>
        )}

        {/* ── STEP 3: Sections ── */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-emerald-600" />
                  Interview Sections
                </h2>
                <button
                  onClick={addSection}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Add Section
                </button>
              </div>
              {/* FIX #4: Persisted context shown on step 3 */}
              {selectedJob && (
                <div className="flex items-center gap-2 mt-3 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg">
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-xs text-gray-600 font-medium truncate">
                    {selectedJob.job_title}
                  </span>
                  <span className="text-xs font-mono text-gray-400 flex-shrink-0 flex items-center gap-0.5">
                    <Hash className="w-3 h-3" />
                    {selectedJob.id}
                  </span>
                  {scheduleMode === "single" && singleName && (
                    <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                      {singleName}
                    </span>
                  )}
                  {scheduleMode === "bulk" && bulkCandidates.length > 0 && (
                    <span className="ml-auto text-xs text-gray-500 flex-shrink-0">
                      {bulkCandidates.length} candidates
                    </span>
                  )}
                </div>
              )}
              <p className="text-sm text-gray-500 mt-2">
                Configure each section independently. AI generates questions for
                any gap between custom and total count.
              </p>
            </div>
            {sections.map((section, i) => (
              <SectionCard
                key={i}
                idx={i}
                section={section}
                onChange={(s) => updateSection(i, s)}
                onRemove={() => removeSection(i)}
                canRemove={sections.length > 1}
              />
            ))}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Section Summary
              </p>
              <div className="flex flex-wrap gap-2">
                {sections.map((s, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium ${SECTION_COLORS[s.type]}`}
                  >
                    {SECTION_ICONS[s.type]}
                    {s.type} ·{" "}
                    {s.is_follow_up ? s.no_of_questions * 2 : s.no_of_questions}
                    Q · {s.seconds_per_question}s
                    {s.is_follow_up && (
                      <span className="ml-1 px-1 bg-white rounded text-xs">
                        incl. follow-ups
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 4: Review ── */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7">
              <h2 className="text-lg font-bold text-gray-900 mb-4">
                Review &amp; Confirm
              </h2>
              <div className="space-y-1 mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Job
                </p>
                <ReviewRow
                  label="Job Title"
                  value={selectedJob?.job_title || "—"}
                />
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-500">JD ID</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                      {selectedJob?.id || "—"}
                    </span>
                    {selectedJob?.id && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(String(selectedJob.id));
                          toast.success("JD ID copied!");
                        }}
                        className="p-0.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <ReviewRow
                  label="Company"
                  value={selectedJob?.company_name || "—"}
                />
                <ReviewRow label="Type" value={form.interview_type} />
              </div>

              {scheduleMode === "single" ? (
                <div className="space-y-1 mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Candidate
                  </p>
                  <ReviewRow label="Name" value={singleName} />
                  <ReviewRow label="Email" value={singleEmail} />
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Candidates ({bulkCandidates.length})
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {bulkCandidates.map((c, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1.5 px-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <span className="text-sm font-medium text-gray-800">
                          {c.name}
                        </span>
                        <span className="text-xs text-gray-500">{c.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1 mb-6">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Schedule
                </p>
                <ReviewRow
                  label="Date"
                  value={
                    form.date && form.time
                      ? new Date(
                          `${form.date}T${form.time}`,
                        ).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"
                  }
                />
                <ReviewRow
                  label="Time"
                  value={
                    form.date && form.time
                      ? new Date(
                          `${form.date}T${form.time}`,
                        ).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : "—"
                  }
                />
                <ReviewRow label="Duration" value={form.duration} />
                <ReviewRow
                  label="Available for"
                  value="24 hours after scheduled time"
                />
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Sections
                </p>
                <div className="space-y-3">
                  {sections.map((s, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-xl border ${SECTION_COLORS[s.type]}`}
                    >
                      <div className="flex items-center gap-2 font-semibold capitalize mb-2">
                        {SECTION_ICONS[s.type]} Section {i + 1}: {s.type}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-gray-500">Questions:</span>{" "}
                          <strong>
                            {s.is_follow_up
                              ? s.no_of_questions * 2
                              : s.no_of_questions}
                          </strong>
                        </div>
                        <div>
                          <span className="text-gray-500">Time/Q:</span>{" "}
                          <strong>{s.seconds_per_question}s</strong>
                        </div>
                        <div>
                          <span className="text-gray-500">Follow-up:</span>{" "}
                          <strong>{s.is_follow_up ? "Yes" : "No"}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation — FIX #4: setStep only, never resets form */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() =>
              step > 1
                ? setStep(step - 1)
                : navigate("/recruiter/schedule-interview")
            }
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition-colors"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                step === 1
                  ? !step1Valid
                  : step === 2
                    ? !step2Valid
                    : !step3Valid
              }
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {scheduleMode === "bulk" ? "Scheduling all…" : "Scheduling…"}
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {scheduleMode === "bulk"
                    ? `Schedule ${bulkCandidates.length} Interviews`
                    : "Schedule Interview"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <CandidatePickerModal
        isOpen={showCandidateModal}
        onClose={() => setShowCandidateModal(false)}
        selectedCandidate={selectedCandidateFromPool}
        onSelect={handleSelectSingleCandidate}
        userId={user?.id}
        bulkMode={scheduleMode === "bulk"}
        selectedCandidates={bulkCandidates
          .filter((c) => c.id)
          .map((c) => ({ ...c }))}
        onBulkSelect={handleBulkPoolSelect}
      />
      <JdPickerModal
        isOpen={showJdModal}
        onClose={() => setShowJdModal(false)}
        selectedJob={selectedJob}
        onSelect={(job) => {
          setSelectedJob(job);
          update("job_title", job.job_title);
        }}
        userId={user?.id}
        navigate={navigate}
      />
    </div>
  );
}

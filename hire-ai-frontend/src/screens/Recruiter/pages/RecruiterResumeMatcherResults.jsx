"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Sparkles,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Download,
  Filter,
  ChevronRight,
  X,
  AlertCircle,
  Building2,
  MapPin,
  Loader2,
  Save,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import { createCandidateProfile, createCandidateProfilesBatch } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const splitCandidateName = (name) => {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    return { firstName: "Unknown", lastName: "Candidate" };
  }
  const [firstName, ...rest] = cleanName.split(/\s+/);
  return {
    firstName: firstName || "Unknown",
    lastName: rest.join(" ") || "Candidate",
  };
};

const toSkillsString = (skillsObject) =>
  Object.entries(skillsObject || {})
    .filter(([, status]) => status === "matched" || status === "partial")
    .map(([skill]) => skill)
    .join(", ");

const buildCandidatePayload = (candidate, fallbackLocation = "") => {
  const { firstName, lastName } = splitCandidateName(candidate?.name);
  const email = normalizeEmail(candidate?.email);

  return {
    email,
    first_name: firstName,
    last_name: lastName,
    title: String(candidate?.role_company || "").slice(0, 255),
    location: String(candidate?.location || fallbackLocation || "").slice(0, 255),
    skills: toSkillsString(candidate?.skills),
    total_years_experience:
      candidate?.years_of_experience === undefined || candidate?.years_of_experience === null
        ? ""
        : String(candidate.years_of_experience),
    preferred_mode: String(candidate?.work_type || "").slice(0, 100),
    profile_summary: String(candidate?.ai_insight || ""),
  };
};

export function RecruiterResumeMatcherResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { matchResults, selectedJob } = location.state || {};

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [sortBy, setSortBy] = useState("score");
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [candidateStatuses, setCandidateStatuses] = useState({});
  const [bulkSaving, setBulkSaving] = useState(false);
  const [savingCandidateIds, setSavingCandidateIds] = useState({});
  const [savedCandidateIds, setSavedCandidateIds] = useState({});
  const [savedEmails, setSavedEmails] = useState({});
  const [saveInlineError, setSaveInlineError] = useState("");
  const [saveSummary, setSaveSummary] = useState({
    open: false,
    successCount: 0,
    failed: [],
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (selectedCandidate) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [selectedCandidate]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") setSelectedCandidate(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!matchResults || !selectedJob) {
    navigate("/recruiter/resume-match");
    return null;
  }

  const matches = matchResults.matches || [];

  const rankedMatches = useMemo(() => {
    return matches
      .map((match, index) => ({
        ...match,
        id: `candidate-${index}`,
        status: candidateStatuses[`candidate-${index}`] || null,
      }))
      .sort((a, b) => b.overall_match - a.overall_match)
      .map((match, index) => ({ ...match, rank: index + 1 }));
  }, [matches, candidateStatuses]);

  const filteredSortedCandidates = useMemo(() => {
    let filtered = rankedMatches.filter((c) => c.overall_match >= filterMinScore);
    if (sortBy === "score") filtered.sort((a, b) => b.overall_match - a.overall_match);
    else if (sortBy === "experience") filtered.sort((a, b) => b.years_of_experience - a.years_of_experience);
    return filtered;
  }, [rankedMatches, filterMinScore, sortBy]);

  const shortlistedCandidates = useMemo(
    () => filteredSortedCandidates.filter((c) => candidateStatuses[c.id] === "shortlist"),
    [filteredSortedCandidates, candidateStatuses],
  );

  const shortlistedCount = Object.values(candidateStatuses).filter((s) => s === "shortlist").length;
  const rejectedCount = Object.values(candidateStatuses).filter((s) => s === "rejected").length;

  const handleStatusChange = (candidateId, status) => {
    setCandidateStatuses((prev) => ({
      ...prev,
      [candidateId]: prev[candidateId] === status ? null : status,
    }));
  };

  const handleBulkShortlist = () => {
    const newStatuses = { ...candidateStatuses };
    filteredSortedCandidates.slice(0, 5).forEach((c) => { newStatuses[c.id] = "shortlist"; });
    setCandidateStatuses(newStatuses);
  };

  const handleBulkReject = () => {
    const newStatuses = { ...candidateStatuses };
    filteredSortedCandidates.forEach((c) => {
      if (c.overall_match < 60) newStatuses[c.id] = "rejected";
    });
    setCandidateStatuses(newStatuses);
  };

  const openSaveSummary = ({ successCount = 0, failed = [] }) => {
    setSaveSummary({ open: true, successCount, failed });
  };

  const saveSingleCandidate = async (candidate) => {
    if (!user?.id) {
      toast.error("Please sign in again to save profiles");
      return;
    }

    if (savedCandidateIds[candidate.id]) {
      toast.success("Candidate already saved to talent pool");
      return;
    }

    const payload = buildCandidatePayload(candidate, selectedJob?.location);
    const normalizedEmail = normalizeEmail(payload.email);

    if (!normalizedEmail) {
      const failed = [{
        candidateId: candidate.id,
        name: candidate.name || "Candidate",
        message: "Email is missing in parsed resume data",
      }];
      toast.error("Could not save candidate (missing email)");
      openSaveSummary({ successCount: 0, failed });
      return;
    }

    if (savedEmails[normalizedEmail]) {
      toast.success("Candidate already saved in this session");
      setSavedCandidateIds((prev) => ({ ...prev, [candidate.id]: true }));
      return;
    }

    setSavingCandidateIds((prev) => ({ ...prev, [candidate.id]: true }));
    setSaveInlineError("");

    try {
      await createCandidateProfile(payload);
      setSavedCandidateIds((prev) => ({ ...prev, [candidate.id]: true }));
      setSavedEmails((prev) => ({ ...prev, [normalizedEmail]: true }));
      toast.success(`${candidate.name || "Candidate"} saved to talent pool`);
    } catch (error) {
      const message =
        error?.detail || error?.message || "Failed to save candidate to talent pool";
      setSaveInlineError(message);
      toast.error(message);
      openSaveSummary({
        successCount: 0,
        failed: [
          {
            candidateId: candidate.id,
            name: candidate.name || "Candidate",
            message,
          },
        ],
      });
    } finally {
      setSavingCandidateIds((prev) => ({ ...prev, [candidate.id]: false }));
    }
  };

  const handleSaveShortlisted = async () => {
    if (!user?.id) {
      toast.error("Please sign in again to save profiles");
      return;
    }

    if (shortlistedCandidates.length === 0) {
      toast.error("Shortlist at least one candidate first");
      return;
    }

    setBulkSaving(true);
    setSaveInlineError("");

    try {
      const precheckFailed = [];
      const payloadsToSave = [];
      const runEmails = new Set();

      shortlistedCandidates.forEach((candidate) => {
        if (savedCandidateIds[candidate.id]) {
          precheckFailed.push({
            candidateId: candidate.id,
            name: candidate.name || "Candidate",
            message: "Already saved in this session",
          });
          return;
        }

        const payload = buildCandidatePayload(candidate, selectedJob?.location);
        const normalizedEmail = normalizeEmail(payload.email);

        if (!normalizedEmail) {
          precheckFailed.push({
            candidateId: candidate.id,
            name: candidate.name || "Candidate",
            message: "Email is missing in parsed resume data",
          });
          return;
        }

        if (savedEmails[normalizedEmail] || runEmails.has(normalizedEmail)) {
          precheckFailed.push({
            candidateId: candidate.id,
            name: candidate.name || "Candidate",
            message: "Duplicate email in this save session",
          });
          return;
        }

        runEmails.add(normalizedEmail);
        payloadsToSave.push({
          candidateId: candidate.id,
          name: candidate.name || "Candidate",
          email: normalizedEmail,
          payload,
        });
      });

      const saveResults = await createCandidateProfilesBatch(
        payloadsToSave.map(({ candidateId, payload }) => ({ candidateId, payload })),
      );

      const successIds = saveResults.success.map((entry) => entry.candidateId);
      const failedFromApi = saveResults.failed.map((entry) => {
        const source = payloadsToSave.find((item) => item.candidateId === entry.candidateId);
        return {
          candidateId: entry.candidateId,
          name: source?.name || "Candidate",
          message: entry.message || "Failed to save candidate",
        };
      });

      if (successIds.length > 0) {
        setSavedCandidateIds((prev) => {
          const next = { ...prev };
          successIds.forEach((id) => {
            next[id] = true;
          });
          return next;
        });

        setSavedEmails((prev) => {
          const next = { ...prev };
          payloadsToSave.forEach((entry) => {
            if (successIds.includes(entry.candidateId)) {
              next[entry.email] = true;
            }
          });
          return next;
        });
      }

      const allFailed = [...precheckFailed, ...failedFromApi];

      if (successIds.length > 0) {
        toast.success(`${successIds.length} shortlisted profile${successIds.length > 1 ? "s" : ""} saved`);
      }

      if (allFailed.length > 0) {
        toast.error(`${allFailed.length} profile${allFailed.length > 1 ? "s" : ""} failed to save`);
        setSaveInlineError("Some shortlisted profiles could not be saved. Check details.");
      }

      openSaveSummary({
        successCount: successIds.length,
        failed: allFailed,
      });
    } catch (error) {
      const message =
        error?.detail || error?.message || "Failed to save shortlisted candidates";
      setSaveInlineError(message);
      toast.error(message);
    } finally {
      setBulkSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100/40">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            AI Matching Results
          </div>

          <div className="flex items-start sm:items-center gap-3 sm:gap-4 mb-4">
            <button
              onClick={() => navigate("/recruiter/resume-match")}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors border border-transparent hover:border-gray-200"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
                Match Results: {selectedJob.job_title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" />
                  {selectedJob.company_name}
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {selectedJob.location}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mb-4">
            <div className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
              <p className="text-xs text-gray-500">Matched Candidates</p>
              <p className="text-lg font-bold text-gray-900">
                {filteredSortedCandidates.length}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-3 py-2.5">
              <p className="text-xs text-emerald-600">Shortlisted</p>
              <p className="text-lg font-bold text-emerald-700">{shortlistedCount}</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2.5">
              <p className="text-xs text-rose-600">Rejected</p>
              <p className="text-lg font-bold text-rose-700">{rejectedCount}</p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-600 hidden sm:block">
              Review candidates, shortlist top fits, and save directly to your talent pool.
            </p>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-xl font-medium transition-all flex items-center gap-2 ${
                showFilters
                  ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-col md:flex-row md:items-center gap-4 p-4 bg-slate-50/70 rounded-xl border border-gray-100 mt-4">
              <div className="flex items-center justify-between md:justify-start gap-2 md:min-w-[230px]">
                <label className="text-sm font-medium text-gray-700">Sort by:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="score">Match Score</option>
                  <option value="experience">Experience</option>
                </select>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-sm font-medium text-gray-700">Min Score:</label>
                <input
                  type="range" min="0" max="100" step="10"
                  value={filterMinScore}
                  onChange={(e) => setFilterMinScore(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-emerald-600">{filterMinScore}%</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Candidate List ─────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-44 md:pb-28">
        {saveInlineError && (
          <div className="mb-4 bg-rose-50/80 border border-rose-100 rounded-lg p-3">
            <p className="text-rose-700 text-sm font-medium">{saveInlineError}</p>
          </div>
        )}

        <div className="space-y-4">
          {filteredSortedCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              onSelect={() => setSelectedCandidate(candidate)}
              onStatusChange={handleStatusChange}
              onSave={() => saveSingleCandidate(candidate)}
              isSaving={!!savingCandidateIds[candidate.id]}
              isSaved={!!savedCandidateIds[candidate.id]}
              isSelected={selectedCandidate?.id === candidate.id}
            />
          ))}

          {filteredSortedCandidates.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
              <p className="text-gray-600">Try adjusting your filters or matching criteria</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Modal (portal) ───────────────────────────────────────────── */}
      {selectedCandidate &&
        createPortal(
          <CandidateDetailPanel
            candidate={selectedCandidate}
            onClose={() => setSelectedCandidate(null)}
          />,
          document.body
        )}

      {/* ── Bulk Actions Bar ───────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/92 backdrop-blur-sm border-t border-gray-100 shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{shortlistedCount}</span> shortlisted •{" "}
              <span className="font-semibold">{rejectedCount}</span> rejected
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={handleSaveShortlisted}
                disabled={bulkSaving || shortlistedCandidates.length === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {bulkSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Shortlisted...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Shortlisted to Talent Pool
                  </>
                )}
              </button>
              <button
                onClick={handleBulkShortlist}
                className="px-4 py-2 bg-emerald-50/80 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors font-medium flex items-center gap-2"
              >
                <ThumbsUp className="w-4 h-4" />
                Shortlist Top 5
              </button>
              <button
                onClick={handleBulkReject}
                className="px-4 py-2 bg-rose-50/80 text-rose-700 border border-rose-100 rounded-lg hover:bg-rose-100 transition-colors font-medium flex items-center gap-2"
              >
                <ThumbsDown className="w-4 h-4" />
                Reject Below 60%
              </button>
              <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-all font-medium flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Results
              </button>
            </div>
          </div>
        </div>
      </div>

      {bulkSaving && (
        <div className="fixed inset-0 z-[9998] bg-white/75 backdrop-blur-[1px] flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-7 flex items-center gap-3">
            <Loader2 className="w-6 h-6 text-emerald-600 animate-spin" />
            <div>
              <p className="font-semibold text-gray-900">Saving shortlisted profiles...</p>
              <p className="text-sm text-gray-600">Please wait while we add them to your talent pool</p>
            </div>
          </div>
        </div>
      )}

      {saveSummary.open && (
        <SaveSummaryModal
          successCount={saveSummary.successCount}
          failed={saveSummary.failed}
          onClose={() => setSaveSummary((prev) => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
}

// ── Candidate Card ──────────────────────────────────────────────────────────
function CandidateCard({
  candidate,
  onSelect,
  onStatusChange,
  onSave,
  isSaving,
  isSaved,
  isSelected,
}) {
  const getScoreColor = (score) => {
    if (score >= 85) return { bg: "bg-emerald-400", text: "text-emerald-600", label: "Excellent Fit" };
    if (score >= 70) return { bg: "bg-green-400",   text: "text-green-600",   label: "Good Match"   };
    if (score >= 55) return { bg: "bg-amber-400",   text: "text-amber-600",   label: "Potential"    };
    return              { bg: "bg-rose-400",    text: "text-rose-600",    label: "Low Match"    };
  };

  const scoreColor = getScoreColor(candidate.overall_match);
  const skillMatches = Object.entries(candidate.skills || {}).map(([skill, status]) => ({ skill, status }));

  return (
    <div
      className={`bg-white rounded-2xl border p-4 sm:p-6 transition-all hover:shadow-sm ${
        isSelected ? "border-emerald-300 shadow-sm ring-2 ring-emerald-50" : "border-gray-100"
      } ${
        candidate.status === "shortlist"
          ? "bg-emerald-50/40"
          : candidate.status === "rejected"
            ? "bg-rose-50/30 opacity-75"
            : ""
      }`}
    >
      <div className="flex items-start gap-4 sm:gap-6">
        {/* Rank Badge */}
        <div className="flex-shrink-0">
          {candidate.rank <= 3 ? (
            <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
              candidate.rank === 1 ? "bg-amber-50" : candidate.rank === 2 ? "bg-slate-100" : "bg-orange-50"
            }`}>
              <Award className={`w-5 h-5 sm:w-6 sm:h-6 ${
                candidate.rank === 1 ? "text-amber-600" : candidate.rank === 2 ? "text-slate-600" : "text-orange-600"
              }`} />
            </div>
          ) : (
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-slate-100 flex items-center justify-center">
              <span className="text-base sm:text-lg font-bold text-slate-600">#{candidate.rank}</span>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 gap-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">{candidate.name}</h3>
              <p className="text-sm text-gray-600 mb-2">{candidate.role_company || "N/A"}</p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>{candidate.years_of_experience > 0 ? `${candidate.years_of_experience} years exp` : "Fresher"}</span>
                <span>•</span>
                <span className="capitalize">{candidate.work_type?.replace("-", " ") || "Unknown"}</span>
              </div>
            </div>

            {/* Score Gauge */}
            <div className="flex-shrink-0 text-center sm:ml-4 self-end sm:self-start">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                <svg viewBox="0 0 80 80" className="w-16 h-16 sm:w-20 sm:h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle
                    cx="40" cy="40" r="32"
                    stroke="currentColor" strokeWidth="6" fill="none"
                    strokeDasharray={`${2 * Math.PI * 32}`}
                    strokeDashoffset={`${2 * Math.PI * 32 * (1 - candidate.overall_match / 100)}`}
                    className={scoreColor.text}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-lg sm:text-xl font-bold ${scoreColor.text}`}>{candidate.overall_match}</span>
                </div>
              </div>
              <p className={`text-xs font-semibold mt-1 ${scoreColor.text}`}>{scoreColor.label}</p>
            </div>
          </div>

          {/* Skills */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Key Skills</p>
            <div className="flex flex-wrap gap-2">
              {skillMatches.slice(0, 6).map((skill, index) => (
                <span
                  key={index}
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    skill.status === "matched"  ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    skill.status === "partial"  ? "bg-amber-50 text-amber-700 border border-amber-100"       :
                                                  "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {skill.skill}{" "}
                  {skill.status === "matched" ? "✓" : skill.status === "partial" ? "~" : "✗"}
                </span>
              ))}
              {skillMatches.length > 6 && (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-slate-100 text-slate-600">
                  +{skillMatches.length - 6} more
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onSelect}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-700 flex items-center justify-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View Details
            </button>
            <button
              onClick={onSave}
              disabled={isSaving || isSaved}
              className={`flex-1 px-4 py-2 rounded-lg transition-all font-medium flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                isSaved
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save to Talent Pool
                </>
              )}
            </button>
            <button
              onClick={() => onStatusChange(candidate.id, candidate.status === "shortlist" ? null : "shortlist")}
              className={`px-3.5 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                candidate.status === "shortlist"
                  ? "bg-emerald-600 text-white"
                    : "bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              <ThumbsUp className="w-4 h-4" />
              <span className="hidden sm:inline">Shortlist</span>
            </button>
            <button
              onClick={() => onStatusChange(candidate.id, candidate.status === "rejected" ? null : "rejected")}
              className={`px-3.5 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                candidate.status === "rejected"
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50/80 text-rose-700 hover:bg-rose-100"
              }`}
            >
              <ThumbsDown className="w-4 h-4" />
              <span className="hidden sm:inline">Reject</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveSummaryModal({ successCount, failed, onClose }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Talent Pool Save Summary</h3>
            <p className="text-emerald-100 text-sm mt-1">
              {successCount} saved • {failed.length} failed
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {successCount > 0 && (
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-lg p-3">
              <p className="text-emerald-700 text-sm font-medium">
                {successCount} profile{successCount > 1 ? "s" : ""} added to talent pool successfully.
              </p>
            </div>
          )}

          {failed.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">Failed profiles</p>
              {failed.map((item, index) => (
                <div key={`${item.candidateId}-${index}`} className="bg-rose-50/80 border border-rose-100 rounded-lg p-3">
                  <p className="text-sm font-semibold text-rose-700">{item.name || "Candidate"}</p>
                  <p className="text-sm text-rose-600">{item.message || "Failed to save candidate"}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No failures. All selected profiles were saved.</p>
          )}
        </div>

        <div className="px-5 py-4 bg-slate-50 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Detail Panel Modal ──────────────────────────────────────────────────────
function CandidateDetailPanel({ candidate, onClose }) {
  const insights = candidate.ai_insight
    ? candidate.ai_insight.split(/\d+\.\s/).filter((s) => s.trim()).map((s) => s.trim())
    : [];

  const skillMatches = Object.entries(candidate.skills || {}).map(([skill, status]) => ({ skill, status }));

  return (
    /* Full-screen backdrop */
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6">
      {/* Dimmed backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal card */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Gradient header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-6 flex-shrink-0">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">{candidate.name}</h2>
              <p className="text-emerald-100 text-sm">{candidate.role_company || "N/A"}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors flex-shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-4xl font-bold">{candidate.overall_match}%</div>
              <div className="text-emerald-100 text-sm">Overall Match</div>
            </div>
            <div className="text-sm space-y-0.5">
              <p>{candidate.years_of_experience > 0 ? `${candidate.years_of_experience} years experience` : "Fresher"}</p>
              <p className="capitalize">{candidate.work_type?.replace("-", " ") || "Unknown"}</p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* AI Insights */}
          {insights.length > 0 && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                AI Insights
              </h3>
              <div className="space-y-2">
                {insights.map((insight, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{insight}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Match Breakdown */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Match Breakdown</h3>
            <div className="space-y-3">
              <ProgressBar label="Skills Match"          value={candidate.match_split?.skills        || 0} />
              <ProgressBar label="Experience Match"      value={candidate.match_split?.experience    || 0} />
              <ProgressBar label="Qualifications Match"  value={candidate.match_split?.qualification || 0} />
            </div>
          </div>

          {/* Skills Detail */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Skills Analysis</h3>
            <div className="space-y-2">
              {skillMatches.map((skill, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-sm font-medium text-gray-900">{skill.skill}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    skill.status === "matched" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    skill.status === "partial" ? "bg-amber-50 text-amber-700 border border-amber-100"       :
                                                 "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}>
                    {skill.status === "matched" ? "Matched" : skill.status === "partial" ? "Partial" : "Missing"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer close button */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-slate-50">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Progress Bar ────────────────────────────────────────────────────────────
function ProgressBar({ label, value }) {
  const getColor = (val) => {
    if (val >= 80) return "bg-emerald-500";
    if (val >= 60) return "bg-green-500";
    if (val >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-sm font-bold text-gray-900">{value}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(value)} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
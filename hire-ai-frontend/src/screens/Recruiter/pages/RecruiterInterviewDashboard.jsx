// screens/Recruiter/pages/RecruiterInterviewDashboard.jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Briefcase, Award, BarChart2, TrendingUp, Calendar,
  ChevronRight, Filter, RefreshCw, Loader2, AlertCircle,
  UserCheck, Star, Clock, ChevronDown, X, Search, MapPin,
  Building2, PlusCircle, CheckCircle2, Hash, Copy,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useAuth } from '../../../context/AuthContext';
import { getRecruiterInterviews, getRecruiterJobs } from '../../../api/api';
import { parseInterviewDate } from './RecruiterScheduleInterview';
import toast from 'react-hot-toast';

// ─── Helper Functions ─────────────────────────────────────────────────────────

const getOverallScore = (interview) => {
  const sections = interview.sections || [];
  const scoredSections = sections.filter(s => s.ai_score !== null && s.ai_score !== undefined);
  if (scoredSections.length === 0) return null;
  const total = scoredSections.reduce((sum, s) => sum + s.ai_score, 0);
  return Math.round(total / scoredSections.length);
};

const getTechnicalScore = (interview) => {
  const techSections = (interview.sections || []).filter(
    s => s.type?.toLowerCase() === 'technical' && s.ai_score !== null
  );
  if (techSections.length === 0) return null;
  const total = techSections.reduce((sum, s) => sum + s.ai_score, 0);
  return Math.round(total / techSections.length);
};

const getCommunicationScore = (interview) => {
  const commSections = (interview.sections || []).filter(
    s => s.type?.toLowerCase() === 'behavioral' && s.ai_score !== null
  );
  if (commSections.length === 0) return null;
  const total = commSections.reduce((sum, s) => sum + s.ai_score, 0);
  return Math.round(total / commSections.length);
};

const getScoreBucket = (score100) => {
  if (score100 === null || score100 === undefined) return null;
  const score10 = score100 / 10;
  if (score10 >= 9) return '9-10';
  if (score10 >= 8) return '8-9';
  if (score10 >= 6) return '6-7';
  if (score10 >= 4) return '4-5';
  return '0-3';
};

const groupByMonth = (interviews) => {
  const groups = {};
  interviews.forEach(iv => {
    const date = parseInterviewDate(iv);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[monthKey]) groups[monthKey] = [];
    groups[monthKey].push(iv);
  });
  return groups;
};

// ─── Stat Card Component ──────────────────────────────────────────────────────
const StatCard = ({ title, value, icon: Icon, color = 'emerald', trend }) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
    rose: 'bg-rose-50 text-rose-700',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        {trend && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{trend}</span>}
      </div>
      <h3 className="text-2xl font-bold text-gray-900">{value ?? '—'}</h3>
      <p className="text-sm text-gray-500 mt-1">{title}</p>
    </div>
  );
};

// ─── JD Picker Modal ──────────────────────────────────────────────────────────
function JdPickerModal({ isOpen, onClose, selectedJob, onSelect, userId, navigate }) {
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
      [j.job_title, j.company_name, j.location, j.department, j.level, j.input_description, String(j.id)]
        .filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
    );
  }, [allJobs, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-emerald-600 text-white flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold flex items-center gap-2.5">
            <Briefcase className="w-6 h-6" /> Select Job Description
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
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

        {/* Jobs grid */}
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
                {searchQuery ? "Try different keywords or a JD ID" : "Create a job description first"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => { onClose(); navigate("/recruiter/generate-jd"); }}
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
                  onClick={() => { onSelect(job); onClose(); setSearchQuery(""); }}
                  className={`p-5 rounded-xl border transition-all cursor-pointer ${
                    selectedJob?.id === job.id
                      ? "border-emerald-500 bg-emerald-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-emerald-300 hover:shadow-md"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm">{job.job_title || "No title"}</h3>
                    {selectedJob?.id === job.id && <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                  </div>
                  {/* JD ID badge */}
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded font-mono">
                      <Hash className="w-3 h-3" />{job.id}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(String(job.id));
                        toast.success("JD ID copied!");
                      }}
                      className="p-0.5 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-600"
                      title="Copy JD ID"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-2">
                    {job.company_name && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" />{job.company_name}</span>}
                    {job.location    && <span className="flex items-center gap-1"><MapPin    className="w-3.5 h-3.5" />{job.location}</span>}
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{job.input_description || "No description"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium text-sm transition-colors">Cancel</button>
          <button
            onClick={() => { onClose(); navigate("/recruiter/generate-jd"); }}
            className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2 text-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> New Job
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RecruiterInterviewDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJdModal, setShowJdModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ID-based search filter (client-side)
  const [idSearch, setIdSearch] = useState("");

  const fetchData = async (showRefresh = false) => {
    if (!user?.id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [interviewsData, jobsData] = await Promise.all([
        getRecruiterInterviews(user.id),
        getRecruiterJobs(user.id, { skip: 0, limit: 100 }),
      ]);
      setInterviews(Array.isArray(interviewsData) ? interviewsData : []);
      setJobs(Array.isArray(jobsData) ? jobsData : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  // Filter interviews: by selected job (matched on job_id OR job_title) + optional ID text search
  const filteredInterviews = useMemo(() => {
    let result = interviews;

    if (selectedJob) {
      result = result.filter(iv =>
        (iv.job_id && String(iv.job_id) === String(selectedJob.id)) ||
        iv.job_title === selectedJob.job_title
      );
    }

    if (idSearch.trim()) {
      const q = idSearch.toLowerCase().trim();
      result = result.filter(iv =>
        String(iv.job_id || "").toLowerCase().includes(q) ||
        String(iv.id || "").toLowerCase().includes(q) ||
        (iv.job_title || "").toLowerCase().includes(q) ||
        (iv.candidate_name || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [interviews, selectedJob, idSearch]);

  // Compute metrics
  const metrics = useMemo(() => {
    const totalCandidates = filteredInterviews.length;
    const overallScores = filteredInterviews.map(getOverallScore).filter(s => s !== null);
    const techScores    = filteredInterviews.map(getTechnicalScore).filter(s => s !== null);
    const commScores    = filteredInterviews.map(getCommunicationScore).filter(s => s !== null);

    const avgOverall = overallScores.length
      ? Math.round(overallScores.reduce((a, b) => a + b, 0) / overallScores.length) : null;
    const avgTech = techScores.length
      ? Math.round(techScores.reduce((a, b) => a + b, 0) / techScores.length) : null;
    const avgComm = commScores.length
      ? Math.round(commScores.reduce((a, b) => a + b, 0) / commScores.length) : null;

    const buckets = { '0-3': 0, '4-5': 0, '6-7': 0, '8-9': 0, '9-10': 0 };
    overallScores.forEach(score => {
      const bucket = getScoreBucket(score);
      if (bucket) buckets[bucket]++;
    });
    const distribution = Object.entries(buckets).map(([range, count]) => ({ range, count }));

    const monthlyGroups = groupByMonth(filteredInterviews);
    const monthlyAvg = Object.entries(monthlyGroups).map(([month, monthInterviews]) => {
      const monthScores = monthInterviews.map(getOverallScore).filter(s => s !== null);
      const avg = monthScores.length
        ? Math.round(monthScores.reduce((a, b) => a + b, 0) / monthScores.length) : null;
      return { month, avg };
    }).filter(item => item.avg !== null).sort((a, b) => a.month.localeCompare(b.month));

    return { totalCandidates, avgOverall, avgTech, avgComm, distribution, monthlyAvg, overallScores };
  }, [filteredInterviews]);

  // Top performers
  const topPerformers = useMemo(() => {
    return filteredInterviews
      .map(iv => ({
        name:           iv.candidate_name,
        email:          iv.candidate_email,
        score:          getOverallScore(iv),
        interview_type: iv.interview_type,
        job_title:      iv.job_title,
        job_id:         iv.job_id,
        date:           parseInterviewDate(iv),
      }))
      .filter(c => c.score !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [filteredInterviews]);

  const handleRefresh = () => fetchData(true);
  const handleClearJob = () => { setSelectedJob(null); setIdSearch(""); };
  const hasActiveFilter = !!(selectedJob || idSearch.trim());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/recruiter/schedule-interview')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Interview Analytics</h1>
                <p className="text-gray-600">Performance insights and trends across your interviews</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Selected job chip */}
              {selectedJob ? (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 max-w-xs">
                  <Briefcase className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="text-sm font-medium text-emerald-700 truncate block">{selectedJob.job_title}</span>
                    <span className="text-xs text-emerald-500 font-mono">ID: {selectedJob.id}</span>
                  </div>
                  <button onClick={handleClearJob} className="text-emerald-600 hover:text-emerald-800 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowJdModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-medium text-sm"
                >
                  <Briefcase className="w-4 h-4" /> Select Job Description
                </button>
              )}

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Search / filter bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* JD ID / text search */}
            <div className="relative flex-1 min-w-[260px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={idSearch}
                onChange={(e) => setIdSearch(e.target.value)}
                placeholder="Search by JD ID, interview ID, job title, or candidate…"
                className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              {idSearch && (
                <button
                  onClick={() => setIdSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter by JD button */}
            <button
              onClick={() => setShowJdModal(true)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all ${
                selectedJob
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              {selectedJob ? 'Change JD Filter' : 'Filter by JD'}
            </button>

            {hasActiveFilter && (
              <button
                onClick={handleClearJob}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg border border-red-200 transition-colors"
              >
                <X className="w-4 h-4" /> Clear filters
              </button>
            )}

            {/* Results count */}
            <span className="text-sm text-gray-500 ml-auto">
              Showing <strong className="text-gray-900">{filteredInterviews.length}</strong> of{' '}
              <strong className="text-gray-900">{interviews.length}</strong> interviews
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading dashboard data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-700 font-medium">{error}</p>
            <button onClick={handleRefresh} className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
              Retry
            </button>
          </div>
        ) : (
          <>
            {/* Active filter banner */}
            {hasActiveFilter && (
              <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-800 flex-wrap">
                <Filter className="w-4 h-4 flex-shrink-0" />
                <span>Filtered results:</span>
                {selectedJob && (
                  <span className="font-semibold flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {selectedJob.job_title}
                    <span className="font-mono text-xs text-emerald-600 ml-1">(ID: {selectedJob.id})</span>
                  </span>
                )}
                {idSearch && (
                  <span className="font-semibold flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" />
                    "{idSearch}"
                  </span>
                )}
                <span className="text-emerald-600">
                  — {filteredInterviews.length} interview{filteredInterviews.length !== 1 ? 's' : ''} match
                </span>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Candidates"    value={metrics.totalCandidates}                                         icon={Users}     color="emerald" />
              <StatCard title="Avg Overall Score"   value={metrics.avgOverall !== null ? `${metrics.avgOverall}/100` : '—'} icon={Award}     color="blue"    />
              <StatCard title="Avg Technical"       value={metrics.avgTech    !== null ? `${metrics.avgTech}/100`    : '—'} icon={BarChart2} color="purple"  />
              <StatCard title="Avg Communication"   value={metrics.avgComm    !== null ? `${metrics.avgComm}/100`    : '—'} icon={TrendingUp} color="amber"  />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Performance Over Time */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" /> Performance Over Time
                </h3>
                {metrics.monthlyAvg.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={metrics.monthlyAvg}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => `${value}/100`} />
                      <Legend />
                      <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} name="Avg Overall Score" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Score Distribution */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-600" /> Score Distribution (0-10 scale)
                </h3>
                {metrics.distribution.every(d => d.count === 0) ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={metrics.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top Performers & Job Details */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Top Performers */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-emerald-600" /> Top Performers
                </h3>
                {topPerformers.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">No completed interviews yet.</div>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((candidate, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold flex-shrink-0">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{candidate.name}</p>
                            <p className="text-xs text-gray-500 truncate">{candidate.email}</p>
                            {candidate.job_id && (
                              <p className="text-xs text-gray-400 font-mono">JD: {candidate.job_id}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <span className="text-lg font-bold text-emerald-600">{candidate.score}</span>
                          <span className="text-xs text-gray-500">/100</span>
                          <p className="text-xs text-gray-400">{candidate.date.toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Job details panel when job selected, else recent interviews summary */}
              {selectedJob ? (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-600" /> Job Details
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Job ID</p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                          {selectedJob.id}
                        </span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(String(selectedJob.id)); toast.success("JD ID copied!"); }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Job Title</p>
                      <p className="font-medium text-gray-900">{selectedJob.job_title}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Company</p>
                      <p className="font-medium text-gray-900">{selectedJob.company_name || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Location</p>
                      <p className="font-medium text-gray-900">{selectedJob.location || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Candidates Interviewed</p>
                      <p className="font-medium text-gray-900">{filteredInterviews.length}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Avg Overall Score</p>
                      <p className="font-medium text-gray-900">
                        {metrics.avgOverall !== null ? `${metrics.avgOverall}/100` : '—'}
                      </p>
                    </div>
                    {selectedJob.input_description && (
                      <div className="pt-2">
                        <p className="text-xs text-gray-500">Description Preview</p>
                        <p className="text-xs text-gray-600 line-clamp-3 mt-1">{selectedJob.input_description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* When no job is selected, show all jobs summary */
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-emerald-600" /> Job Overview
                  </h3>
                  {jobs.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">No job descriptions found.</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {jobs.map((job) => {
                        const jobInterviews = interviews.filter(iv =>
                          (iv.job_id && String(iv.job_id) === String(job.id)) ||
                          iv.job_title === job.job_title
                        );
                        const jobScores = jobInterviews.map(getOverallScore).filter(s => s !== null);
                        const jobAvg = jobScores.length
                          ? Math.round(jobScores.reduce((a, b) => a + b, 0) / jobScores.length) : null;

                        return (
                          <button
                            key={job.id}
                            onClick={() => setSelectedJob(job)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border border-gray-100 hover:border-emerald-200 transition-all text-left group"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-sm truncate group-hover:text-emerald-700 transition-colors">
                                {job.job_title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400 font-mono">ID: {job.id}</span>
                                {job.company_name && (
                                  <span className="text-xs text-gray-400">· {job.company_name}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-3">
                              <span className="text-sm font-bold text-emerald-600">{jobInterviews.length}</span>
                              <span className="text-xs text-gray-400 block">
                                {jobAvg !== null ? `avg ${jobAvg}` : 'no scores'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* JD Picker Modal */}
      <JdPickerModal
        isOpen={showJdModal}
        onClose={() => setShowJdModal(false)}
        selectedJob={selectedJob}
        onSelect={(job) => { setSelectedJob(job); setIdSearch(""); }}
        userId={user?.id}
        navigate={navigate}
      />
    </div>
  );
}
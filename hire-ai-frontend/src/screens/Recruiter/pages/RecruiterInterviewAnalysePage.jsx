import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ChevronRight,
  Award,
  Brain,
  Code2,
  FileText,
  TrendingUp,
  MessageSquare,
  Star,
  PlayCircle,
  Loader,
  VideoOff,
  RefreshCw,
  Video,
} from "lucide-react";

import {
  deriveStatus,
  parseInterviewDate,
  TypeBadge,
  StatusBadge,
} from "./RecruiterScheduleInterview";
import { getInterviewById, getQuestionVideoUrl } from "../../../api/api";

// ─── Question Video Player ────────────────────────────────────────────────────
function QuestionVideoPlayer({ interviewId, sectionId, questionIndex }) {
  const [status, setStatus] = useState("idle");
  const [videoUrl, setVideoUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const videoRef = useRef(null);

  const loadVideo = async () => {
    setStatus("loading");
    setErrorMsg("");
    try {
      const data = await getQuestionVideoUrl(
        interviewId,
        sectionId,
        questionIndex,
      );
      setVideoUrl(data.video_url);
      setStatus("ready");
    } catch (err) {
      setErrorMsg(err?.detail || err?.message || "Failed to load video");
      setStatus("error");
    }
  };

  useEffect(() => {
    if (status === "ready" && videoRef.current && videoUrl) {
      videoRef.current.load();
    }
  }, [status, videoUrl]);

  if (status === "idle")
    return (
      <button
        onClick={loadVideo}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-lg transition-colors text-gray-700 font-medium text-xs"
      >
        <PlayCircle className="w-4 h-4 text-emerald-600" /> Watch Recording
      </button>
    );

  if (status === "loading")
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-xs">
        <Loader className="w-3 h-3 animate-spin" /> Loading…
      </div>
    );

  if (status === "error")
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
          <VideoOff className="w-3.5 h-3.5" /> {errorMsg || "Unavailable"}
        </div>
        <button
          onClick={loadVideo}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );

  return (
    <div className="mt-3 w-full rounded-xl overflow-hidden border border-gray-200 bg-black shadow-sm">
      <video
        ref={videoRef}
        src={videoUrl}
        controls
        controlsList="nodownload"
        playsInline
        className="w-full max-h-72 object-contain"
        style={{ background: "#000" }}
      >
        Your browser does not support HTML5 video.
      </video>
    </div>
  );
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────
function RadarChart({ metrics, size = 380 }) {
  const PADDING = 80;
  const totalSize = size + PADDING * 2;
  const cx = totalSize / 2,
    cy = totalSize / 2;
  const r = (size / 2) * 0.62;
  const count = metrics.length;
  if (count < 3) return null;

  const angleStep = (2 * Math.PI) / count;
  const angleOf = (i) => -Math.PI / 2 + i * angleStep;

  const ptOnAxis = (i, frac) => ({
    x: cx + Math.cos(angleOf(i)) * r * frac,
    y: cy + Math.sin(angleOf(i)) * r * frac,
  });

  // Scores are out of 25, so normalize by 25
  const dataPoints = metrics.map((m, i) =>
    ptOnAxis(i, Math.min(1, (m.value || 0) / 25)),
  );
  const dataPath =
    dataPoints
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
      )
      .join(" ") + " Z";
  const COLORS = [
    "#10b981",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#06b6d4",
    "#ec4899",
    "#84cc16",
  ];

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      className="mx-auto"
      style={{ maxWidth: size + PADDING * 2 }}
    >
      {[0.2, 0.4, 0.6, 0.8, 1.0].map((frac, gi) => {
        const pts = metrics.map((_, i) => ptOnAxis(i, frac));
        const path =
          pts
            .map(
              (p, i) =>
                `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`,
            )
            .join(" ") + " Z";
        return (
          <g key={gi}>
            <path
              d={path}
              fill={gi % 2 === 0 ? "#f9fafb" : "white"}
              stroke="#e5e7eb"
              strokeWidth={gi === 4 ? 1.5 : 0.8}
            />
            {/* Grid labels now show /25 scale */}
            <text
              x={cx + 4}
              y={ptOnAxis(0, frac).y + 1}
              fontSize="8"
              fill="#9ca3af"
              dominantBaseline="middle"
            >
              {Math.round(frac * 25)}
            </text>
          </g>
        );
      })}

      {metrics.map((_, i) => {
        const outer = ptOnAxis(i, 1);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="#d1d5db"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}

      <path
        d={dataPath}
        fill="#10b981"
        fillOpacity={0.2}
        stroke="#10b981"
        strokeWidth={2.5}
        strokeLinejoin="round"
      />

      {dataPoints.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={7}
            fill={COLORS[i % COLORS.length]}
            stroke="white"
            strokeWidth={2.5}
          />
          <circle cx={p.x} cy={p.y} r={3} fill="white" />
        </g>
      ))}

      {metrics.map((m, i) => {
        const labelPt = ptOnAxis(i, 1.18);
        const textAnchor =
          labelPt.x < cx - 8 ? "end" : labelPt.x > cx + 8 ? "start" : "middle";
        const words = m.label.split(" ");
        const line1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
        const line2 =
          words.length > 1
            ? words.slice(Math.ceil(words.length / 2)).join(" ")
            : null;

        return (
          <g key={i}>
            <text
              x={labelPt.x}
              y={labelPt.y - (line2 ? 8 : 3)}
              textAnchor={textAnchor}
              fontSize="11"
              fontWeight="700"
              fill="#374151"
            >
              {line1.charAt(0).toUpperCase() + line1.slice(1)}
            </text>
            {line2 && (
              <text
                x={labelPt.x}
                y={labelPt.y + 6}
                textAnchor={textAnchor}
                fontSize="11"
                fontWeight="700"
                fill="#374151"
              >
                {line2.charAt(0).toUpperCase() + line2.slice(1)}
              </text>
            )}
            <text
              x={labelPt.x}
              y={labelPt.y + (line2 ? 22 : 14)}
              textAnchor={textAnchor}
              fontSize="13"
              fontWeight="800"
              fill={COLORS[i % COLORS.length]}
            >
              {m.value}
            </text>
          </g>
        );
      })}

      <circle cx={cx} cy={cy} r={4} fill="#d1d5db" />
    </svg>
  );
}

// ─── Score Ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, label = "Score / 100", size = 120 }) {
  const pct = Math.min(100, Math.max(0, score ?? 0));
  const radius = size * 0.36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;
  const color = pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
  const sw = size * 0.09;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={sw}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="white"
          strokeWidth={sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fontWeight="bold"
          fill="white"
        >
          {pct}
        </text>
      </svg>
      <span className="text-xs text-white/80 mt-0.5">{label}</span>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} flex-shrink-0`}
      >
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

// ─── Section Analysis ─────────────────────────────────────────────────────────
function SectionAnalysis({ section, idx }) {
  const aiScore = section.ai_score ?? section.score;

  // Extract from ai_summary (your actual structure)
  const aiSummary = section.ai_summary || {};
  const details = aiSummary.details || [];
  const summaryData = aiSummary.summary || {}; // Can be string or object

  // Handle both string summary and object summary
  const isSummaryObject =
    typeof summaryData === "object" && summaryData !== null;
  const overallAssessment = isSummaryObject
    ? summaryData.overall_assessment
    : summaryData;
  const strengths = isSummaryObject ? summaryData.strengths || [] : [];
  const weaknesses = isSummaryObject ? summaryData.weaknesses || [] : [];
  const improvementSuggestions = isSummaryObject
    ? summaryData.improvement_suggestions || []
    : [];
  const finalVerdict = isSummaryObject ? summaryData.final_verdict : null;

  // Aggregate dimension scores for radar
  const dimAccumulator = {};
  details.forEach((q) => {
    if (q.dimension_scores) {
      Object.entries(q.dimension_scores).forEach(([dim, val]) => {
        if (!dimAccumulator[dim]) dimAccumulator[dim] = [];
        dimAccumulator[dim].push(val);
      });
    }
  });

  const avgDims = Object.entries(dimAccumulator).map(([dim, vals]) => ({
    label: dim.replace(/_/g, " "),
    value: vals.length
      ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      : 0,
  }));

  const SECTION_BG = {
    technical: "from-blue-600 to-blue-500",
    behavioral: "from-purple-600 to-purple-500",
    introduction: "from-emerald-600 to-teal-500",
    coding: "from-amber-600 to-amber-500",
  };

  const SECTION_ICONS = {
    technical: Code2,
    behavioral: Brain,
    introduction: Star,
    coding: FileText,
  };

  const Icon = SECTION_ICONS[section.type?.toLowerCase()] || Star;
  const gradient =
    SECTION_BG[section.type?.toLowerCase()] || "from-emerald-600 to-teal-500";

  const hasData =
    details.length > 0 ||
    overallAssessment ||
    (section.qa && section.qa.length > 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className={`flex items-center gap-4 px-6 py-5 bg-gradient-to-r ${gradient}`}
      >
        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white capitalize text-base">
            Section {idx + 1}: {section.type}
          </h3>
          <p className="text-xs text-white/70 mt-0.5">
            {section.no_of_questions || 0} questions ·{" "}
            {section.status || "Pending"}
          </p>
        </div>

        {aiScore !== null && aiScore !== undefined ? (
          <ScoreRing score={aiScore} size={80} label="Score" />
        ) : (
          <span className="text-xs text-white/60 italic">Not evaluated</span>
        )}
      </div>

      {!hasData ? (
        <div className="p-8 text-center text-gray-400 text-sm italic">
          No evaluation data yet for this section.
        </div>
      ) : (
        <div className="px-8 py-6 space-y-8">
          {/* Radar + Dimension Bars */}
          {avgDims.length >= 3 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-5">
                Psychometric Profile
              </p>
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                <div className="w-full lg:w-1/2 flex justify-center">
                  <RadarChart metrics={avgDims} size={380} />
                </div>
                <div className="w-full lg:w-1/2 space-y-4 lg:pt-4">
                  {avgDims.map((d) => {
                    const val = d.value; // out of 25
                    const barWidth = Math.min(100, (val / 25) * 100); // scale to %
                    const color =
                      val >= 18
                        ? "bg-emerald-500"
                        : val >= 10
                          ? "bg-amber-500"
                          : "bg-red-500";
                    const textC =
                      val >= 18
                        ? "text-emerald-700"
                        : val >= 10
                          ? "text-amber-700"
                          : "text-red-700";
                    const bgC =
                      val >= 18
                        ? "bg-emerald-50"
                        : val >= 10
                          ? "bg-amber-50"
                          : "bg-red-50";

                    return (
                      <div key={d.label} className={`p-3 rounded-xl ${bgC}`}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-gray-700 capitalize">
                            {d.label}
                          </span>
                          <span className={`text-sm font-bold ${textC}`}>
                            {val}
                            <span className="text-xs font-normal text-gray-400">
                              /25
                            </span>
                          </span>
                        </div>
                        <div className="h-2.5 bg-white rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${color}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AI Summary */}
          {overallAssessment && (
            <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 rounded-2xl p-6 space-y-6">
              <div>
                <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-3">
                  AI Evaluation Summary
                </p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {overallAssessment}
                </p>
              </div>

              {strengths.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full"></span>
                    Strengths
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
                    {strengths.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-rose-700 mb-3 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-rose-500 rounded-full"></span>
                    Weaknesses
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
                    {weaknesses.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {improvementSuggestions.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-amber-700 mb-3">
                    Improvement Suggestions
                  </p>
                  <ul className="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
                    {improvementSuggestions.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {finalVerdict && (
                <div className="pt-4 border-t border-indigo-100">
                  <p className="font-bold text-gray-900">Final Verdict</p>
                  <p className="text-base font-medium text-indigo-800 mt-1">
                    {finalVerdict}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Question Breakdown */}
          {details.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-4">
                Question Breakdown
              </p>
              <div className="space-y-4">
                {details.map((q, qi) => {
                  const sc = q.score || 0; // out of 100
                  const scoreColor =
                    sc >= 70
                      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                      : sc >= 40
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-red-100 text-red-700 border-red-200";

                  const qaEntry = section.qa?.find(
                    (qa) => qa.question === q.question,
                  );
                  const recording = section.recordings?.find(
                    (r) => r.question_index === qi,
                  );

                  return (
                    <div
                      key={qi}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <div className="flex items-start gap-3 px-4 py-3.5 bg-gray-50">
                        <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                          {qi + 1}
                        </span>
                        <p className="flex-1 text-sm font-medium text-gray-900 leading-snug">
                          {q.question}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {recording && (
                            <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                              <Video className="w-3 h-3" /> Video
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${scoreColor}`}
                          >
                            {sc}/100
                          </span>
                        </div>
                      </div>

                      {qaEntry?.answer && (
                        <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                            Candidate Answer
                          </p>
                          <p className="text-sm text-blue-900 leading-relaxed">
                            {qaEntry.answer}
                          </p>
                        </div>
                      )}

                      {recording && (
                        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Video className="w-3.5 h-3.5" /> Answer Recording
                          </p>
                          <QuestionVideoPlayer
                            interviewId={section.interview_id}
                            sectionId={section.id}
                            questionIndex={recording.question_index}
                          />
                        </div>
                      )}

                      {q.dimension_scores &&
                        Object.keys(q.dimension_scores).length > 0 && (
                          <div className="px-4 py-3 bg-white border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                            {Object.entries(q.dimension_scores).map(
                              ([dim, val]) => {
                                // val is out of 25, scale bar to %
                                const barW = Math.min(100, (val / 25) * 100);
                                return (
                                  <div key={dim}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span className="text-gray-500 capitalize">
                                        {dim.replace(/_/g, " ")}
                                      </span>
                                      <span className="font-semibold text-gray-700">
                                        {val}
                                        <span className="text-gray-400 font-normal">
                                          /25
                                        </span>
                                      </span>
                                    </div>
                                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${val >= 18 ? "bg-emerald-400" : val >= 10 ? "bg-amber-400" : "bg-red-400"}`}
                                        style={{ width: `${barW}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        )}

                      {q.summary && (
                        <div className="px-4 py-3 text-xs text-gray-600 leading-relaxed border-t border-gray-100 bg-blue-50/40">
                          {q.summary}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fallback: Show QA if no AI details */}
          {details.length === 0 && section.qa?.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-4">
                Candidate Answers
              </p>
              <div className="space-y-3">
                {section.qa.map((item, qi) => (
                  <div
                    key={qi}
                    className="border border-gray-200 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-start gap-3 px-4 py-3.5 bg-gray-50">
                      <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                        {qi + 1}
                      </span>
                      <p className="flex-1 text-sm font-medium text-gray-900 leading-snug">
                        {item.question}
                      </p>
                    </div>
                    <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                        Candidate Answer
                      </p>
                      <p className="text-sm text-blue-900 leading-relaxed">
                        {item.answer || "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RecruiterInterviewAnalysePage() {
  const { state } = useLocation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(state?.interview || null);
  const [loading, setLoading] = useState(!state?.interview);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (state?.interview) return;

    const interviewId = id || state?.interviewId;
    if (!interviewId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    getInterviewById(interviewId)
      .then((data) => {
        setInterview(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load interview");
        setLoading(false);
      });
  }, [id, state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading interview analysis…</p>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">
            {error || "Interview data not found."}
          </p>
          <button
            onClick={() => navigate("/recruiter/schedule-interview")}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
          >
            Back to Scheduler
          </button>
        </div>
      </div>
    );
  }

  const date = parseInterviewDate(interview);
  const sections = [...(interview.sections || [])].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );

  const scoredSections = sections.filter(
    (s) => (s.ai_score ?? s.score) != null,
  );
  const overallScore = scoredSections.length
    ? Math.round(
        scoredSections.reduce((acc, s) => acc + (s.ai_score ?? s.score), 0) /
          scoredSections.length,
      )
    : null;

  const totalQ = sections.reduce((acc, s) => acc + (s.no_of_questions || 0), 0);
  const completedSections = sections.filter(
    (s) => s.status === "Completed",
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="px-6 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate("/recruiter/schedule-interview")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {interview.candidate_name}
            </h1>
            <p className="text-sm text-gray-500 truncate">
              {interview.job_title} · Interview Analysis
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <StatusBadge status={deriveStatus(interview)} />
            <TypeBadge type={interview.interview_type} />
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            label="Overall Score"
            value={overallScore !== null ? `${overallScore}` : "N/A"}
            icon={Award}
            color="bg-emerald-500"
          />
          <StatCard
            label="Total Questions"
            value={totalQ}
            icon={MessageSquare}
            color="bg-blue-500"
          />
          <StatCard
            label="Sections Completed"
            value={`${completedSections}/${sections.length}`}
            icon={TrendingUp}
            color="bg-purple-500"
          />
          <StatCard
            label="Interview Date"
            value={date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            icon={Star}
            color="bg-amber-500"
          />
        </div>

        {/* Interview Details */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">
            Interview Details
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-sm">
            {[
              ["Candidate", interview.candidate_name],
              ["Email", interview.candidate_email],
              ["Job Title", interview.job_title],
              ["Type", interview.interview_type],
              ["Duration", interview.duration],
              [
                "Time",
                date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                }),
              ],
            ].map(([label, val]) => (
              <div key={label}>
                <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                <p className="font-semibold text-gray-900 truncate">
                  {val || "—"}
                </p>
              </div>
            ))}
          </div>
          {interview.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <p className="text-xs text-gray-400 mb-1">Notes</p>
              <p className="text-sm text-gray-700">{interview.notes}</p>
            </div>
          )}
        </div>

        {/* Sections */}
        {sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
            No sections found for this interview.
          </div>
        ) : (
          sections.map((section, idx) => (
            <SectionAnalysis
              key={section.id || idx}
              section={section}
              idx={idx}
            />
          ))
        )}
      </div>
    </div>
  );
}
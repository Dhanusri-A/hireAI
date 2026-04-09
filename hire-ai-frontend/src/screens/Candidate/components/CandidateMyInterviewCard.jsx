// screens/Candidate/components/CandidateMyInterviewCard.jsx
// • No "View Results" button — candidates do not see results
// • Uses windowStatus / derivedStatus props from parent
// • onStart() is called by parent which handles navigation to the correct route
import React from 'react';
import {
  Calendar, Clock, Video, Briefcase,
  PlayCircle, CheckCircle, AlertTriangle, Timer, Lock,
} from 'lucide-react';

function WindowBadge({ windowStatus, scheduledAt, expiresAt }) {
  if (windowStatus === 'open') {
    const minutesLeft = Math.floor((expiresAt - new Date()) / 60000);
    const hoursLeft   = Math.floor(minutesLeft / 60);
    const timeLeft    = hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft % 60}m` : `${minutesLeft}m`;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
        <Timer className="w-3 h-3" />
        Open — {timeLeft} left
      </span>
    );
  }
  if (windowStatus === 'upcoming') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
        <Clock className="w-3 h-3" />
        Opens {scheduledAt?.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
      </span>
    );
  }
  if (windowStatus === 'expired') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded-full text-xs font-semibold">
        <Lock className="w-3 h-3" />
        Expired
      </span>
    );
  }
  return null;
}

export default function CandidateMyInterviewCard({
  interview,
  windowStatus,
  windowScheduledAt,
  windowExpiresAt,
  derivedStatus,
  onStart,
}) {
  const isCompleted   = derivedStatus === 'completed';
  const isMalpractice = derivedStatus === 'malpractice';
  const isOpen        = windowStatus === 'open' && !isCompleted && !isMalpractice;
  const isUpcoming    = windowStatus === 'upcoming';
  const isExpired     = windowStatus === 'expired';

  // Scheduled date display
  const date = windowScheduledAt;

  return (
    <div className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
      isOpen ? 'border-emerald-300' : 'border-gray-200'
    }`}>
      {/* Top colour strip */}
      <div className={`h-1.5 ${
        isCompleted   ? 'bg-blue-500'
        : isMalpractice ? 'bg-red-500'
        : isOpen        ? 'bg-emerald-500'
        : isExpired     ? 'bg-gray-300'
        : 'bg-blue-300'
      }`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-gray-900 truncate">{interview.job_title}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{interview.interview_type} Interview</p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {isCompleted ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full text-xs font-semibold">
                <CheckCircle className="w-3 h-3" /> Completed
              </span>
            ) : isMalpractice ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full text-xs font-semibold">
                <AlertTriangle className="w-3 h-3" /> Disqualified
              </span>
            ) : (
              <WindowBadge
                windowStatus={windowStatus}
                scheduledAt={windowScheduledAt}
                expiresAt={windowExpiresAt}
              />
            )}
          </div>
        </div>

        {/* Meta grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{date ? date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{date ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Video className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span>{interview.duration || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{interview.sections?.length || 0} sections</span>
          </div>
        </div>

        {/* Notes */}
        {interview.notes && (
          <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-4 line-clamp-2">
            {interview.notes}
          </p>
        )}

        {/* Section tags */}
        {interview.sections?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {[...interview.sections]
              .sort((a, b) => (a.type === 'introduction' ? -1 : 1))
              .map((s, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs capitalize">
                  {s.type}
                </span>
              ))}
          </div>
        )}

        {/* Action area */}
        {/* 
          Completed / malpractice: show a neutral "Submitted" pill — no results link for candidates.
          Open: Start Interview button.
          Upcoming: greyed info banner.
          Expired: locked banner.
        */}
        {(isCompleted || isMalpractice) ? (
          <div className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 ${
            isMalpractice
              ? 'bg-red-50 border border-red-200 text-red-600'
              : 'bg-blue-50 border border-blue-200 text-blue-600'
          }`}>
            {isMalpractice
              ? <><AlertTriangle className="w-4 h-4" /> Interview Disqualified</>
              : <><CheckCircle className="w-4 h-4" /> Interview Submitted</>
            }
          </div>
        ) : isOpen ? (
          <button
            onClick={onStart}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-bold text-sm hover:from-emerald-700 hover:to-teal-700 transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <PlayCircle className="w-5 h-5" /> Start Interview
          </button>
        ) : isExpired ? (
          <div className="w-full py-2.5 border border-gray-200 text-gray-400 rounded-xl font-medium text-sm flex items-center justify-center gap-2 cursor-not-allowed bg-gray-50">
            <Lock className="w-4 h-4" /> Interview window expired
          </div>
        ) : (
          // upcoming
          <div className="w-full py-2.5 border border-blue-200 text-blue-600 rounded-xl font-medium text-sm flex items-center justify-center gap-2 bg-blue-50">
            <Clock className="w-4 h-4" />
            Available from {windowScheduledAt?.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}
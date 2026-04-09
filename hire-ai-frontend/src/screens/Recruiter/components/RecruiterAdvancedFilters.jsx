// components/RecruiterAdvancedFilters.jsx
import { useState, useEffect, useRef } from "react";
import { X, MapPin, Search } from "lucide-react";

const PIPELINE_STATUSES = [
  { value: "sourced",   label: "Sourced",   color: "bg-gray-100 text-gray-700 border-gray-300"         },
  { value: "matched",   label: "Matched",   color: "bg-blue-100 text-blue-700 border-blue-300"          },
  { value: "screening", label: "Screening", color: "bg-yellow-100 text-yellow-700 border-yellow-300"    },
  { value: "interview", label: "Interview", color: "bg-purple-100 text-purple-700 border-purple-300"    },
  { value: "offer",     label: "Offer",     color: "bg-orange-100 text-orange-700 border-orange-300"    },
  { value: "hired",     label: "Hired",     color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
];

export function RecruiterAdvancedFilters({
  statusFilter,     onStatusChange,
  locationFilter,   onLocationChange,
  sourceFilter,     onSourceChange,    sourceOptions,
  experienceFilter, onExperienceChange, experienceRanges,
  selectedSkills,   onAddSkill,        onRemoveSkill,
  hasActiveFilters, filteredCount,     totalCount,
  onClearFilters,
}) {
  const [inputVal, setInputVal] = useState("");
  const prevSkillsRef = useRef(selectedSkills);

  // Only reset input when parent clears skills externally (e.g. "Clear all filters")
  useEffect(() => {
    const prev = prevSkillsRef.current;
    if (prev.length > 0 && selectedSkills.length === 0) {
      setInputVal("");
    }
    prevSkillsRef.current = selectedSkills;
  }, [selectedSkills]);

  const handleChange = (raw) => {
    setInputVal(raw);

    // Parse all comma-separated tokens from the full input
    const tokens = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Remove skills no longer present
    selectedSkills.forEach((existing) => {
      if (!tokens.some((t) => t.toLowerCase() === existing.toLowerCase())) {
        onRemoveSkill(existing);
      }
    });

    // Add newly typed skills
    tokens.forEach((token) => {
      if (!selectedSkills.some((s) => s.toLowerCase() === token.toLowerCase())) {
        onAddSkill(token);
      }
    });
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 space-y-5">

      {/* ── Row 1 ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Skills */}
        <div className="lg:col-span-2">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Skills
          </label>
          {/* <p className="text-xs text-gray-400 mb-2">
            Separate multiple skills with commas &nbsp;·&nbsp;
            <span className="italic"> e.g. React, Python, SQL</span>
          </p> */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="e.g. React, Python, SQL…"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm placeholder-gray-400"
            />
          </div>
          {selectedSkills.length > 0 && (
            <p className="text-xs text-emerald-600 mt-1.5 font-medium">
              Filtering by: {selectedSkills.join(" · ")}
            </p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Location
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={locationFilter === "All Locations" ? "" : locationFilter}
              onChange={(e) => onLocationChange(e.target.value || "All Locations")}
              placeholder="e.g. Bangalore, Remote…"
              className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm placeholder-gray-400"
            />
            {locationFilter !== "All Locations" && (
              <button
                onClick={() => onLocationChange("All Locations")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-100 rounded-full"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Source */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Source
          </label>
          <select
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
          >
            {sourceOptions.map((src) => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>

        {/* Experience */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
            Experience
          </label>
          <select
            value={experienceFilter}
            onChange={(e) => onExperienceChange(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm"
          >
            {experienceRanges.map((exp) => (
              <option key={exp.label} value={exp.label}>{exp.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Pipeline status pills ──────────────────────────────────────── */}
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Pipeline Status
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onStatusChange("All Status")}
            className={"px-3 py-1.5 rounded-full text-xs font-semibold border transition-all " + (
              statusFilter === "All Status"
                ? "bg-gray-800 text-white border-gray-800 shadow-sm"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            )}
          >
            All
          </button>
          {PIPELINE_STATUSES.map((stage) => {
            const isActive = statusFilter === stage.value;
            return (
              <button
                key={stage.value}
                onClick={() => onStatusChange(isActive ? "All Status" : stage.value)}
                className={"px-3 py-1.5 rounded-full text-xs font-semibold border transition-all " + (
                  isActive
                    ? stage.color + " ring-2 ring-offset-1 ring-emerald-400 shadow-sm"
                    : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                )}
              >
                {stage.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Clear filters ──────────────────────────────────────────────── */}
      {hasActiveFilters && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{filteredCount}</span> of{" "}
            <span className="font-semibold text-gray-900">{totalCount}</span> candidates match
          </p>
          <button
            onClick={onClearFilters}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}
import { UserPlus, Download } from "lucide-react";
import * as XLSX from "xlsx";

function buildRows(candidates) {
  return candidates.map((c) => ({
    "Full Name":        c.name,
    "Job Title":        c.title,
    "Email":            c.email,
    "Phone":            c.phone,
    "Location":         c.location,
    "Experience (yrs)": c.experience,
    "Skills":           Array.isArray(c.skills) ? c.skills.join(", ") : c.skills || "",
    "Status":           c.status || "",
    "Source":           c.source || "",
    "Notice Period":    c.notice_period || "",
    "Expected Salary":  c.expected_salary || "",
    "Preferred Mode":   c.preferred_mode || "",
    "Last Updated":     c.lastUpdated || "",
    "Summary":          c.summary || "",
  }));
}

export function downloadExcel(rows, filename) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] || "").length), 10),
  }));
  ws["!cols"] = colWidths;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Candidates");
  XLSX.writeFile(wb, filename);
}

export function RecruiterHeaderActions({ onCreateNew, allCandidates = [] }) {
  const handleExportAll = () => {
    if (!allCandidates.length) return;
    downloadExcel(buildRows(allCandidates), "talent-pool-all.xlsx");
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onCreateNew}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
      >
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Add Candidate</span>
      </button>

      <button
        onClick={handleExportAll}
        disabled={!allCandidates.length}
        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        title="Export all candidates to Excel"
      >
        <Download className="w-4 h-4" />
        <span className="hidden sm:inline">Export All</span>
      </button>
    </div>
  );
}
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Building2, MapPin, Layers, FileText, CheckCircle2,
  Code, Gift, Briefcase, ListChecks, Copy, ArrowLeft,
  Star, Wrench, Globe, GraduationCap, Clock, Info,
} from "lucide-react";
import toast from "react-hot-toast";

export default function RecruiterJobDetails() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const [copied, setCopied] = useState(null);

  // ── Unwrap: navigate passes either { generatedJob: job } or the job directly ──
  const job = state?.generatedJob ?? state;

  if (!job) {
    navigate("/recruiter/my-jobs");
    return null;
  }

  // ── Top-level fields ────────────────────────────────────────────────────────
  const {
    job_title     = "Untitled Role",
    company_name  = "",
    department    = "",
    location      = "",
    level         = "",
    tone_style    = "",
    skills        = "",
    about_company = "",
    output_description = {},
  } = job;

  // ── output_description fields ───────────────────────────────────────────────
  const {
    about_the_role             = "",
    minimum_experience         = "",
    key_responsibilities       = [],
    required_skills: _required_skills = [],
    preferred_skills           = [],
    education_requirements     = [],
    qualities_and_requirements = [],
    tools_and_technologies     = [],
    work_environment           = "",
    benefits_and_perks         = [],
    about_us                   = "",
  } = output_description;

  // Always show the recruiter's input skills in the Required Skills section
  const required_skills = skills.split(",").map((s) => s.trim()).filter(Boolean);

  // ── Copy helpers ─────────────────────────────────────────────────────────────
  const copySection = (key, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const buildFullText = () => {
    const lines = [];
    lines.push(job_title);
    if (company_name) lines.push(company_name);
    if (location)     lines.push(location);
    if (department)   lines.push("Department: " + department);
    if (level)        lines.push("Level: " + level);
    lines.push("");

    const push = (heading, content) => {
      if (!content || (Array.isArray(content) && !content.length)) return;
      lines.push(heading);
      if (Array.isArray(content)) content.forEach((r, i) => lines.push((i + 1) + ". " + r));
      else lines.push(content);
      lines.push("");
    };

    push("About the Role",               about_the_role);
    push("Minimum Experience",           minimum_experience);
    push("Key Responsibilities",         key_responsibilities);
    push("Required Skills",              required_skills);
    push("Preferred Skills",             preferred_skills);
    push("Education Requirements",       education_requirements);
    push("Qualifications & Requirements",qualities_and_requirements);
    push("Tools & Technologies",         tools_and_technologies);
    push("Work Environment",             work_environment);
    push("Benefits & Perks",             benefits_and_perks);
    push("About Us",                     about_us);

    return lines.join("\n").trim();
  };

  const handleExport = () => {
    const text = buildFullText();
    const blob = new Blob([text], { type: "text/plain" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = (job_title || "job-description") + ".txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported as .txt");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-0">
      <div className="mx-auto">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-4">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 mb-3 transition-colors"
            >
              <ArrowLeft size={15} /> Back to listings
            </button>

            <h1 className="text-3xl font-bold text-gray-900">{job_title}</h1>

            {/* Meta pills */}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gray-600">
              {company_name && (
                <MetaPill icon={<Building2 size={13} />}>{company_name}</MetaPill>
              )}
              {location && (
                <MetaPill icon={<MapPin size={13} />}>{location}</MetaPill>
              )}
              {department && (
                <MetaPill icon={<Layers size={13} />}>{department}</MetaPill>
              )}
              {level && (
                <MetaPill icon={<Clock size={13} />}>{level}</MetaPill>
              )}
              {tone_style && (
                <MetaPill icon={<Star size={13} />}>{tone_style}</MetaPill>
              )}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                <CheckCircle2 size={13} /> Active JD
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              onClick={() => copySection("all", buildFullText())}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <Copy size={16} /> Copy All
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors"
            >
              <FileText size={16} /> Export
            </button>
          </div>
        </div>

        {/* ── Skills from top-level (input skills) ──────────────────────────── */}
        {/* {skills && (
          <div className="mb-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide mr-1">Input Skills</span>
            {skills.split(",").map((s) => s.trim()).filter(Boolean).map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700 border border-gray-200">
                {s}
              </span>
            ))}
          </div>
        )} */}

        {/* ── JD Card ────────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden divide-y divide-gray-100">

          {/* About the Role */}
          <JdSection title="About the Role" icon={<Briefcase size={18} className="text-emerald-600" />}
            onCopy={() => copySection("about", about_the_role)} copied={copied === "about"}>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {about_the_role || <Em>Not specified.</Em>}
            </p>
          </JdSection>

          {/* Minimum Experience */}
          <JdSection title="Minimum Experience" icon={<Clock size={18} className="text-emerald-600" />}
            onCopy={() => copySection("exp", minimum_experience)} copied={copied === "exp"}>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {minimum_experience || <Em>Not specified.</Em>}
            </p>
          </JdSection>

          {/* Key Responsibilities */}
          <JdSection title="Key Responsibilities" icon={<ListChecks size={18} className="text-emerald-600" />}
            onCopy={() => copySection("resp", key_responsibilities.map((r, i) => `${i + 1}. ${r}`).join("\n"))}
            copied={copied === "resp"}>
            <NumberedList items={key_responsibilities} empty="No responsibilities provided." />
          </JdSection>

          {/* Required Skills */}
          <JdSection title="Required Skills" icon={<Code size={18} className="text-emerald-600" />}
            onCopy={() => copySection("req_skills", required_skills.join(", "))} copied={copied === "req_skills"}>
            <SkillPills items={required_skills} colorClass="bg-emerald-50 text-emerald-700 border-emerald-200" empty="No required skills listed." />
          </JdSection>

          {/* Preferred Skills */}
          <JdSection title="Preferred Skills" icon={<Star size={18} className="text-emerald-600" />}
            onCopy={() => copySection("pref_skills", preferred_skills.join(", "))} copied={copied === "pref_skills"}>
            <SkillPills items={preferred_skills} colorClass="bg-blue-50 text-blue-700 border-blue-200" empty="No preferred skills listed." />
          </JdSection>

          {/* Education Requirements */}
          <JdSection title="Education Requirements" icon={<GraduationCap size={18} className="text-emerald-600" />}
            onCopy={() => copySection("edu", education_requirements.map((r, i) => `${i + 1}. ${r}`).join("\n"))}
            copied={copied === "edu"}>
            <NumberedList items={education_requirements} empty="No education requirements listed." />
          </JdSection>

          {/* Qualifications & Requirements */}
          <JdSection title="Qualifications & Requirements" icon={<FileText size={18} className="text-emerald-600" />}
            onCopy={() => copySection("qual", qualities_and_requirements.map((r, i) => `${i + 1}. ${r}`).join("\n"))}
            copied={copied === "qual"}>
            <NumberedList items={qualities_and_requirements} empty="No qualifications listed." />
          </JdSection>

          {/* Tools & Technologies */}
          <JdSection title="Tools & Technologies" icon={<Wrench size={18} className="text-emerald-600" />}
            onCopy={() => copySection("tools", tools_and_technologies.join(", "))} copied={copied === "tools"}>
            <SkillPills items={tools_and_technologies} colorClass="bg-purple-50 text-purple-700 border-purple-200" empty="No tools listed." />
          </JdSection>

          {/* Work Environment */}
          <JdSection title="Work Environment" icon={<Globe size={18} className="text-emerald-600" />}
            onCopy={() => copySection("env", work_environment)} copied={copied === "env"}>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {work_environment || <Em>Not specified.</Em>}
            </p>
          </JdSection>

          {/* Benefits & Perks */}
          <JdSection title="Benefits & Perks" icon={<Gift size={18} className="text-emerald-600" />}
            onCopy={() => copySection("benefits", benefits_and_perks.map((r, i) => `${i + 1}. ${r}`).join("\n"))}
            copied={copied === "benefits"}>
            <NumberedList items={benefits_and_perks} empty="No benefits listed." />
            <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">
              <FileText size={15} /> ATS Optimized
            </div>
          </JdSection>

          {/* About Us — generated from about_company */}
          <JdSection title="About Us" icon={<Building2 size={18} className="text-emerald-600" />}
            onCopy={() => copySection("about_us", about_us)} copied={copied === "about_us"}>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {about_us || <Em>Not specified.</Em>}
            </p>
          </JdSection>

        </div>
      </div>
    </div>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function Em({ children }) {
  return <span className="text-gray-400 italic text-sm">{children}</span>;
}

function MetaPill({ icon, children }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-50 text-gray-700 border border-gray-200 text-xs font-medium">
      <span className="text-gray-400">{icon}</span>
      {children}
    </span>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function JdSection({ title, icon, children, onCopy, copied }) {
  return (
    <div className="p-6 md:p-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          {icon} {title}
        </h2>
        <button
          onClick={onCopy}
          title="Copy section"
          className={"flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all " +
            (copied
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
              : "bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-gray-200")}
        >
          {copied
            ? <><CheckCircle2 size={13} /> Copied</>
            : <><Copy size={13} /> Copy</>}
        </button>
      </div>
      {children}
    </div>
  );
}

function NumberedList({ items = [], empty }) {
  if (!items.length) return <Em>{empty}</Em>;
  return (
    <ol className="list-decimal pl-5 space-y-2.5 text-gray-700">
      {items.map((item, idx) => (
        <li key={idx} className="pl-1 leading-relaxed">{item}</li>
      ))}
    </ol>
  );
}

function SkillPills({ items = [], colorClass, empty }) {
  if (!items.length) return <Em>{empty}</Em>;
  return (
    <div className="flex flex-wrap gap-2 mt-1">
      {items.map((s, i) => (
        <span key={i} className={`px-3 py-1 rounded-full text-sm font-medium border ${colorClass}`}>
          {s}
        </span>
      ))}
    </div>
  );
}
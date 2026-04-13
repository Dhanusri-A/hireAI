import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, MapPin, User, Briefcase, CheckCircle2,
  ChevronRight, ChevronLeft, X, Plus,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { createRecruiterProfile } from "../../../api/api";
import { useAuth } from "../../../context/AuthContext";
import amzLogo from "../../../assets/images/amz-logo.png";
import {
  INDUSTRIES, COMPANY_SIZES, COMPANY_TYPES, DEPARTMENTS,
  EXPERIENCE_LEVELS, EMPLOYMENT_TYPES, WORK_MODES, COMPANY_FORM_INITIAL,
} from "../../../constants/recruiterConstants";

const DRAFT_KEY = "company_setup_draft";

const STEPS = [
  { label: "Company Info",       icon: Building2  },
  { label: "Location",           icon: MapPin     },
  { label: "Recruiter Info",     icon: User       },
  { label: "Hiring Preferences", icon: Briefcase  },
  { label: "Review & Submit",    icon: CheckCircle2 },
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const inp  = "w-full border-2 border-gray-200 rounded-xl py-3 px-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none transition-all text-gray-900 text-sm bg-white";
const sel  = inp;
const lbl  = "text-xs font-semibold text-gray-700 mb-1.5 block";
const err  = "text-xs text-red-500 mt-1";

// ── Tag input (chips) ─────────────────────────────────────────────────────────
function TagInput({ value = [], onChange, placeholder }) {
  const [input, setInput] = useState("");

  const add = () => {
    const v = input.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setInput("");
  };

  const remove = (tag) => onChange(value.filter((t) => t !== tag));

  return (
    <div className="border-2 border-gray-200 rounded-xl p-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100 transition-all">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
            {tag}
            <button type="button" onClick={() => remove(tag)}><X size={10} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 text-sm outline-none text-gray-900 placeholder-gray-400"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <button type="button" onClick={add} className="text-emerald-600 hover:text-emerald-700">
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

// ── Multi-select pills ────────────────────────────────────────────────────────
function MultiPill({ options, value = [], onChange }) {
  const toggle = (opt) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all ${
            value.includes(opt)
              ? "bg-emerald-600 border-emerald-600 text-white"
              : "border-gray-200 text-gray-600 hover:border-emerald-400"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Validation per step ───────────────────────────────────────────────────────
function validate(step, form) {
  const e = {};
  if (step === 0) {
    if (!form.company_name.trim()) e.company_name = "Company name is required";
    if (!form.industry)            e.industry     = "Select an industry";
    if (!form.company_size)        e.company_size = "Select company size";
  }
  if (step === 1) {
    if (!form.country.trim()) e.country = "Country is required";
    if (!form.city.trim())    e.city    = "City is required";
  }
  if (step === 2) {
    if (!form.job_title.trim()) e.job_title = "Your job title is required";
  }
  return e;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function RecruiterCompanySetup() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [step,    setStep]    = useState(0);
  const [form,    setForm]    = useState(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      return draft ? { ...COMPANY_FORM_INITIAL, ...JSON.parse(draft) } : COMPANY_FORM_INITIAL;
    } catch { return COMPANY_FORM_INITIAL; }
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  // Auto-fill email from auth
  useEffect(() => {
    if (user?.email && !form.official_email) {
      setForm((p) => ({ ...p, official_email: user.email }));
    }
  }, [user]);

  // Auto-save draft on every form change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
  }, [form]);

  const set = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const setArr = (field) => (val) =>
    setForm((p) => ({ ...p, [field]: val }));

  const clearError = (field) =>
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });

  const goNext = () => {
    const e = validate(step, form);
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep((s) => s + 1);
    window.scrollTo(0, 0);
  };

  const goBack = () => { setErrors({}); setStep((s) => s - 1); window.scrollTo(0, 0); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await createRecruiterProfile(form);
      localStorage.removeItem(DRAFT_KEY);
      toast.success("Company profile saved!");
      navigate("/recruiter", { replace: true });
    } catch {
      // toast handled in api.js
    } finally {
      setLoading(false);
    }
  };

  const progress = Math.round((step / (STEPS.length - 1)) * 100);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <Toaster position="top-center" />

      <div className="w-full max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={amzLogo} alt="AMZ.AI" className="h-10 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Set up your company profile</h1>
          <p className="text-sm text-gray-500 mt-1">Required before you continue · Draft auto-saved</p>
        </div>

        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="flex flex-col items-center gap-1" style={{ width: `${100 / STEPS.length}%` }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    i < step  ? "bg-emerald-600 text-white" :
                    i === step ? "bg-emerald-600 text-white ring-4 ring-emerald-100" :
                                 "bg-gray-200 text-gray-400"
                  }`}>
                    {i < step ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                  </div>
                  <span className={`text-[10px] font-semibold text-center hidden sm:block ${i === step ? "text-emerald-600" : "text-gray-400"}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">Step {step + 1} of {STEPS.length}</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">

          {/* ── Step 0: Company Info ── */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Building2 size={18} className="text-emerald-600" /> Company Info
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className={lbl}>Company Name *</label>
                  <input className={inp} placeholder="Acme Corp" value={form.company_name}
                    onChange={(e) => { set("company_name")(e); clearError("company_name"); }} />
                  {errors.company_name && <p className={err}>{errors.company_name}</p>}
                </div>

                <div>
                  <label className={lbl}>Industry *</label>
                  <select className={sel} value={form.industry}
                    onChange={(e) => { set("industry")(e); clearError("industry"); }}>
                    <option value="">Select industry</option>
                    {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                  </select>
                  {errors.industry && <p className={err}>{errors.industry}</p>}
                </div>

                <div>
                  <label className={lbl}>Company Size *</label>
                  <select className={sel} value={form.company_size}
                    onChange={(e) => { set("company_size")(e); clearError("company_size"); }}>
                    <option value="">Select size</option>
                    {COMPANY_SIZES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                  {errors.company_size && <p className={err}>{errors.company_size}</p>}
                </div>

                <div>
                  <label className={lbl}>Company Type</label>
                  <select className={sel} value={form.company_type} onChange={set("company_type")}>
                    <option value="">Select type</option>
                    {COMPANY_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Founded Year</label>
                  <input className={inp} placeholder="2010" maxLength={4} value={form.founded_year}
                    onChange={set("founded_year")} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>About the Company</label>
                  <textarea className={inp + " resize-none"} rows={3}
                    placeholder="Brief description of what your company does..."
                    value={form.description} onChange={set("description")} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Specializations / Technologies</label>
                  <TagInput
                    value={form.specializations}
                    onChange={setArr("specializations")}
                    placeholder="e.g. React, Java, AI, Cloud — press Enter to add"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Location ── */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <MapPin size={18} className="text-emerald-600" /> Location & Online Presence
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Country *</label>
                  <input className={inp} placeholder="India" value={form.country}
                    onChange={(e) => { set("country")(e); clearError("country"); }} />
                  {errors.country && <p className={err}>{errors.country}</p>}
                </div>

                <div>
                  <label className={lbl}>City / State *</label>
                  <input className={inp} placeholder="Hyderabad, Telangana" value={form.city}
                    onChange={(e) => { set("city")(e); clearError("city"); }} />
                  {errors.city && <p className={err}>{errors.city}</p>}
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Headquarters Location</label>
                  <input className={inp} placeholder="123 Tech Park, Hyderabad" value={form.headquarters}
                    onChange={set("headquarters")} />
                </div>

                <div>
                  <label className={lbl}>Website</label>
                  <input className={inp} placeholder="https://acme.com" type="url"
                    value={form.website} onChange={set("website")} />
                </div>

                <div>
                  <label className={lbl}>LinkedIn Company Page</label>
                  <input className={inp} placeholder="https://linkedin.com/company/acme" type="url"
                    value={form.linkedin_url} onChange={set("linkedin_url")} />
                </div>

                <div>
                  <label className={lbl}>Twitter / X</label>
                  <input className={inp} placeholder="https://x.com/acme" type="url"
                    value={form.twitter_url} onChange={set("twitter_url")} />
                </div>

                <div>
                  <label className={lbl}>Glassdoor</label>
                  <input className={inp} placeholder="https://glassdoor.com/Overview/acme" type="url"
                    value={form.glassdoor_url} onChange={set("glassdoor_url")} />
                </div>

                <div className="sm:col-span-2">
                  <label className={lbl}>Company Video URL (YouTube intro)</label>
                  <input className={inp} placeholder="https://youtube.com/watch?v=..." type="url"
                    value={form.video_url} onChange={set("video_url")} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Recruiter Info ── */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User size={18} className="text-emerald-600" /> Recruiter Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={lbl}>Full Name *</label>
                  <input className={inp} placeholder="Jane Smith" value={form.full_name || user?.full_name || ""}
                    onChange={set("full_name")} />
                </div>

                <div>
                  <label className={lbl}>Official Email</label>
                  <input className={inp + " bg-gray-50 cursor-not-allowed"} type="email"
                    value={user?.email || ""} readOnly />
                </div>

                <div>
                  <label className={lbl}>Your Job Title *</label>
                  <input className={inp} placeholder="HR Manager" value={form.job_title}
                    onChange={(e) => { set("job_title")(e); clearError("job_title"); }} />
                  {errors.job_title && <p className={err}>{errors.job_title}</p>}
                </div>

                <div>
                  <label className={lbl}>Department</label>
                  <select className={sel} value={form.department} onChange={set("department")}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className={lbl}>Phone Number</label>
                  <input className={inp} placeholder="+91 98765 43210" type="tel"
                    value={form.phone} onChange={set("phone")} />
                </div>

                <div>
                  <label className={lbl}>LinkedIn Profile (personal)</label>
                  <input className={inp} placeholder="https://linkedin.com/in/janesmith" type="url"
                    value={form.recruiter_linkedin} onChange={set("recruiter_linkedin")} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Hiring Preferences ── */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Briefcase size={18} className="text-emerald-600" /> Hiring Preferences
              </h2>

              <div>
                <label className={lbl}>Hiring Roles</label>
                <TagInput
                  value={form.hiring_roles}
                  onChange={setArr("hiring_roles")}
                  placeholder="e.g. Frontend Developer — press Enter to add"
                />
              </div>

              <div>
                <label className={lbl}>Experience Level</label>
                <MultiPill options={EXPERIENCE_LEVELS} value={form.experience_levels}
                  onChange={setArr("experience_levels")} />
              </div>

              <div>
                <label className={lbl}>Employment Type</label>
                <MultiPill options={EMPLOYMENT_TYPES} value={form.employment_types}
                  onChange={setArr("employment_types")} />
              </div>

              <div>
                <label className={lbl}>Work Mode</label>
                <MultiPill options={WORK_MODES} value={form.work_modes}
                  onChange={setArr("work_modes")} />
              </div>

              <div>
                <label className={lbl}>Salary Range (per annum)</label>
                <div className="grid grid-cols-2 gap-3">
                  <input className={inp} placeholder="Min e.g. 5,00,000" value={form.salary_range_min}
                    onChange={set("salary_range_min")} />
                  <input className={inp} placeholder="Max e.g. 15,00,000" value={form.salary_range_max}
                    onChange={set("salary_range_max")} />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 4: Review & Submit ── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" /> Review & Submit
              </h2>

              {[
                {
                  title: "Company Info",
                  rows: [
                    ["Company", form.company_name],
                    ["Industry", form.industry],
                    ["Size", form.company_size],
                    ["Type", form.company_type],
                    ["Founded", form.founded_year],
                    ["Specializations", form.specializations?.join(", ")],
                  ],
                },
                {
                  title: "Location",
                  rows: [
                    ["Country", form.country],
                    ["City", form.city],
                    ["HQ", form.headquarters],
                    ["Website", form.website],
                  ],
                },
                {
                  title: "Recruiter Info",
                  rows: [
                    ["Job Title", form.job_title],
                    ["Department", form.department],
                    ["Phone", form.phone],
                  ],
                },
                {
                  title: "Hiring Preferences",
                  rows: [
                    ["Roles", form.hiring_roles?.join(", ")],
                    ["Experience", form.experience_levels?.join(", ")],
                    ["Employment", form.employment_types?.join(", ")],
                    ["Work Mode", form.work_modes?.join(", ")],
                    ["Salary", form.salary_range_min && form.salary_range_max ? `${form.salary_range_min} – ${form.salary_range_max}` : ""],
                  ],
                },
              ].map((section) => (
                <div key={section.title}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{section.title}</p>
                    <button type="button" onClick={() => setStep(["Company Info","Location","Recruiter Info","Hiring Preferences"].indexOf(section.title))}
                      className="text-xs text-emerald-600 font-semibold hover:underline">Edit</button>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    {section.rows.filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} className="flex gap-2 text-sm">
                        <span className="text-gray-500 w-28 shrink-0">{k}</span>
                        <span className="text-gray-900 font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button type="button" onClick={goBack}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-semibold flex items-center justify-center gap-2 hover:border-gray-300 transition-all">
                <ChevronLeft size={18} /> Back
              </button>
            )}

            {step < STEPS.length - 1 ? (
              <button type="button" onClick={goNext}
                className="flex-1 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/20 transition-all">
                {loading ? "Saving..." : "Submit & Continue"} <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

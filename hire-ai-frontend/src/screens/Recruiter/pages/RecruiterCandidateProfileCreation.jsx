// src/components/ProfileCreationFlow.jsx
import React, { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Loader2 } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { createCandidateProfile, getProfileUploadUrl } from "../../../api/api";
import Step1Basics from "../steps/Step1Basics";
import Step2OnlinePresence from "../steps/Step2OnlinePresence";
import Step3Experience from "../steps/Step3Experience";
import Step4Education from "../steps/Step4Education";
import Step5Certifications from "../steps/Step5Certifications.jsx";
import Step6Skills from "../steps/Step6Skills";
import Step7SummaryPreferences from "../steps/Step7SummaryPreferences";
import Step8Review from "../steps/Step8Review";
import toast from "react-hot-toast";

const steps = [
  "Basics", "Online", "Experience", "Education",
  "Certifications", "Skills", "Summary", "Review",
];

// ── Resume data mapper ────────────────────────────────────────────────────────
const mapResumeDataToForm = (apiData) => {
  if (apiData.firstName) {
    return {
      ...apiData,
      experiences:    (apiData.experiences    || []).filter((e) => e.company?.trim() || e.title?.trim()),
      education:      (apiData.education      || []).filter((e) => e.school?.trim()  || e.degree?.trim()),
      certifications: (apiData.certifications || []).filter((c) => c.name?.trim()),
    };
  }
  if (!apiData?.data) return null;
  const data = apiData.data;

  const experiences = (data.work_experience || [])
    .filter((e) => e.company_name?.trim() || e.job_title?.trim())
    .map((e, i) => ({
      id: Date.now() + i,
      company: e.company_name || "", title: e.job_title || "",
      startMonth: "", startYear: e.start_date || "",
      endMonth: "",  endYear:   e.end_date   || "",
      current: !e.end_date, location: e.location || "", description: e.description || "",
    }));

  const education = (data.education || [])
    .filter((e) => e.institution_name?.trim() || e.degree?.trim())
    .map((e, i) => ({
      id: Date.now() + i + 1000,
      school: e.institution_name || "", degree: e.degree || "",
      field: e.field_of_study || "", startYear: e.start_year || "",
      endYear: e.end_year || "", gpa: e.gpa || "", honors: e.honors || "",
    }));

  const certifications = (data.certifications || [])
    .filter((c) => c.certification_name?.trim())
    .map((c, i) => ({
      id: Date.now() + i + 2000,
      name: c.certification_name || "", issuingOrganization: c.issuing_body || "",
      issueDate:   c.issue_date   ? c.issue_date.slice(0, 7)   : "",
      expiryDate:  c.expiry_date  ? c.expiry_date.slice(0, 7)  : "",
      credentialId: c.credential_id || "",
      description: c.certification_description || "No description provided",
    }));

  const technicalSkills = data.skills
    ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const languages = Object.keys(data.languages || {})
    .filter((l) => l?.trim())
    .map((l) => ({
      id: Date.now() + Math.random(),
      language: l.charAt(0).toUpperCase() + l.slice(1),
      proficiency: data.languages[l] || "Intermediate",
    }));

  let phoneNumber = "", phoneCountryCode = "+91";
  if (data.phone) {
    const m = data.phone.match(/^(\+\d+)\s*(.+)$/);
    if (m) { phoneCountryCode = m[1]; phoneNumber = m[2].trim(); }
    else    { phoneNumber = data.phone.replace(/^\+\d+\s*/, ""); }
  }

  return {
    firstName: data.first_name || "", lastName: data.last_name || "",
    headline: data.title || "", email: data.email || "",
    phone: phoneNumber, phoneCountryCode,
    location: data.location || "",
    linkedin: data.profiles?.linkedin || "", github: data.profiles?.github || "",
    portfolio: data.profiles?.portfolio || "", twitter: data.profiles?.twitter || "",
    experiences, education, certifications, technicalSkills,
    summary: data.profile_summary || "", yearsOfExperience: data.total_years_experience || "",
    noticePeriod: data.notice_period || "",
    workType: data.preferred_mode
      ? data.preferred_mode.split(",").map((m) => m.trim()).filter(Boolean)
      : [],
    languages,
  };
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function RecruiterCandidateProfileCreation() {
  const location        = useLocation();
  const parsedResumeData = location.state?.parsedResumeData;
  const { user, token, isAuthenticated } = useAuth();
  const navigate        = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const totalSteps = steps.length;
  const progress   = Math.round((currentStep / totalSteps) * 100);

  const defaultFormValues = {
    firstName: "", lastName: "", headline: "", email: "",
    phone: "", phoneCountryCode: "+91", location: "",
    profilePhoto: null,   // { file: File, preview: base64 }
    linkedin: "", github: "", portfolio: "", twitter: "",
    experiences: [], education: [], certifications: [],
    technicalSkills: [], softSkills: [],
    summary: "", yearsOfExperience: "", noticePeriod: "",
    salaryCurrency: "USD", salaryMin: "", salaryMax: "",
    workType: [], languages: [],
  };

  // ── Initialise synchronously so child steps always see data on first render.
  // A useEffect-based merge fires AFTER the first render, causing steps that
  // snapshot formData in their own useState() to miss the pre-filled values.
  const getInitialFormData = () => {
    if (!parsedResumeData) return defaultFormValues;
    const mapped = mapResumeDataToForm(parsedResumeData);
    if (!mapped) return defaultFormValues;
    return { ...defaultFormValues, ...mapped };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  // Show toast once on mount when resume data was pre-filled
  useEffect(() => {
    if (parsedResumeData) {
      toast.success("Profile pre-filled from your resume!", { duration: 4000, icon: "📄" });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateFormData = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateStep = (step) => {
    switch (step) {
      case 1: return (
        formData.firstName?.trim() && formData.lastName?.trim() &&
        formData.headline?.trim()  && formData.email?.trim() &&
        formData.phone?.trim()     && formData.location?.trim() &&
        /\S+@\S+\.\S+/.test(formData.email.trim())
      );
      case 2: return true;
      case 3: return formData.experiences?.length > 0
        ? formData.experiences.every((e) => e.company?.trim() && e.title?.trim())
        : true;
      case 4: return formData.education?.length > 0
        ? formData.education.every((e) => e.school?.trim() && e.degree?.trim())
        : true;
      case 5: return true;
      case 6: return formData.technicalSkills?.length >= 3;
      case 7: return (
        formData.summary?.trim()?.length >= 20 &&
        formData.yearsOfExperience?.trim() &&
        formData.noticePeriod?.trim() &&
        formData.workType?.length > 0
      );
      case 8: return true;
      default: return true;
    }
  };

  const isFormValid = () => {
    const required = [
      formData.firstName?.trim(), formData.lastName?.trim(),
      formData.headline?.trim(),  formData.email?.trim(),
      formData.phone?.trim(),     formData.location?.trim(),
      formData.summary?.trim(),   formData.yearsOfExperience?.trim(),
    ];
    return (
      required.every(Boolean) &&
      (formData.experiences?.length > 0 ||
       formData.education?.length   > 0 ||
       formData.technicalSkills?.length >= 3)
    );
  };

  const goNext = () => {
    if (!validateStep(currentStep)) {
      toast.error(
        `Please complete all required fields in the "${steps[currentStep - 1]}" step`,
        { duration: 5000, style: { border: "1px solid #ef4444", padding: "16px", color: "#fff", background: "#991b1b" } }
      );
      return;
    }
    if (currentStep < totalSteps) setCurrentStep((s) => s + 1);
  };

  const goBack = () => { if (currentStep > 1) setCurrentStep((s) => s - 1); };

  // ── S3 profile photo upload ─────────────────────────────────────────────────
  // Returns the public imageUrl, or "" if no photo was selected.
  const uploadProfilePhoto = async () => {
    const photo = formData.profilePhoto;
    if (!photo?.file) return "";

    const userId   = user?.id || "anonymous";
    const fileType = photo.file.type || "image/jpeg";

    // 1. Get presigned upload URL from backend
    const { uploadUrl, imageUrl } = await getProfileUploadUrl(userId, fileType);

    // 2. PUT file directly to S3 (no Authorization header — presigned URL handles auth)
    const putRes = await fetch(uploadUrl, {
      method:  "PUT",
      headers: { "Content-Type": fileType },
      body:    photo.file,
    });

    if (!putRes.ok) {
      throw new Error(`S3 upload failed: ${putRes.status} ${putRes.statusText}`);
    }

    return imageUrl;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleCreateProfile = async () => {
    if (!isAuthenticated) {
      toast.error("Please login first");
      navigate("/recruiter-signin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1 — upload photo first (if provided)
      let imageUrl = "";
      if (formData.profilePhoto?.file) {
        toast.loading("Uploading profile photo…", { id: "photo-upload" });
        try {
          imageUrl = await uploadProfilePhoto();
          toast.success("Photo uploaded!", { id: "photo-upload", duration: 1500 });
        } catch (photoErr) {
          toast.error("Photo upload failed — profile will be created without a photo.", { id: "photo-upload" });
          // Non-fatal: continue without the photo
        }
      }

      // Step 2 — build payload
      const educationRecords = formData.education.map((edu) => ({
        institution_name: edu.school?.trim()  || "",
        degree:           edu.degree          || "",
        field_of_study:   edu.field?.trim()   || "",
        start_year:       edu.startYear ? Number(edu.startYear) : null,
        end_year:         edu.endYear   ? Number(edu.endYear)   : null,
      }));

      const workExperiences = formData.experiences.map((exp) => ({
        company_name: exp.company?.trim()     || "",
        job_title:    exp.title?.trim()       || "",
        location:     exp.location?.trim()    || "",
        description:  exp.description?.trim() || "",
      }));

      const certificationRecords = (formData.certifications || [])
        .filter((c) => c.name?.trim() && c.description?.trim())
        .map((c) => ({
          certification_name:        c.name.trim(),
          issuing_body:              c.issuingOrganization?.trim() || null,
          credential_id:             c.credentialId?.trim()        || null,
          issue_date:   c.issueDate  ? new Date(`${c.issueDate}-01`).toISOString()  : null,
          expiry_date:  c.expiryDate ? new Date(`${c.expiryDate}-01`).toISOString() : null,
          certification_description: c.description.trim() || "No description provided",
        }));

      const payload = {
        email:                  formData.email?.trim()    || "",
        first_name:             formData.firstName?.trim() || "",
        last_name:              formData.lastName?.trim()  || "",
        title:                  formData.headline?.trim()  || "",
        image_url:              imageUrl,                  // "" if no photo
        phone:                  formData.phone?.trim()
                                  ? `${formData.phoneCountryCode || "+91"}${formData.phone}`
                                  : "",
        location:               formData.location?.trim()  || "",
        skills:                 formData.technicalSkills?.join(", ") || "",
        profile_summary:        formData.summary?.trim()   || "",
        total_years_experience: formData.yearsOfExperience || "",
        notice_period:          formData.noticePeriod      || "",
        expected_salary:        formData.salaryMin && formData.salaryMax
                                  ? `${formData.salaryCurrency || "USD"} ${formData.salaryMin} - ${formData.salaryMax}`
                                  : "",
        preferred_mode:         formData.workType?.join(", ") || "",
        languages:              (formData.languages || []).reduce((acc, lang) => {
                                  if (lang.language && lang.proficiency)
                                    acc[lang.language] = { proficiency: lang.proficiency };
                                  return acc;
                                }, {}),
        profiles: {
          linkedin:  formData.linkedin  || "",
          github:    formData.github    || "",
          portfolio: formData.portfolio || "",
          twitter:   formData.twitter   || "",
        },
        education:        educationRecords,
        work_experiences: workExperiences,
        certifications:   certificationRecords,
      };

      // Step 3 — create profile
      await createCandidateProfile(payload);
      toast.success("Profile created successfully!", { duration: 5000, icon: "🎉" });
      navigate("/recruiter/talent-pool");

    } catch (err) {
      console.error("Profile creation error:", err);
      const msg =
        (err?.detail && Array.isArray(err.detail) ? err.detail[0]?.msg : null) ||
        err?.message ||
        "Failed to create profile. Please try again.";
      toast.error(msg, {
        duration: 6000,
        style: { border: "1px solid #ef4444", padding: "16px", color: "#fff", background: "#991b1b" },
      });
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const commonProps = { goNext, goBack, formData, updateFormData };
  const renderStep  = () => {
    switch (currentStep) {
      case 1: return <Step1Basics             {...commonProps} />;
      case 2: return <Step2OnlinePresence     {...commonProps} />;
      case 3: return <Step3Experience         {...commonProps} />;
      case 4: return <Step4Education          {...commonProps} />;
      case 5: return <Step5Certifications     {...commonProps} />;
      case 6: return <Step6Skills             {...commonProps} />;
      case 7: return <Step7SummaryPreferences {...commonProps} />;
      case 8: return <Step8Review             {...commonProps} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 font-sans antialiased pb-2">

      {/* Sticky progress header */}
      <div className="sticky top-0 z-40 bg-white shadow-sm rounded-b-2xl border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-5 py-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-5">
            Create your Profile
          </h1>

          <div className="mb-5">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-700 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-gray-600">Step {currentStep} of {totalSteps}</span>
              <span className="font-semibold text-emerald-700">{progress}% Complete</span>
            </div>
          </div>

          {/* Step circles */}
          <div className="flex items-center justify-between gap-1 md:gap-2">
            {steps.map((label, i) => {
              const stepNum  = i + 1;
              const isActive = stepNum === currentStep;
              const isDone   = stepNum < currentStep;
              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center flex-1 min-w-0">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-semibold border-2 transition-all ${
                      isDone   ? "bg-emerald-600 border-emerald-600 text-white" :
                      isActive ? "bg-white border-emerald-600 text-emerald-600 ring-4 ring-emerald-100/70" :
                                 "bg-gray-100 border-gray-300 text-gray-500"
                    }`}>
                      {isDone ? <Check className="w-4 h-4 md:w-5 md:h-5" /> : stepNum}
                    </div>
                    <span className={`text-xs mt-1.5 hidden md:block font-medium truncate max-w-[72px] text-center ${
                      isActive ? "text-emerald-700" : "text-gray-500"
                    }`}>
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-0.5 flex-1 ${isDone ? "bg-emerald-600" : "bg-gray-200"}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <main className="pt-10 pb-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">{renderStep()}</div>
      </main>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 mt-8 flex items-center justify-between gap-4">
        <button
          onClick={goBack}
          disabled={currentStep === 1}
          className="flex items-center gap-2 px-6 py-3 border border-gray-300 rounded-xl font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </button>

        {currentStep < totalSteps ? (
          <button
            onClick={goNext}
            className={`flex items-center gap-2 px-7 py-3 font-semibold rounded-xl shadow-md transition-all ${
              validateStep(currentStep)
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            Next <ArrowRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleCreateProfile}
            disabled={loading || !validateStep(totalSteps) || !isFormValid()}
            className={`flex items-center gap-2 px-8 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all ${
              loading || !validateStep(totalSteps) || !isFormValid()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin" />Creating...</>
            ) : (
              <>Create Profile <Sparkles size={18} /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
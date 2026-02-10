// src/components/ProfileCreationFlow.jsx
import React, { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles ,Loader2} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext"; // ← import
import { createCandidateProfile } from "../../../api/api";
import Step1Basics from "../steps/Step1Basics";
import Step2OnlinePresence from "../steps/Step2OnlinePresence";
import Step3Experience from "../steps/Step3Experience";
import Step4Education from "../steps/Step4Education";
import Step5Skills from "../steps/Step5Skills";
import Step6SummaryPreferences from "../steps/Step6SummaryPreferences";
import Step7Review from "../steps/Step7Review";
import toast from "react-hot-toast";
const steps = [
  "Basics",
  "Online",
  "Experience",
  "Education",
  "Skills",
  "Summary",
  "Review",
];

export default function RecruiterCandidateProfileCreation() {
  const { token, isAuthenticated } = useAuth(); // ← get auth state
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const totalSteps = steps.length;
  const progress = Math.round((currentStep / totalSteps) * 100);
  // Returns true if current step is valid (all required fields are filled)
  const validateStep = (step) => {
    switch (step) {
      case 1: // Basics
        return (
          formData.firstName?.trim() &&
          formData.lastName?.trim() &&
          formData.headline?.trim() &&
          formData.email?.trim() &&
          formData.phone?.trim() &&
          formData.location?.trim() &&
          // Optional: basic email format check
          /\S+@\S+\.\S+/.test(formData.email.trim())
        );

      case 2: // Online Presence
        // All optional → always allow next
        return true;

      case 3: // Experience
        // At least one experience with company & title is recommended
        return formData.experiences?.length > 0
          ? formData.experiences.every(
              (exp) => exp.company?.trim() && exp.title?.trim(),
            )
          : true; // allow empty for now

      case 4: // Education
        // At least one education with school & degree is recommended
        return formData.education?.length > 0
          ? formData.education.every(
              (edu) => edu.school?.trim() && edu.degree?.trim(),
            )
          : true;

      case 5: // Skills
        // At least 3 technical skills recommended
        return formData.technicalSkills?.length >= 3;

      case 6: // Summary & Preferences
        return (
          formData.summary?.trim()?.length >= 20 && // min length
          formData.yearsOfExperience?.trim() &&
          formData.noticePeriod?.trim() &&
          formData.workType?.length > 0 // at least one preferred mode
        );

      case 7: // Review
        // Always allow "Create Profile" — real validation happens on submit
        return true;

      default:
        return true;
    }
  };
  const isFormValid = () => {
    const required = [
      formData.firstName?.trim(),
      formData.lastName?.trim(),
      formData.headline?.trim(),
      formData.email?.trim(),
      formData.phone?.trim(),
      formData.location?.trim(),
      formData.summary?.trim(),
      formData.yearsOfExperience?.trim(),
    ];

    const basicsFilled = required.every(Boolean);
    const hasContent =
      formData.experiences?.length > 0 ||
      formData.education?.length > 0 ||
      formData.technicalSkills?.length >= 3;

    return basicsFilled && hasContent;
  };

  // State for all form data
  const [formData, setFormData] = useState({
    // Basics
    firstName: "John",
    lastName: "Doe",
    headline: "",
    email: "john.doe@example.com",
    phone: "555-0123",
    location: "San Francisco, CA, USA",
    profilePhoto: null,

    // Online Presence
    linkedin: "https://linkedin.com/in/johndoe",
    github: "https://github.com/johndoe",
    portfolio: "https://johndoe.com",
    twitter: "https://twitter.com/johndoe",

    // Experience
    experiences: [],

    // Education
    education: [],

    // Skills
    technicalSkills: [],
    softSkills: [],

    // Summary & Preferences
    summary: "",
    yearsOfExperience: "",
    noticePeriod: "",
    salaryCurrency: "USD",
    salaryMin: "",
    salaryMax: "",
    workType: [],
    languages: [],
  });

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const goNext = () => {
    const isValid = validateStep(currentStep);

    if (!isValid) {
      toast.error(
        `Please complete all required fields in the "${steps[currentStep - 1]}" step`,
        {
          duration: 5000,
          style: {
            border: "1px solid #ef4444",
            padding: "16px",
            color: "#fff",
            background: "#991b1b",
          },
          iconTheme: {
            primary: "#fff",
            secondary: "#991b1b",
          },
        },
      );
      return;
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderCurrentStep = () => {
    const commonProps = { goNext, goBack, formData, updateFormData };

    switch (currentStep) {
      case 1:
        return <Step1Basics {...commonProps} />;
      case 2:
        return <Step2OnlinePresence {...commonProps} />;
      case 3:
        return <Step3Experience {...commonProps} />;
      case 4:
        return <Step4Education {...commonProps} />;
      case 5:
        return <Step5Skills {...commonProps} />;
      case 6:
        return <Step6SummaryPreferences {...commonProps} />;
      case 7:
        return <Step7Review {...commonProps} />;
      default:
        return null;
    }
  };
  const handleCreateProfile = async () => {
    if (!isAuthenticated) {
      alert("Please login first");
      navigate("/recruiter-signin"); // or your recruiter login path
      return;
    }

    setLoading(true);
    setError(null);

    // Prepare education array
    const educationRecords = formData.education.map((edu) => ({
      institution_name: edu.school?.trim() || "",
      degree: edu.degree || "",
      field_of_study: edu.field?.trim() || "",
      start_year: edu.startYear ? Number(edu.startYear) : null,
      end_year: edu.endYear ? Number(edu.endYear) : null,
    }));

    // Prepare work experiences array
    const workExperiences = formData.experiences.map((exp) => ({
      company_name: exp.company?.trim() || "",
      job_title: exp.title?.trim() || "",
      location: exp.location?.trim() || "",
      description: exp.description?.trim() || "",
      // You can add start_date, end_date, is_current if backend supports
    }));

    const payload = {
      email: formData.email?.trim() || "",
      first_name: formData.firstName?.trim() || "",
      last_name: formData.lastName?.trim() || "",
      title: formData.headline?.trim() || "",
      image_url: "www.google.com", // ← for now empty; photo upload can be separate endpoint later
      phone: formData.phone?.trim()
        ? `${formData.phoneCountryCode || "+31"}${formData.phone}`
        : "",
      location: formData.location?.trim() || "",
      skills: formData.technicalSkills?.join(", ") || "",
      profile_summary: formData.summary?.trim() || "",
      total_years_experience: formData.yearsOfExperience || "",
      notice_period: formData.noticePeriod || "",
      expected_salary:
        formData.salaryMin && formData.salaryMax
          ? `${formData.salaryCurrency || "USD"} ${formData.salaryMin} - ${formData.salaryMax}`
          : "",
      preferred_mode: formData.workType?.join(", ") || "",
      languages: formData.languages?.reduce((acc, lang) => {
        if (lang.language && lang.proficiency) {
          acc[lang.language] = { proficiency: lang.proficiency };
        }
        return acc;
      }, {}),
      profiles: {
        linkedin: formData.linkedin || "",
        github: formData.github || "",
        portfolio: formData.portfolio || "",
        twitter: formData.twitter || "",
      },
      education: educationRecords,
      work_experiences: workExperiences,
    };

    try {
      const response = await createCandidateProfile(payload);
      console.log("Profile created successfully:", response);

      toast.success("Profile created successfully!", {
        duration: 5000,
        icon: "🎉",
      });

      navigate("/recruiter"); // or dashboard, etc.
    } catch (err) {
      console.error("Profile creation error:", err);

      let errorMessage = "Failed to create profile. Please try again.";

      if (err.detail && Array.isArray(err.detail)) {
        // Show first validation error from backend
        errorMessage = err.detail[0]?.msg || errorMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage, {
        duration: 6000,
        style: {
          border: "1px solid #ef4444",
          padding: "16px",
          color: "#fff",
          background: "#991b1b",
        },
      });

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 font-sans antialiased pb-2">
      {/* Progress */}
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
              <span className="text-gray-600">
                Step {currentStep} of {totalSteps}
              </span>
              <span className="font-semibold text-emerald-700">
                {progress}% Complete
              </span>
            </div>
          </div>

          {/* Step circles */}
          <div className="flex items-center justify-between gap-1.5 md:gap-2">
            {steps.map((label, i) => {
              const stepNum = i + 1;
              const isActive = stepNum === currentStep;
              const isDone = stepNum < currentStep;

              return (
                <React.Fragment key={label}>
                  <div className="flex flex-col items-center flex-1 min-w-[60px]">
                    <div
                      className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all ${
                        isDone
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : isActive
                            ? "bg-white border-emerald-600 text-emerald-600 ring-4 ring-emerald-100/70"
                            : "bg-gray-100 border-gray-300 text-gray-500"
                      }`}
                    >
                      {isDone ? <Check className="w-5 h-5" /> : stepNum}
                    </div>
                    <span
                      className={`text-xs mt-1.5 hidden md:block font-medium ${
                        isActive ? "text-emerald-700" : "text-gray-500"
                      }`}
                    >
                      {label}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-0.5 flex-1 ${isDone ? "bg-emerald-600" : "bg-gray-200"}`}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="pt-10 pb-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto">{renderCurrentStep()}</div>
      </main>

      {/* Navigation buttons */}
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
            disabled={loading || !validateStep(7) || !isFormValid()}
            className={`flex items-center gap-2 px-8 py-3.5 text-white font-bold rounded-xl shadow-lg transition-all ${
              loading || !validateStep(7) || !isFormValid()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create Profile <Sparkles size={18} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

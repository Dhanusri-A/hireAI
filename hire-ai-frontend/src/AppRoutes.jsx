import { Routes, Route } from "react-router-dom";

// Candidate Main screens
import RootLayout from "./screens/Candidate/app/CandidateRootLayout";
import Jobs from "./screens/Candidate/app/Jobs";
import CandidateSavedJobs from "./screens/Candidate/components/CandidateSavedJobs";
import CandidateAppliedJobs from "./screens/Candidate/components/CandidateAppliedJobs";
import CandidateProfile from "./screens/Candidate/components/CandidateProfile";
import CandidateMatchedJobs from "./screens/Candidate/components/CandidateMatchedJobs";
import Notifications from "./screens/Candidate/components/CandidateNotifications";
import CandidateJobDetails from "./screens/Candidate/components/CandidateJobDetails";
import CandidateProfileEdit from "./screens/Candidate/components/CandidateProfileEdit";
import GoogleCallback from "./screens/Login/GoogleCallback";

// Candidate Auth
import CandidateSignIn from "./screens/Login/CandidateSignin";
import CandidateSignUp from "./screens/Signup/CandidateSignup";

// Recruiter Auth
import RecruiterSignIn from "./screens/Login/RecruiterSignin";
import RecruiterSignUp from "./screens/Signup/RecruiterSignup";

// Recruiter Main screens
import RecruiterRootLayout from "./screens/Recruiter/app/RecruiterRootLayout";
import Candidates from "./screens/Recruiter/app/Candidates";
import RecruiterProfile from "./screens/Recruiter/pages/RecruiterProfile";
import PostJob from "./screens/Recruiter/pages/RecruiterPostJob";
import Shortlisted from "./screens/Recruiter/pages/RecruiterShortlisted";
import Applications from "./screens/Recruiter/pages/RecruiterApplications";
import RecruiterMyJobs from "./screens/Recruiter/pages/RecruiterMyJobs";
import RecruiterViewCandidate from "./screens/Recruiter/pages/RecruiterViewCandidate";
// Legal / Info pages
import Contact from "./screens/Informations/Contact";
import PrivacyPolicy from "./screens/Informations/PrivacyPolicy";
import RefundPolicy from "./screens/Informations/RefundPolicy";
import TermsAndConditions from "./screens/Informations/TermsAndConditions";
import RecruiterLandingPage from "./screens/Recruiter/app/RecruiterLandingPage";
import RecruiterCreateProfile from "./screens/Recruiter/pages/RecruiterCandidateProfileCreation";
import RecruiterCandidateProfileCreation from "./screens/Recruiter/pages/RecruiterCandidateProfileCreation";
import RecruiterGenerateJD from "./screens/Recruiter/pages/RecruiterGenerateJD";
import RecruiterShowJd from "./screens/Recruiter/pages/RecruiterShowJD";
import { CandidateOnly, RecruiterOnly } from "./RoleGaurds";
import RecruiterJobDetails from "./screens/Recruiter/pages/RecruiterJobDetails";
import RecruiterEditJob from "./screens/Recruiter/pages/RecruiterEditJob";
import { RecruiterResumeMatcher } from "./screens/Recruiter/pages/RecruiterResumeMatcher";
function AppRoutes() {
  return (
    <Routes>
      {/* ==================== PUBLIC ROUTES ==================== */}

      {/* Candidate Auth */}
      <Route path="/candidate-signin" element={<CandidateSignIn />} />
      <Route path="/candidate-signup" element={<CandidateSignUp />} />

      {/* Recruiter Auth */}
      <Route path="/recruiter-signin" element={<RecruiterSignIn />} />
      <Route path="/recruiter-signup" element={<RecruiterSignUp />} />
      <Route path="/auth/google/success" element={<GoogleCallback />} />
      <Route path="/auth/google/error" element={<GoogleCallback />} />

      {/* ==================== CANDIDATE ROUTES ==================== */}

      <Route element={<CandidateOnly />}>
        <Route path="/candidate" element={<RootLayout />}>
          <Route index element={<Jobs />} />
          <Route path="job-details/:jobId" element={<CandidateJobDetails />} />
          <Route path="saved-jobs" element={<CandidateSavedJobs />} />
          <Route path="applied-jobs" element={<CandidateAppliedJobs />} />
          <Route path="matched-jobs" element={<CandidateMatchedJobs />} />
          <Route path="notifications" element={<Notifications />} />

          <Route path="profile">
            <Route index element={<CandidateProfile />} />
            <Route
              path="edit"
              element={<CandidateProfileEdit fromSignup={false} />}
            />
          </Route>

          <Route path="contact" element={<Contact />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="refund-policy" element={<RefundPolicy />} />
          <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        </Route>
      </Route>

      {/* ==================== RECRUITER ROUTES ==================== */}

      <Route element={<RecruiterOnly />}>
        <Route path="/recruiter" element={<RecruiterRootLayout />}>
          <Route index element={<RecruiterLandingPage />} />
          <Route
            path="candidate/:candidateId"
            element={<RecruiterViewCandidate />}
          />
          <Route path="post-job" element={<PostJob />} />
          <Route path="my-jobs" element={<RecruiterMyJobs/>} />
          <Route path="my-jobs/:id" element={<RecruiterJobDetails/>} />
          <Route path="my-jobs/edit/:id" element={<RecruiterEditJob/>} />
          <Route path="resume-match" element={<RecruiterResumeMatcher />} />
          <Route path="shortlisted" element={<Shortlisted />} />
          <Route path="applications" element={<Applications />} />
          <Route path="profile" element={<RecruiterProfile />} />
          <Route path="notifications" element={<Notifications />} />
          <Route
            path="create-profile"
            element={<RecruiterCandidateProfileCreation />}
          />
          <Route path="generate-jd" element={<RecruiterGenerateJD />} />
          <Route path="show-jd" element={<RecruiterShowJd />} />

          <Route path="contact" element={<Contact />} />
          <Route path="privacy-policy" element={<PrivacyPolicy />} />
          <Route path="terms-and-conditions" element={<TermsAndConditions />} />
        </Route>
      </Route>

      {/* ==================== DEFAULT / REDIRECT ==================== */}

      {/* Default route - redirect to candidate signin */}
      <Route path="/" element={<CandidateSignIn />} />

      {/* 404 - Not Found */}
      <Route
        path="*"
        element={
          <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
              <p className="text-slate-500 mb-6">Page not found</p>
              <a
                href="/"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Go Back
              </a>
            </div>
          </div>
        }
      />
    </Routes>
  );
}

export default AppRoutes;

// src/api.js
import axios from "axios";
import toast from "react-hot-toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

// Helper — fires toast with the FastAPI `detail` field, then re-throws
// so individual callers can still catch if needed.
function handleError(error, fallbackMessage) {
  const errData = error.response?.data || { message: fallbackMessage };
  const msg = errData?.detail || errData?.message || fallbackMessage;
  toast.error(msg);
  throw errData;
}

// ────────────────────────────────────────────────
// Auth  (NO toast — callers show their own errors)
// ────────────────────────────────────────────────
export const loginUser = async (payload) => {
  try {
    // Check if this is an MFA login (has mfa_code)
    if (payload.mfa_code) {
      const response = await api.post("/auth/login/mfa", payload);
      return response.data;
    }
    // Regular login
    const response = await api.post("/auth/login", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Login failed. Please try again." };
  }
};

export const signup = async (payload) => {
  try {
    const response = await api.post("/auth/signup", payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Something went wrong." };
  }
};

// ────────────────────────────────────────────────
// OTP & Password Reset
// ────────────────────────────────────────────────
export const sendOTP = async (email, purpose) => {
  try {
    const response = await api.post("/auth/send-otp", { email, purpose });
    return response.data;
  } catch (error) {
    const errData = error.response?.data || { message: "Failed to send OTP" };
    errData.status = error.response?.status;
    throw errData;
  }
};

export const verifyOTP = async (email, otp, purpose) => {
  try {
    const response = await api.post("/auth/verify-otp", { email, otp, purpose });
    return response.data;
  } catch (error) {
    const errData = error.response?.data || { message: "Invalid or expired OTP" };
    errData.status = error.response?.status;
    throw errData;
  }
};

export const resetPassword = async (email, otp, new_password) => {
  try {
    const response = await api.post("/auth/reset-password", { email, otp, new_password });
    return response.data;
  } catch (error) {
    const errData = error.response?.data || { message: "Failed to reset password" };
    errData.status = error.response?.status;
    throw errData;
  }
};

// ────────────────────────────────────────────────
// Candidates
// ────────────────────────────────────────────────
export const createCandidateProfile = async (candidateData) => {
  try {
    const response = await api.post("/candidates", candidateData);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to create profile");
  }
};

export const createCandidateProfilesBatch = async (candidatePayloads = []) => {
  const results = {
    success: [],
    failed: [],
  };

  for (const item of candidatePayloads) {
    const { candidateId, payload } = item || {};

    try {
      const response = await api.post("/candidates", payload);
      results.success.push({
        candidateId,
        payload,
        data: response.data,
      });
    } catch (error) {
      const errData = error.response?.data || {};
      const message =
        errData?.detail ||
        errData?.message ||
        "Failed to save candidate to talent pool";

      results.failed.push({
        candidateId,
        payload,
        message,
      });
    }
  }

  return results;
};

export const getRecruiterCandidates = async (recruiterId, { skip = 0, limit = 100 } = {}) => {
  if (!recruiterId) throw new Error("Recruiter ID is required to fetch candidates");
  try {
    const response = await api.get(`/candidates/recruiter/${recruiterId}`, {
      params: { skip, limit },
    });
    console.log("Fetched candidates:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch candidates");
  }
};

export const updateCandidate = async (candidateId, payload) => {
  try {
    const response = await api.put(`/candidates/${candidateId}`, payload);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to update candidate");
  }
};

export const deleteCandidate = async (candidateId) => {
  try {
    await api.delete(`/candidates/${candidateId}`);
    return true;
  } catch (error) {
    handleError(error, "Failed to delete candidate");
  }
};

// Source candidates by job ID (uses full JD context)
// POST /candidates/search/job/{job_id}
export const searchCandidatesByJob = async (jobId) => {
  try {
    const response = await api.post(`/candidates/search/job/${jobId}`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to source candidates by JD");
  }
};

// Source candidates by manual input
// POST /candidates/search  { job_title: required, location?: optional, years_of_exp?: optional }
export const searchCandidatesByInput = async ({ job_title, location, years_of_exp }) => {
  try {
    const payload = { job_title };
    if (location)     payload.location     = location;
    if (years_of_exp) payload.years_of_exp = years_of_exp;
    const response = await api.post("/candidates/search", payload);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to source candidates");
  }
};

export const getRecruiterCount = async (recruiterId) => {
  if (!recruiterId) throw new Error("Recruiter ID is required");
  try {
    const response = await api.get(`/candidates/recruiter/${recruiterId}/count`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch recruiter stats");
  }
};

// ────────────────────────────────────────────────
// Jobs
// ────────────────────────────────────────────────
export const createJobDescription = async (jobData) => {
  try {
    const response = await api.post("/jobs", jobData);
    console.log("Created job:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    handleError(error, "Failed to generate job description");
  }
};

export const getRecruiterJobs = async (userId, { skip = 0, limit = 10 } = {}) => {
  try {
    const response = await api.get(`/jobs/users/${userId}`, { params: { skip, limit } });
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch jobs");
  }
};

export const getJobById = async (jobId) => {
  try {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch job details");
  }
};

export const updateJobDescription = async (jobId, payload) => {
  try {
    const response = await api.put(`/jobs/${jobId}`, payload);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to update job");
  }
};

export const deleteJobDescription = async (jobId) => {
  try {
    await api.delete(`/jobs/${jobId}`);
    return true;
  } catch (error) {
    handleError(error, "Failed to delete job");
  }
};

// ────────────────────────────────────────────────
// Resume
// ────────────────────────────────────────────────
export const parseResume = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/resume/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    handleError(error, "Failed to parse resume");
  }
};

export const reformatResume = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/resume/reformat/parse", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    console.log("Reformat response data:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    handleError(error, "Failed to reformat resume");
  }
};

export const exportResume = async ({ format, resumeData }) => {
  try {
    const response = await api.post(
      "/resume/reformat/export",
      { format, resumeData },
      { responseType: "blob" },
    );
    return response.data;
  } catch (error) {
    handleError(error, `Failed to export resume as ${format}`);
  }
};

export const matchResumesToJob = async (jobId, resumeFiles) => {
  try {
    const formData = new FormData();
    resumeFiles.forEach((file) => formData.append("resumes", file));
    const response = await api.post(`/resume/match/${jobId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  } catch (error) {
    handleError(error, "Failed to match resumes");
  }
};

export default api;

// ────────────────────────────────────────────────
// Interviews — Core
// ────────────────────────────────────────────────

// POST /interviews
// Creates a new interview with sections config.
// Payload: { candidate_name, candidate_email, job_title, interview_type,
//            date, time, duration, meeting_location?, notes?,
//            sections: [{ type, no_of_questions, custom_questions?, is_follow_up, seconds_per_question? }] }
export const createInterview = async (payload) => {
  try {
    const response = await api.post("/interviews", payload);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to create interview");
  }
};

// GET /interviews/candidate/{candidate_id}
// Returns all interviews for the logged-in candidate (includes sections[]).
export const getCandidateInterviews = async (candidateId) => {
  try {
    const response = await api.get(`/interviews/candidate/${candidateId}`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch interviews");
  }
};

// GET /interviews/recruiter/{recruiter_id}
// Returns all interviews created by the recruiter (includes sections[]).
export const getRecruiterInterviews = async (recruiterId) => {
  if (!recruiterId) throw new Error("Recruiter ID is required");
  try {
    const response = await api.get(`/interviews/recruiter/${recruiterId}`);
    console.log("Fetched recruiter interviews:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch recruiter interviews");
  }
};

// GET /interviews/{interview_id}
// Returns a single interview by ID.
export const getInterviewById = async (interviewId) => {
  try {
    const response = await api.get(`/interviews/${interviewId}`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch interview");
  }
};

// ────────────────────────────────────────────────
// Interview Sections — AI flow
// ────────────────────────────────────────────────

// GET /interviews/{interview_id}/sections/{section_id}/questions
// Generates (or returns cached) questions for a section.
// Response: { type: string, questions: string[] }
export const getSectionQuestions = async (interviewId, sectionId) => {
  try {
    const response = await api.get(
      `/interviews/${interviewId}/sections/${sectionId}/questions`
    );
    return response.data; // { type, questions }
  } catch (error) {
    handleError(error, "Failed to fetch section questions");
  }
};

// POST /interviews/{interview_id}/sections/{section_id}/evaluate
// Evaluates a completed section. Call once per section after all answers are collected.
// Payload: { qa: [{ question: string, answer: string }] }
// Response: { score, summary, details: [{ question, score, dimension_scores, summary }] }
export const evaluateSectionAnswers = async (interviewId, sectionId, qa) => {
  try {
    const response = await api.post(
      `/interviews/${interviewId}/sections/${sectionId}/evaluate`,
      { qa }
    );
    return response.data;
  } catch (error) {
    handleError(error, "Failed to evaluate section");
  }
};

// Remove or comment out the old generateFollowUp
// export const generateFollowUp = async (question, answer) => { ... }

// Add the new function
export const generateFollowUpQuestion = async (interviewId, sectionId, question, answer) => {
  try {
    const response = await api.post(
      `/interviews/${interviewId}/sections/${sectionId}/follow-up`,
      { question, answer }
    );
    return response.data;
  } catch (error) {
    handleError(error, "Failed to generate follow-up question");
  }
};

// ────────────────────────────────────────────────
// Deprecated — kept for any legacy references
// ────────────────────────────────────────────────

/** @deprecated Use getSectionQuestions instead */
export const getInterviewQuestions = async (interviewId) => {
  try {
    const response = await api.get(`/interviews/${interviewId}/questions`);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch interview questions");
  }
};

/** @deprecated Use evaluateSectionAnswers instead */
export const evaluateInterview = async (interviewId, qaData) => {
  try {
    const response = await api.post(`/interviews/${interviewId}/evaluate`, qaData);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to evaluate interview");
  }
};
// ────────────────────────────────────────────────
// Interview Recordings (section-scoped)
// ────────────────────────────────────────────────

// POST /interviews/{interviewId}/sections/{sectionId}/questions/{questionIndex}/recordings/presigned-url
export const getRecordingPresignedUrl = async (interviewId, sectionId, questionIndex) => {
  try {
    const response = await api.post(
      `/interviews/${interviewId}/sections/${sectionId}/questions/${questionIndex}/recordings/presigned-url`
    );
    return response.data;
  } catch (error) {
    handleError(error, "Failed to get recording upload URL");
  }
};

// POST /interviews/{interviewId}/sections/{sectionId}/questions/{questionIndex}/recordings
export const markRecordingComplete = async (interviewId, sectionId, questionIndex, objectKey) => {
  try {
    const response = await api.post(
      `/interviews/${interviewId}/sections/${sectionId}/questions/${questionIndex}/recordings`,
      { object_key: objectKey }
    );
    return response.data;
  } catch (error) {
    handleError(error, "Failed to mark recording as complete");
  }
};

// GET /interviews/{interviewId}/sections/{sectionId}/recordings
export const getSectionRecordings = async (interviewId, sectionId) => {
  try {
    const response = await api.get(
      `/interviews/${interviewId}/sections/${sectionId}/recordings`
    );
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch section recordings");
  }
};

// GET /interviews/{interviewId}/sections/{sectionId}/questions/{questionIndex}/recordings/video
export const getQuestionVideoUrl = async (interviewId, sectionId, questionIndex) => {
  try {
    const response = await api.get(
      `/interviews/${interviewId}/sections/${sectionId}/questions/${questionIndex}/recordings/video`
    );
    return response.data;
  } catch (error) {
    handleError(error, "Failed to fetch video URL");
  }
};

// ────────────────────────────────────────────────
// Profile Image Upload
// ────────────────────────────────────────────────
export const getProfileUploadUrl = async (userId, fileType) => {
  try {
    const response = await api.post("/candidates/profile/upload-url", {
      user_id: userId,
      file_type: fileType,
    });
    return response.data; // { uploadUrl, imageUrl }
  } catch (error) {
    handleError(error, "Failed to get profile image upload URL");
  }
};

// ────────────────────────────────────────────────
// Recruiter Company Profile
// ────────────────────────────────────────────────
export const createRecruiterProfile = async (payload) => {
  try {
    const response = await api.post("/recruiters/profile", payload);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to save company profile");
  }
};

export const getRecruiterProfile = async () => {
  try {
    const response = await api.get("/recruiters/profile/me");
    return response.data;
  } catch (error) {
    if (error.response?.status === 404) return null;
    handleError(error, "Failed to fetch company profile");
  }
};

export const updateRecruiterProfile = async (payload) => {
  try {
    const response = await api.put("/recruiters/profile/me", payload);
    return response.data;
  } catch (error) {
    handleError(error, "Failed to update company profile");
  }
};
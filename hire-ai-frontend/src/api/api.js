// src/api.js
import axios from "axios";
// import { useAuth } from "../context/AuthContext";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
// console.log(token_,"token from api.js");
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to attach token automatically
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ────────────────────────────────────────────────
// Existing auth functions
// ────────────────────────────────────────────────

export const loginUser = async (payload) => {
  try {
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
// NEW: Create Candidate Profile
// ────────────────────────────────────────────────
export const createCandidateProfile = async (candidateData) => {
  try {
    const response = await api.post("/candidates", candidateData);
    return response.data;
  } catch (error) {
    console.error("Create candidate error:", error);
    throw error.response?.data || { message: "Failed to create profile" };
  }
};

export const createJobDescription = async (jobData) => {
  try {
    const response = await api.post("/jobs", jobData);
    console.log("Job description created successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Create job error:", error);
    throw error.response?.data || { message: "Failed to generate job description" };
  }
};

export const getAllJobs = async ({ skip = 0, limit = 10 } = {}) => {
  try {
    const response = await api.get("/jobs", {
      params: { skip, limit },
    });
    return response.data;
  } catch (error) {
    console.error("Get jobs error:", error);
    throw error.response?.data || { message: "Failed to fetch jobs" };
  }
};

export const getJobById = async (jobId) => {
  try {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to fetch job details" };
  }
};


export const updateJobDescription = async (jobId, payload) => {
  try {
    const response = await api.put(`/jobs/${jobId}`, payload);
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to update job" };
  }
};


export const deleteJobDescription = async (jobId) => {
  try {
    await api.delete(`/jobs/${jobId}`);
    return true;
  } catch (error) {
    throw error.response?.data || { message: "Failed to delete job" };
  }
};


export default api;

export const sendOTP = async (email, purpose) => {
  try {
    const response = await api.post("/auth/send-otp", { email, purpose });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to send OTP" };
  }
};

export const verifyOTP = async (email, otp, purpose) => {
  try {
    const response = await api.post("/auth/verify-otp", { email, otp, purpose });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Invalid or expired OTP" };
  }
};

export const resetPassword = async (email, otp, new_password) => {
  try {
    const response = await api.post("/auth/reset-password", { email, otp, new_password });
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: "Failed to reset password" };
  }
};

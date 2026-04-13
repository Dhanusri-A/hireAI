export const INDUSTRIES = [
  "Technology", "Finance & Banking", "Healthcare", "Education",
  "Retail & E-commerce", "Manufacturing", "Media & Entertainment",
  "Consulting", "Real Estate", "Logistics & Supply Chain", "Other",
];

export const COMPANY_SIZES = [
  "1–10", "11–50", "51–200", "201–500", "501–1000", "1000+",
];

export const COMPANY_TYPES = [
  "Private", "Public", "Startup", "MNC",
];

export const DEPARTMENTS = [
  "Human Resources", "Talent Acquisition", "Engineering", "Product",
  "Sales", "Marketing", "Operations", "Finance", "Legal", "Other",
];

export const EXPERIENCE_LEVELS = [
  "Fresher", "1–3 yrs", "3–5 yrs", "5–8 yrs", "8+ yrs",
];

export const EMPLOYMENT_TYPES = [
  "Full-time", "Part-time", "Internship", "Contract",
];

export const WORK_MODES = [
  "Remote", "Hybrid", "Onsite",
];

export const COMPANY_FORM_INITIAL = {
  // Step 1
  company_name: "",
  industry: "",
  company_size: "",
  company_type: "",
  founded_year: "",
  description: "",
  specializations: [],
  // Step 2
  country: "",
  city: "",
  headquarters: "",
  website: "",
  linkedin_url: "",
  twitter_url: "",
  glassdoor_url: "",
  video_url: "",
  // Step 3
  job_title: "",
  department: "",
  phone: "",
  recruiter_linkedin: "",
  profile_photo_url: "",
  // Step 4
  hiring_roles: [],
  experience_levels: [],
  employment_types: [],
  work_modes: [],
  salary_range_min: "",
  salary_range_max: "",
};

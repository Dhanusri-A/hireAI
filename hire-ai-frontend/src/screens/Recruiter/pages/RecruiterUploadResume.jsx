// src/pages/recruiter/RecruiterResumeUpload.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { parseResume } from '../../../api/api';
import toast from 'react-hot-toast';

export default function RecruiterUploadResume() {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const validateFile = (fileToCheck) => {
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!validTypes.includes(fileToCheck.type)) {
      setError('Please upload a PDF, DOC, or DOCX file');
      return false;
    }
    if (fileToCheck.size > maxSize) {
      setError('File size must be less than 10MB');
      return false;
    }
    setError('');
    return true;
  };

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true);  };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) setFile(droppedFile);
  };
  const handleFileInput = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) setFile(selectedFile);
    e.target.value = '';
  };

  const handleParse = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setParseResult(null);
    try {
      const response = await parseResume(file);
      const data = response.data || response;
      console.log('📄 Raw API response from parseResume:', data);
      setParseResult(data);
      toast.success('Resume parsed successfully!');
    } catch (err) {
      console.error('Resume parse error:', err);
      const message =
        err?.detail?.[0]?.msg || err?.message || 'Failed to parse resume. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  // ── Normalise month value from API ─────────────────────────────────────────
  // API can send: "January" | "january" | "1" | "01" | "" | null
  const normaliseMonth = (val) => {
    if (!val) return '';
    const MONTHS = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December',
    ];
    const trimmed = String(val).trim();
    // Full / partial name match (case-insensitive)
    const byName = MONTHS.find((m) => m.toLowerCase() === trimmed.toLowerCase());
    if (byName) return byName;
    // Numeric index 1-12
    const num = parseInt(trimmed, 10);
    if (!isNaN(num) && num >= 1 && num <= 12) return MONTHS[num - 1];
    return '';
  };

  const handleProceed = () => {
    if (!parseResult) return;
    console.log('🔍 Processing parseResult:', parseResult);

    // ── Phone ────────────────────────────────────────────────────────────────
    let phoneNumber = '';
    let phoneCountryCode = '+91';
    if (parseResult.phone) {
      const m = parseResult.phone.match(/^(\+\d+)\s*(.+)$/);
      if (m) { phoneCountryCode = m[1]; phoneNumber = m[2].trim(); }
      else   { phoneNumber = parseResult.phone.replace(/^\+\d+\s*/, ''); }
    }

    // ── Education ────────────────────────────────────────────────────────────
    const educationArray = (parseResult.education || [])
      .filter((edu) => edu.institution_name?.trim() || edu.degree?.trim())
      .map((edu, i) => ({
        id:        Date.now() + i + 1000,
        school:    edu.institution_name || '',
        degree:    edu.degree           || '',
        field:     edu.field_of_study   || '',
        startYear: edu.start_year       || '',
        endYear:   edu.end_year         || '',
        gpa:       edu.gpa              || '',
        honors:    edu.honors           || '',
      }));
    console.log('✅ Mapped education array:', educationArray);

    // ── Work Experience ───────────────────────────────────────────────────────
    // API shape:  { company_name, job_title, start_month, start_year,
    //               end_month, end_year, start_date, end_date, location, description }
    // start_date / end_date are combined ISO-like strings ("2017-01") used as fallback.
    const experiencesArray = (parseResult.work_experience || [])
      .filter((exp) => exp.company_name?.trim() || exp.job_title?.trim())
      .map((exp, i) => {
        // Priority: dedicated month field → parse from combined date string
        const startMonth =
          normaliseMonth(exp.start_month) ||
          normaliseMonth((exp.start_date || '').split(/[-/]/)[1]);
        const startYear =
          (exp.start_year ? String(exp.start_year) : '') ||
          (exp.start_date || '').split(/[-/]/)[0] ||
          '';

        const endMonth =
          normaliseMonth(exp.end_month) ||
          normaliseMonth((exp.end_date || '').split(/[-/]/)[1]);
        const endYear =
          (exp.end_year ? String(exp.end_year) : '') ||
          (exp.end_date || '').split(/[-/]/)[0] ||
          '';

        // Mark as "current" only when there is genuinely no end date at all
        const isCurrent = !endYear && !exp.end_date && !exp.end_month;

        return {
          id:          Date.now() + i,
          company:     exp.company_name || '',
          title:       exp.job_title    || '',
          startMonth,
          startYear,
          endMonth,
          endYear,
          current:     isCurrent,
          location:    exp.location    || '',
          description: exp.description || '',
        };
      });
    console.log('✅ Mapped experiences array:', experiencesArray);

    // ── Certifications ────────────────────────────────────────────────────────
    const certificationsArray = (parseResult.certifications || [])
      .filter((c) => c.certification_name?.trim())
      .map((c, i) => ({
        id:                   Date.now() + i + 2000,
        name:                 c.certification_name  || '',
        issuingOrganization:  c.issuing_body        || '',
        issueDate:   c.issue_date  ? c.issue_date.slice(0, 7)  : '',
        expiryDate:  c.expiry_date ? c.expiry_date.slice(0, 7) : '',
        credentialId:         c.credential_id       || '',
        description:          c.certification_description || 'No description provided',
      }));
    console.log('✅ Mapped certifications array:', certificationsArray);

    // ── Skills ────────────────────────────────────────────────────────────────
    const technicalSkillsArray = parseResult.skills
      ? parseResult.skills.split(/[,•\n]/).map((s) => s.trim()).filter(Boolean)
      : [];
    console.log('✅ Mapped technical skills:', technicalSkillsArray);

    // ── Languages ─────────────────────────────────────────────────────────────
    const languagesArray = Object.keys(parseResult.languages || {})
      .filter((l) => l?.trim())
      .map((l) => ({
        id:          Date.now() + Math.random(),
        language:    l.charAt(0).toUpperCase() + l.slice(1),
        proficiency: parseResult.languages[l] || 'Intermediate',
      }))
      .filter((l) => l.language);
    console.log('✅ Mapped languages:', languagesArray);

    // ── Final payload ─────────────────────────────────────────────────────────
    const initialFormData = {
      firstName:          parseResult.first_name         || '',
      lastName:           parseResult.last_name          || '',
      headline:           parseResult.title              || '',
      email:              parseResult.email              || '',
      phone:              phoneNumber,
      phoneCountryCode,
      location:           parseResult.location           || '',
      summary:            parseResult.profile_summary    || '',
      yearsOfExperience:  parseResult.total_years_experience || '',
      noticePeriod:       parseResult.notice_period      || '',
      technicalSkills:    technicalSkillsArray,
      linkedin:           parseResult.profiles?.linkedin || '',
      github:             parseResult.profiles?.github   || '',
      portfolio:          parseResult.profiles?.portfolio|| '',
      twitter:            parseResult.profiles?.twitter  || '',
      education:          educationArray,
      experiences:        experiencesArray,
      certifications:     certificationsArray,
      languages:          languagesArray,
      // defaults
      profilePhoto:    null,
      softSkills:      [],
      workType:        parseResult.preferred_mode
                         ? parseResult.preferred_mode.split(',').map((m) => m.trim()).filter(Boolean)
                         : [],
      salaryCurrency:  'USD',
      salaryMin:       '',
      salaryMax:       '',
    };

    console.log('🎯 Final initialFormData:', initialFormData);
    navigate('/recruiter/create-profile', {
      state: { parsedResumeData: initialFormData },
    });
  };

  return (
    <div className="max-w-3xl mx-auto py-0 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-100 rounded-full mb-5">
          <Upload className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Upload Resume</h2>
        <p className="text-lg text-gray-600">
          Let AI automatically extract candidate information from their resume
        </p>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 transition-all duration-200 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50 scale-[1.01]'
            : file
            ? 'border-emerald-400 bg-emerald-50/40'
            : 'border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileInput}
          className="hidden"
          disabled={uploading}
        />

        <div className="text-center gap-2 flex flex-col items-center">
          {uploading ? (
            <Loader2 className="w-16 h-16 text-emerald-600 animate-spin mx-auto mb-6" />
          ) : file ? (
            <FileText className="w-16 h-16 text-emerald-600 mx-auto mb-6" />
          ) : (
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-6" />
          )}

          <p className="text-xl font-semibold text-gray-900 mb-3">
            {file ? file.name : 'Drag & drop resume here'}
          </p>
          <p className="text-sm text-gray-500 mb-8">Supports PDF, DOC, DOCX (Max 10MB)</p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-8 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading ? 'Processing...' : 'Browse Files'}
          </button>

          {file && !parseResult && !uploading && (
            <button
              onClick={handleParse}
              className="mt-6 px-10 py-3 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition font-semibold shadow-md hover:shadow-lg"
            >
              Parse Resume
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mt-6 p-5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Success + Proceed */}
      {parseResult && (
        <div className="mt-8 p-8 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
          <CheckCircle className="w-16 h-16 text-emerald-600 mx-auto mb-5" />
          <h3 className="text-2xl font-bold text-emerald-800 mb-3">Resume Parsed Successfully!</h3>
          <p className="text-emerald-700 mb-6">
            {parseResult.first_name} {parseResult.last_name}
            {parseResult.title && <> &bull; {parseResult.title}</>}
          </p>
          <button
            onClick={handleProceed}
            className="px-10 py-4 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition shadow-lg hover:shadow-xl text-lg"
          >
            Continue to Create Profile →
          </button>
        </div>
      )}

      {/* Features */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'AI-Powered',       desc: 'Automatically extracts skills, experience, and education' },
          { title: 'Editable Results', desc: 'Review and edit parsed data before saving'               },
          { title: 'Fast & Accurate',  desc: 'Create complete profiles in seconds'                     },
        ].map((f) => (
          <div key={f.title} className="text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-100 rounded-xl mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2 text-lg">{f.title}</h3>
            <p className="text-gray-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
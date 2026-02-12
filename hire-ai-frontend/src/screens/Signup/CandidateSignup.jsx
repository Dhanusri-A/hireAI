import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  TextField,
  InputAdornment,
  Dialog,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  Typography,
  IconButton,
} from "@mui/material";
import { Mail, Lock, Key, User, ChevronRight, ArrowRight } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import { signup, sendOTP, verifyOTP } from "../../api/api";

const CandidateSignUp = () => {
  const navigate = useNavigate();

  const [showOtp, setShowOtp] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    otp: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) throw new Error("Full name is required");
    if (!formData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
      throw new Error("Invalid email address");
    if (formData.password.length < 6)
      throw new Error("Password must be at least 6 characters");
    if (formData.password !== formData.confirmPassword)
      throw new Error("Passwords do not match");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (!showOtp) {
        validateForm();
        setIsLoading(true);

        await sendOTP(formData.email, "signup");
        toast.success("OTP sent to your email");
        setShowOtp(true);
        setModalOpen(true);
        setIsLoading(false);
      } else {
        if (!hasAgreed) {
          setModalOpen(true);
          return;
        }

        if (formData.otp.length !== 6)
          throw new Error("Enter valid 6-digit OTP");

        setIsLoading(true);
        
        await verifyOTP(formData.email, formData.otp, "signup");
        
        const payload = {
          full_name: formData.fullName,
          username: formData.email.split("@")[0],
          email: formData.email,
          password: formData.password,
          role: "candidate",
        };

        await signup(payload);
        toast.success("Account created successfully!");
        navigate("/candidate-signin", { replace: true });
      }
    } catch (err) {
      const errorMsg = err.detail || err.message || "An error occurred";
      setError(errorMsg);
      toast.error(errorMsg);
      setIsLoading(false);
    }
  };

  const handleAcceptTerms = () => {
    if (isChecked) {
      setHasAgreed(true);
      setModalOpen(false);
    }
  };

  const inputStyles = {
    '& .MuiOutlinedInput-root': {
      color: 'white',
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      borderRadius: '12px',
      '& fieldset': {
        borderColor: 'rgba(71, 85, 105, 0.5)',
        borderWidth: '2px',
      },
      '&:hover fieldset': {
        borderColor: '#3B82F6',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#3B82F6',
        borderWidth: '2px',
      },
    },
    '& .MuiInputLabel-root': {
      color: '#94A3B8',
      fontWeight: 500,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#3B82F6',
    },
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <Toaster position="top-center" />

      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-md py-8 px-10 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative text-2xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl px-8 py-3 shadow-lg">
              <span className="text-white font-extrabold tracking-tight">Profile AI</span>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
          <User size={36} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white text-center mb-2">
          Candidate Sign Up
        </h1>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Create your profile and start applying
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <TextField
            id="fullName"
            label="Full Name"
            value={formData.fullName}
            onChange={handleChange}
            disabled={showOtp}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <User className="text-slate-400" size={20} />
                </InputAdornment>
              ),
            }}
            sx={inputStyles}
          />

          <TextField
            id="email"
            label="Email"
            value={formData.email}
            onChange={handleChange}
            disabled={showOtp}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail className="text-slate-400" size={20} />
                </InputAdornment>
              ),
            }}
            sx={inputStyles}
          />

          <TextField
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            disabled={showOtp}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock className="text-slate-400" size={20} />
                </InputAdornment>
              ),
              endAdornment: (
                <IconButton onClick={() => setShowPassword(!showPassword)} sx={{ color: '#94A3B8' }}>
                  {showPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
            sx={inputStyles}
          />

          <TextField
            id="confirmPassword"
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            disabled={showOtp}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock className="text-slate-400" size={20} />
                </InputAdornment>
              ),
              endAdornment: (
                <IconButton
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  sx={{ color: '#94A3B8' }}
                >
                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                </IconButton>
              ),
            }}
            sx={inputStyles}
          />

          {showOtp && (
            <TextField
              id="otp"
              label="Enter 6-digit OTP"
              value={formData.otp}
              onChange={handleChange}
              placeholder="000000"
              inputProps={{ maxLength: 6 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Key className="text-slate-400" size={20} />
                  </InputAdornment>
                ),
              }}
              sx={inputStyles}
            />
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm text-center font-medium">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            style={{
              background: showOtp 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: '12px',
              boxShadow: showOtp
                ? '0 10px 25px -5px rgba(16, 185, 129, 0.3)'
                : '0 10px 25px -5px rgba(59, 130, 246, 0.3)',
            }}
            disabled={isLoading || (showOtp && !hasAgreed)}
            endIcon={showOtp ? <ArrowRight size={20} /> : <ChevronRight size={20} />}
          >
            {isLoading ? "Processing..." : showOtp ? "Create Account" : "Send OTP"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Already have an account?</span>{' '}
          <Link 
            to="/candidate-signin" 
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
          >
            Sign in
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/recruiter-signup"
            className="text-blue-400 hover:text-emerald-400 transition-colors font-semibold text-sm inline-flex items-center gap-1"
          >
            Continue as Recruiter
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Click-wrap Modal */}
      <Dialog 
        open={modalOpen} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: '#1e293b',
            border: '1px solid rgba(71, 85, 105, 0.5)',
            borderRadius: '20px',
            backgroundImage: 'none',
          }
        }}
      >
        <DialogContent sx={{ padding: '32px' }}>
          <div className="text-center mb-6">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <Typography variant="h5" className="font-bold mb-2 text-white">
              Terms & Conditions
            </Typography>
            <Typography className="text-slate-400 text-sm">
              Please review and accept our terms to continue
            </Typography>
          </div>
          
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6 max-h-48 overflow-y-auto">
            <div className="text-slate-300 text-sm leading-relaxed">
              By registering as a candidate, you agree to:
              <ul className="mt-2 space-y-1 ml-4">
                <li>• Provide accurate and truthful information</li>
                <li>• Comply with our privacy policy and data usage terms</li>
                <li>• Allow us to share your profile with recruiters</li>
                <li>• Receive job-related communications</li>
              </ul>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ padding: '0 32px 32px', flexDirection: 'column', gap: 2 }}>
          <FormControlLabel
            control={
              <Checkbox 
                checked={isChecked} 
                onChange={(e) => setIsChecked(e.target.checked)}
                sx={{
                  color: '#3B82F6',
                  '&.Mui-checked': {
                    color: '#10B981',
                  },
                }}
              />
            }
            label={
              <span className="text-slate-300 text-sm">
                I have read and agree to the terms and conditions
              </span>
            }
            sx={{ margin: 0, width: '100%' }}
          />
          <Button 
            onClick={handleAcceptTerms} 
            disabled={!isChecked} 
            variant="contained"
            fullWidth
            style={{
              background: isChecked 
                ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                : '#334155',
              textTransform: 'none',
              fontWeight: '700',
              padding: '12px',
              borderRadius: '12px',
            }}
          >
            I Agree & Continue
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CandidateSignUp;
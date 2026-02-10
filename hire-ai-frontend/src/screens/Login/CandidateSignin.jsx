import React, { useState } from "react";
import { Mail, Lock, ChevronRight, ArrowRight, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button, TextField, InputAdornment, IconButton } from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import toast, { Toaster } from "react-hot-toast";

const CandidateSignIn = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      toast.success("Login successful! Redirecting...");
      navigate("/candidate", { replace: true });
      setLoading(false);
    }, 1000);
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <Toaster position="top-center" />

      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl w-full max-w-md p-10 relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-emerald-500 rounded-2xl blur-xl opacity-50"></div>
            <div className="relative text-2xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-emerald-600 rounded-2xl p-4 px-8 shadow-lg">
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-white" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.31 0-6-2.69-6-6V8.5l6-3.14 6 3.14V14c0 3.31-2.69 6-6 6z"/>
                <path d="M12 11l-3 3 1.5 1.5L12 14l3.5 3.5L17 16l-5-5z"/>
              </svg>
              <span className="text-white font-extrabold tracking-tight">Profile AI</span>
            </div>
          </div>
        </div>

        {/* Avatar */}
        <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mx-auto flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20">
          <User size={36} className="text-white" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Candidate Sign In
        </h1>
        <p className="text-slate-400 text-center mb-8 text-sm">
          Access your profile and job applications
        </p>

        <form onSubmit={handleSubmit} className="gap-5 flex flex-col">
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail className="text-slate-400" size={20} />
                </InputAdornment>
              ),
            }}
            sx={{
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
            }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock className="text-slate-400" size={20} />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton 
                    onClick={handleTogglePassword} 
                    edge="end" 
                    sx={{ color: '#94A3B8' }}
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
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
            }}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer text-sm">
              <input 
                type="checkbox" 
                className="h-4 w-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <span className="font-medium">Remember me</span>
            </label>
            <Link to="#" className="text-blue-400 font-semibold hover:text-blue-300 text-sm">
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            style={{
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              padding: '14px',
              fontSize: '16px',
              fontWeight: '700',
              textTransform: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)',
            }}
            endIcon={<ChevronRight size={20} />}
            disabled={loading}
          >
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-400">Don't have an account?</span>{' '}
          <Link 
            to="/candidate-signup" 
            className="text-emerald-400 hover:text-emerald-300 transition-colors font-semibold"
          >
            Sign up
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link
            to="/recruiter-signin"
            className="text-blue-400 hover:text-emerald-400 transition-colors font-semibold text-sm inline-flex items-center gap-1"
          >
            Continue as Recruiter
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CandidateSignIn;
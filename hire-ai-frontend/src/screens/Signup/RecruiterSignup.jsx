import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Building2,
  ChevronRight,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import amzLogo from "../../assets/images/amz-logo.png";
import { signup, sendOTP, verifyOTP } from "../../api/api";
import OTPInput from "../../components/OTPInput";

const RecruiterSignUp = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    fullName: "",
    company: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [resendsRemaining, setResendsRemaining] = useState(2);

  useEffect(() => {
    let interval;
    if (step === 2 && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleChange = (e) =>
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.fullName || !form.company || !form.email || !form.password) {
    toast.error("Please fill all required fields");
    return;
  }

  if (form.password.length < 8) {
    toast.error("Password must be at least 8 characters");
    return;
  }

  setLoading(true);

  try {
    const response = await sendOTP(form.email, "signup");
    toast.success("OTP sent to your email");
    if (response.resends_remaining !== undefined) {
      setResendsRemaining(response.resends_remaining);
    }
    setStep(2);
    setTimer(60);
    setCanResend(false);
  } catch (err) {
    if (err.detail && Array.isArray(err.detail)) {
      err.detail.forEach((e) => {
        toast.error(e.msg);
      });
    } else {
      toast.error(err.detail || err.message || "Failed to send OTP");
    }
  } finally {
    setLoading(false);
  }
};

const handleVerifyOTP = async (otpValue) => {
  setLoading(true);
  try {
    await verifyOTP(form.email, otpValue, "signup");
    
    const payload = {
      full_name: form.fullName,
      username: form.email.split("@")[0],
      email: form.email,
      password: form.password,
      role: "recruiter",
    };

    await signup(payload);
    toast.success("Account created successfully 🎉");
    navigate("/recruiter-signin", { replace: true });
  } catch (err) {
    if (err.detail && Array.isArray(err.detail)) {
      err.detail.forEach((e) => {
        toast.error(e.msg);
      });
    } else {
      toast.error(err.detail || err.message || "Verification failed");
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-[100dvh] w-full flex overflow-hidden bg-gray-50">
      <Toaster position="top-center" />

      {/* Left hero */}
      <div className="hidden lg:flex w-1/2 min-h-[100dvh] bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 p-16 text-white flex-col justify-center relative overflow-hidden">
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>

        <div className="max-w-lg relative z-10">
          <div className="bg-white backdrop-blur-sm rounded-2xl p-3 w-fit mb-10 shadow-lg flex items-center gap-3">
            <img src={amzLogo} alt="AMZ.AI" className="h-15" />
          </div>

          <h2 className="text-5xl font-extrabold leading-tight mb-5">
            AI-Powered
            <br />
            <span className="text-emerald-200">Recruitment</span>
          </h2>
          <p className="text-emerald-50 text-lg mb-10 font-medium">
            Build smarter profiles, hire faster
          </p>

          <div className="space-y-5">
            <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 hover:bg-white/10 transition-all">
              <div className="bg-white/10 p-3 rounded-lg text-2xl">📄</div>
              <div>
                <div className="font-semibold text-lg">
                  Smart Resume Parsing
                </div>
                <div className="text-emerald-100 text-sm mt-1">
                  AI extracts candidate data in seconds
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 hover:bg-white/10 transition-all">
              <div className="bg-white/10 p-3 rounded-lg text-2xl">👥</div>
              <div>
                <div className="font-semibold text-lg">
                  Talent Pool Management
                </div>
                <div className="text-emerald-100 text-sm mt-1">
                  Organize and search candidates effortlessly
                </div>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-white/5 backdrop-blur-sm rounded-xl p-4 hover:bg-white/10 transition-all">
              <div className="bg-white/10 p-3 rounded-lg text-2xl">📈</div>
              <div>
                <div className="font-semibold text-lg">AI Match Scoring</div>
                <div className="text-emerald-100 text-sm mt-1">
                  Find the best candidates automatically
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-2 text-emerald-100 text-sm">
            <Lock size={16} />
            <span>Secured with end-to-end encryption</span>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-4 py-6 lg:p-6">
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 border border-gray-100 w-full">
            <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">
              {step === 1 ? "Create account" : "Verify Email"}
            </h2>
            <p className="text-gray-500 text-center mb-6 text-sm">
              {step === 1 ? "Start building your talent pipeline today" : "Enter the OTP sent to your email"}
            </p>

            {step === 1 ? (
              <>
                <div className="space-y-3 mb-6">
                  <button className="w-full border-2 border-gray-200 rounded-xl py-3.5 flex items-center gap-3 justify-center text-sm font-medium hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <img
                      src="/src/assets/images/google.png"
                      alt="google"
                      className="w-5 h-5"
                    />
                    Continue with Google
                  </button>
                  <button className="w-full border-2 border-gray-200 rounded-xl py-3.5 flex items-center gap-3 justify-center text-sm font-medium hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <img
                      src="/src/assets/images/pop1.png"
                      alt="microsoft"
                      className="w-5 h-5"
                    />
                    Continue with Microsoft
                  </button>
                  <button className="w-full border-2 border-gray-200 rounded-xl py-3.5 flex items-center gap-3 justify-center text-sm font-medium hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <img
                      src="/src/assets/images/pop2.png"
                      alt="linkedin"
                      className="w-5 h-5"
                    />
                    Continue with LinkedIn
                  </button>
                </div>

                <div className="flex items-center my-6 gap-4">
                  <div className="flex-1 border-t border-gray-300"></div>
                  <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">
                    Or continue with email
                  </div>
                  <div className="flex-1 border-t border-gray-300"></div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Full Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <User size={18} />
                      </span>
                      <input
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        required
                        className="w-full border-2 border-gray-200 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-gray-900"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Company Name
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Building2 size={18} />
                      </span>
                      <input
                        name="company"
                        value={form.company}
                        onChange={handleChange}
                        required
                        className="w-full border-2 border-gray-200 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-gray-900"
                        placeholder="Acme Inc."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Work Email
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Mail size={18} />
                      </span>
                      <input
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        required
                        type="email"
                        className="w-full border-2 border-gray-200 rounded-xl py-3.5 pl-12 pr-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-gray-900"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Password
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <Lock size={18} />
                      </span>
                      <input
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        required
                        type={showPassword ? "text" : "password"}
                        className="w-full border-2 border-gray-200 rounded-xl py-3.5 pl-12 pr-12 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 transition-all outline-none text-gray-900"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      >
                        {showPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Must be at least 8 characters
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-emerald-500/30 transition-all"
                  >
                    {loading ? "Sending OTP..." : "Continue"}
                    <ChevronRight size={18} />
                  </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                  Already have an account?{" "}
                  <Link
                    to="/recruiter-signin"
                    className="text-emerald-600 font-semibold hover:text-emerald-700"
                  >
                    Sign in
                  </Link>
                </div>

                <div className="mt-4 text-center">
                  <Link
                    to="/candidate-signup"
                    className="text-sm text-gray-500 hover:text-emerald-600 font-medium inline-flex items-center gap-1"
                  >
                    Continue as Candidate
                  </Link>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-4 block text-center">
                    Enter 6-digit OTP sent to {form.email}
                  </label>
                  <OTPInput length={6} onComplete={handleVerifyOTP} disabled={loading} />
                  
                  <div className="mt-4 text-center">
                    <p className="text-sm text-gray-600">
                      {timer > 0 ? (
                        <span className="font-semibold text-emerald-600">
                          Time remaining: {timer}s
                        </span>
                      ) : (
                        <span className="font-semibold text-red-600">
                          OTP expired
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {resendsRemaining > 0 ? `${resendsRemaining} resend(s) remaining` : "No resends remaining"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleSubmit({ preventDefault: () => {} })}
                  disabled={loading || !canResend}
                  className="w-full text-sm text-emerald-600 hover:text-emerald-700 font-medium disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  {canResend ? "Resend OTP" : `Resend OTP (${timer}s)`}
                </button>

                <button
                  onClick={() => setStep(1)}
                  className="w-full text-sm text-gray-500 hover:text-gray-700 font-medium"
                >
                  Change Email
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterSignUp;

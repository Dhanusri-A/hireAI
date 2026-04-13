import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import { Shield, Download, AlertCircle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

const decodeJWT = (token) => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(atob(base64).split("").map((c) =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join("")));
  } catch {
    return null;
  }
};

const GoogleCallback = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // null = loading, "setup" = first time MFA, "enter_code" = returning user, "backup" = after setup verify
  const [step, setStep] = useState(null);
  const [token, setToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    const error = params.get("error");

    if (error) {
      toast.error(`Google login failed: ${error}`);
      navigate("/recruiter-signin", { replace: true });
      return;
    }
    if (!t) {
      toast.error("Invalid callback");
      navigate("/recruiter-signin", { replace: true });
      return;
    }

    const decoded = decodeJWT(t);
    if (!decoded) {
      toast.error("Invalid token");
      navigate("/recruiter-signin", { replace: true });
      return;
    }

    const user = {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role?.toLowerCase() || "recruiter",
      full_name: decoded.full_name || decoded.name || decoded.email?.split("@")[0],
    };

    setToken(t);
    setUserData(user);

    if (decoded.mfa_enabled) {
      // Returning user — ask for MFA code before completing login
      setStep("enter_code");
    } else {
      // New user — trigger MFA setup
      initMFASetup(t);
    }
  }, []);

  const initMFASetup = async (t) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mfa/setup`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to setup MFA");
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setStep("setup");
    } catch (err) {
      toast.error(err.message);
      navigate("/recruiter-signin", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  // Called after scanning QR — verifies code and enables MFA
  const handleVerifySetup = async () => {
    if (code.length !== 6) return toast.error("Enter a 6-digit code");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mfa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid code");
      setBackupCodes(data.backup_codes);
      setCode("");
      setStep("backup");
      toast.success("MFA enabled successfully!");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Called on returning sign-in — validates code against existing MFA secret
  const handleVerifyLogin = async () => {
    if (code.length !== 6) return toast.error("Enter a 6-digit code");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/mfa/verify-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Invalid MFA code");
      completeLogin();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const completeLogin = () => {
    login({ access_token: token, token_type: "bearer", user: userData });
    toast.success("Signed in with Google successfully!");
    window.location.href = "/recruiter";
  };

  const downloadBackupCodes = () => {
    const blob = new Blob([backupCodes.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hireai-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (step === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Toaster position="top-center" />
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className="text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <Toaster position="top-center" />
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">

        {/* Step 1: First-time MFA setup — scan QR */}
        {step === "setup" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Set Up Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">Required to secure your account</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Open <strong>Microsoft Authenticator</strong> app</li>
                <li>Tap <strong>"Add account"</strong> → <strong>"Other"</strong></li>
                <li>Scan the QR code below</li>
              </ol>
            </div>

            <div className="flex justify-center">
              <img src={qrCode} alt="QR Code" className="w-56 h-56 border-2 border-gray-200 rounded-lg p-2" />
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700 mb-1">Can't scan? Enter manually:</p>
              <code className="block bg-white p-2 rounded text-center font-mono text-sm font-bold">{secret}</code>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-digit code:</label>
              <input
                type="text"
                maxLength="6"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                className="w-full text-center text-2xl font-mono font-bold tracking-widest border-2 border-gray-200 rounded-xl py-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
                autoFocus
              />
            </div>

            <button
              onClick={handleVerifySetup}
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 transition-all"
            >
              {loading ? "Verifying..." : "Verify & Enable MFA"}
            </button>
          </div>
        )}

        {/* Step 2: Returning user — enter MFA code */}
        {step === "enter_code" && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
                <Shield className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Two-Factor Authentication</h3>
              <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app</p>
            </div>

            <input
              type="text"
              maxLength="6"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono font-bold tracking-widest border-2 border-gray-200 rounded-xl py-4 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 outline-none"
              autoFocus
            />

            <button
              onClick={handleVerifyLogin}
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 transition-all"
            >
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>
          </div>
        )}

        {/* Step 3: Backup codes after first-time setup */}
        {step === "backup" && (
          <div className="space-y-5">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Save Your Backup Codes</h3>
              <p className="text-sm text-gray-600">Store these safely — each can be used once</p>
            </div>

            <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">Save these codes now. You won't see them again!</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {backupCodes.map((c, i) => (
                  <div key={i} className="bg-white p-2 rounded text-center font-mono font-bold text-sm">{c}</div>
                ))}
              </div>
              <button
                onClick={downloadBackupCodes}
                className="w-full py-2 px-4 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 flex items-center justify-center gap-2"
              >
                <Download size={16} /> Download Codes
              </button>
            </div>

            <button
              onClick={completeLogin}
              className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all"
            >
              Continue to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleCallback;

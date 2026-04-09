import React, { useState } from "react";
import { Shield, Download, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const MFAFlow = ({ email, password, onLoginSuccess }) => {
  const [step, setStep] = useState("setup"); // setup, verify_setup, enter_code, backup
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [isSetupFlow, setIsSetupFlow] = useState(true);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

  // Initialize - check if setup or just code entry
  React.useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (data.mfa_setup_required) {
        setIsSetupFlow(true);
        handleSetupMFA();
      } else if (data.mfa_required) {
        setIsSetupFlow(false);
        setStep("enter_code");
      }
    } catch (err) {
      toast.error("Failed to check MFA status");
    }
  };

  const handleSetupMFA = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/mfa/setup/unauthenticated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (response.ok) {
        const data = await response.json();
        setQrCode(data.qr_code);
        setSecret(data.secret);
        setStep("verify_setup");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Failed to setup MFA");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async () => {
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/mfa/verify/unauthenticated`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code })
      });

      if (response.ok) {
        const data = await response.json();
        setBackupCodes(data.backup_codes);
        setStep("backup");
        toast.success("MFA enabled successfully!");
      } else {
        const error = await response.json();
        toast.error(error.detail || "Invalid code");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleLoginWithMFA = async () => {
    if (code.length !== 6) {
      toast.error("Please enter a 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/login/mfa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mfa_code: code })
      });

      if (response.ok) {
        const data = await response.json();
        onLoginSuccess(data);
      } else {
        const error = await response.json();
        toast.error(error.detail || "Invalid MFA code");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  const downloadBackupCodes = () => {
    const text = backupCodes.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hireai-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCompleteSetup = () => {
    // After saving backup codes, proceed to login with MFA
    setStep("enter_code");
    setCode("");
    setIsSetupFlow(false);
    toast.success("Now enter your MFA code to login");
  };

  return (
    <div className="w-full">
      {/* Setup Flow - Scan QR */}
      {step === "verify_setup" && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Set Up Two-Factor Authentication
            </h3>
            <p className="text-sm text-gray-600">
              Scan the QR code with Microsoft Authenticator
            </p>
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
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Enter 6-digit code:
            </label>
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

      {/* Backup Codes */}
      {step === "backup" && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Save Your Backup Codes</h3>
            <p className="text-sm text-gray-600">Store these safely - each can be used once</p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Save these codes now. You won't see them again!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {backupCodes.map((code, index) => (
                <div key={index} className="bg-white p-2 rounded text-center font-mono font-bold text-sm">
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={downloadBackupCodes}
              className="w-full py-2 px-4 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 flex items-center justify-center gap-2"
            >
              <Download size={16} />
              Download Codes
            </button>
          </div>

          <button
            onClick={handleCompleteSetup}
            className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all"
          >
            Continue to Login
          </button>
        </div>
      )}

      {/* Enter MFA Code */}
      {step === "enter_code" && (
        <div className="space-y-5">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full mb-4">
              <Shield className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-gray-600">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>

          <div>
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
            onClick={handleLoginWithMFA}
            disabled={loading || code.length !== 6}
            className="w-full py-3.5 rounded-xl text-white font-semibold bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 transition-all"
          >
            {loading ? "Verifying..." : "Verify & Login"}
          </button>
        </div>
      )}
    </div>
  );
};

export default MFAFlow;
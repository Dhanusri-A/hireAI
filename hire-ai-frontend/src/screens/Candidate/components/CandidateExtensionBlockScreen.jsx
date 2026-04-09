import {
  AlertTriangle,
  X,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Play,
} from "lucide-react";

export default function CandidateExtensionBlockScreen({
  extensions,
  runtimeDetected,
  onProceed,
  onRecheck,
}) {
  const hasIssues = extensions.length > 0 || runtimeDetected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-red-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`px-8 py-6 text-white ${
            hasIssues
              ? "bg-gradient-to-r from-red-600 to-red-700"
              : "bg-gradient-to-r from-emerald-600 to-teal-600"
          }`}
        >
          <div className="flex items-center gap-3">
            {hasIssues ? (
              <ShieldAlert className="w-8 h-8" />
            ) : (
              <ShieldCheck className="w-8 h-8" />
            )}
            <div>
              <h1 className="text-2xl font-bold">
                {hasIssues
                  ? "Browser Extensions Detected"
                  : "No Extensions Detected"}
              </h1>
              <p
                className={`text-sm ${
                  hasIssues ? "text-red-100" : "text-emerald-100"
                }`}
              >
                {hasIssues
                  ? "You must disable all extensions before starting the interview"
                  : "Your browser is clean — you may proceed"}
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 space-y-5">
          {hasIssues ? (
            <>
              <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-red-800 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Issues detected:
                </p>
                <ul className="space-y-2">
                  {extensions.map((ext, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-red-700"
                    >
                      <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                      <span>
                        <strong>{ext.name}</strong>{" "}
                        <span className="text-red-400 text-xs">
                          ({ext.method})
                        </span>
                      </span>
                    </li>
                  ))}
                  {runtimeDetected &&
                    !extensions.some((e) => e.method === "runtime") && (
                      <li className="flex items-start gap-2 text-sm text-red-700">
                        <X className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-500" />
                        <span>
                          <strong>Active browser extensions</strong> detected
                          via Chrome runtime
                        </span>
                      </li>
                    )}
                </ul>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  How to disable extensions:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-sm text-amber-700">
                  <li>
                    Open a new tab → go to{" "}
                    <code className="bg-amber-100 px-1 rounded">
                      chrome://extensions
                    </code>
                  </li>
                  <li>
                    Toggle <strong>off</strong> all enabled extensions
                  </li>
                  <li>
                    Return here and click <strong>Re-check</strong>
                  </li>
                  <li>Or use an Incognito window (extensions off by default)</li>
                </ol>
              </div>

              <button
                onClick={onRecheck}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Shield className="w-5 h-5" /> Re-check Extensions
              </button>
            </>
          ) : (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 mb-1">
                    Browser is clean
                  </p>
                  <p className="text-sm text-emerald-700">
                    No known extensions were detected. You may proceed.
                  </p>
                </div>
              </div>

              <button
                onClick={onProceed}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Play className="w-5 h-5" /> Proceed to Interview Setup
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
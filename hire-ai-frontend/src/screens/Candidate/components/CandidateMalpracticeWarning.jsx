import { AlertTriangle } from "lucide-react";

export default function CandidateMalpracticeWarning({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80">
      <div className="bg-gray-900 border-2 border-yellow-500 rounded-2xl p-8 max-w-md mx-4 text-center shadow-2xl">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-yellow-400" />
        </div>

        <h2 className="text-xl font-bold text-white mb-2">
          ⚠️ Warning — Tab Switch Detected
        </h2>
        <p className="text-yellow-300 text-sm mb-1">
          This is your first and only warning.
        </p>
        <p className="text-gray-400 text-sm mb-6">
          Switching tabs or minimising the window is strictly prohibited and has
          been recorded.
          <span className="block mt-2 text-red-400 font-semibold">
            A second violation will immediately terminate the interview and mark
            it as Malpractice.
          </span>
        </p>

        <button
          onClick={onDismiss}
          className="px-6 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-semibold transition-colors"
        >
          I Understand — Resume Interview
        </button>
      </div>
    </div>
  );
}
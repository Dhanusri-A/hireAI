import { ShieldAlert } from "lucide-react";

export default function CandidateMalpracticeTerminated() {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95">
      <div className="bg-gray-900 border-2 border-red-600 rounded-2xl p-10 max-w-lg mx-4 text-center shadow-2xl">
        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>

        <h2 className="text-2xl font-bold text-red-400 mb-3">
          Interview Terminated
        </h2>
        <p className="text-red-300 font-semibold mb-2">Reason: Malpractice</p>
        <p className="text-gray-400 text-sm mb-4">
          A second tab switch was detected. Your interview has been automatically
          ended and flagged as{" "}
          <span className="text-red-400 font-bold"> Malpractice</span>. The
          recruiter has been notified.
        </p>
        <p className="text-gray-500 text-xs">You will be redirected shortly…</p>

        <div className="flex justify-center gap-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 bg-red-500 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
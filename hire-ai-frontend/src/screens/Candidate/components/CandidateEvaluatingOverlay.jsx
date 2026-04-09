import { useState, useEffect } from "react";
import { Upload } from "lucide-react";

export default function CandidateEvaluatingOverlay({ uploadingCount }) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setFlipped((p) => !p), 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col items-center justify-center gap-8">
      <div
        className="text-9xl select-none"
        style={{
          transform: flipped ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.7s cubic-bezier(0.4,0,0.2,1)",
          filter: "drop-shadow(0 0 20px rgba(16,185,129,0.5))",
        }}
      >
        ⏳
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Evaluating Your Interview
        </h2>
        <p className="text-emerald-400">AI is analysing your responses…</p>
        {uploadingCount > 0 && (
          <p className="text-blue-400 text-sm mt-2 flex items-center justify-center gap-2">
            <Upload className="w-4 h-4 animate-bounce" />
            Uploading {uploadingCount} recording
            {uploadingCount > 1 ? "s" : ""} in background…
          </p>
        )}
      </div>

      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 bg-emerald-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
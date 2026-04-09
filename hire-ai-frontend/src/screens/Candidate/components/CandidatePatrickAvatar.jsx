import { useEffect, useRef } from "react";
import Lottie from "lottie-react";
import patrickAnimation from "../../../assets/Lottie/ai.json";

export default function CandidatePatrickAvatar({ isTalking }) {
  const lottieRef = useRef(null);

  useEffect(() => {
    const anim = lottieRef.current;
    if (!anim) return;
    isTalking ? anim.play() : anim.stop();
  }, [isTalking]);

  return (
    <div className="relative flex flex-col items-center">
      <div
        className="relative rounded-full overflow-hidden transition-all duration-500"
        style={{
          width: 220,
          height: 220,
          boxShadow: isTalking
            ? "0 0 0 4px #34d399, 0 0 32px 8px rgba(52,211,153,0.45)"
            : "0 0 0 2px rgba(52,211,153,0.2)",
        }}
      >
        <Lottie
          lottieRef={lottieRef}
          animationData={patrickAnimation}
          loop
          autoplay={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {isTalking && (
        <>
          <div
            className="absolute rounded-full border-4 border-emerald-400 animate-ping opacity-30 pointer-events-none"
            style={{ inset: 0, width: 220, height: 220 }}
          />
          <div className="flex items-end gap-1 mt-4 h-8">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="w-1.5 bg-emerald-400 rounded-full"
                style={{
                  height: `${(i % 5) * 5 + 4}px`,
                  animation: `pulse ${0.25 + (i % 5) * 0.1}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
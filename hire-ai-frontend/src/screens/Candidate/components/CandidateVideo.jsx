import { useEffect, useRef } from "react";
import { SelfieSegmentation } from "@mediapipe/selfie_segmentation";

export default function CandidateVideo({
  stream,
  videoOff,
  candidateName,
  blurBackground,
  backgroundImage,
  onCanvasStream,
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const segRef = useRef(null);
  const rafRef = useRef(null);
  const blurRef = useRef(blurBackground);
  const bgImageRef = useRef(null);
  const bgImageUrlRef = useRef(null);
  const streamSentRef = useRef(false);

  useEffect(() => {
    blurRef.current = blurBackground;
  }, [blurBackground]);

  // Pre-load background image
  useEffect(() => {
    if (!backgroundImage) { bgImageRef.current = null; bgImageUrlRef.current = null; return; }
    if (bgImageUrlRef.current === backgroundImage) return;
    bgImageUrlRef.current = backgroundImage;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => { bgImageRef.current = img; };
    img.src = backgroundImage;
  }, [backgroundImage]);

  // Attach stream to hidden video
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !stream || videoOff) {
      cancelAnimationFrame(rafRef.current);
      return;
    }

    const ctx = canvas.getContext("2d");

    // Initialize MediaPipe once
    if (!segRef.current) {
      const seg = new SelfieSegmentation({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`,
      });

      seg.setOptions({
        modelSelection: 1,
        selfieMode: true,
      });

      seg.onResults(({ image, segmentationMask }) => {
        const vw = canvas.width;
        const vh = canvas.height;
        if (!vw || !vh) return;

        ctx.clearRect(0, 0, vw, vh);

        // 1️⃣ Draw background (blur or image)
        ctx.save();
        if (bgImageRef.current) {
          ctx.drawImage(bgImageRef.current, 0, 0, vw, vh);
        } else {
          ctx.filter = "blur(18px)";
          ctx.drawImage(image, 0, 0, vw, vh);
        }
        ctx.restore();

        // 2️⃣ Cut out person using mask
        ctx.save();
        ctx.globalCompositeOperation = "destination-out";
        ctx.filter = "blur(6px)";
        ctx.drawImage(segmentationMask, 0, 0, vw, vh);
        ctx.restore();

        // 3️⃣ Draw sharp person
        ctx.save();
        ctx.globalCompositeOperation = "destination-over";
        ctx.filter = "none";
        ctx.drawImage(image, 0, 0, vw, vh);
        ctx.restore();
      });

      segRef.current = seg;
    }

    const seg = segRef.current;
    let isProcessing = false;

    const render = async () => {
      if (video.readyState < 2) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      if (!vw || !vh) {
        rafRef.current = requestAnimationFrame(render);
        return;
      }

      // Sync canvas size
      if (canvas.width !== vw || canvas.height !== vh) {
        canvas.width = vw;
        canvas.height = vh;
      }

      if (blurRef.current || bgImageRef.current) {
        if (!isProcessing) {
          isProcessing = true;
          await seg.send({ image: video });
          isProcessing = false;
        }
      } else {
        ctx.clearRect(0, 0, vw, vh);
        ctx.drawImage(video, 0, 0, vw, vh);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    const start = () => {
      video.play().catch(() => {});
      render();

      // Send processed stream if needed
      if (
        !streamSentRef.current &&
        onCanvasStream &&
        canvas.captureStream
      ) {
        streamSentRef.current = true;
        onCanvasStream(canvas.captureStream(30));
      }
    };

    if (video.readyState >= 2) start();
    else video.onloadedmetadata = start;

    return () => cancelAnimationFrame(rafRef.current);
  }, [stream, videoOff]);

  return (
    <div className="absolute inset-0 bg-black">
      {/* Hidden raw video */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
      />

      {/* Processed output */}
      {!videoOff && (
        <canvas
          ref={canvasRef}
          className="w-full h-full object-cover"
        />
      )}

      {/* Camera OFF UI */}
      {videoOff && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <div className="text-center">
            <div className="w-24 h-24 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl font-bold text-gray-400">
                {candidateName
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("") || "YOU"}
              </span>
            </div>
            <p className="text-gray-500">Camera Off</p>
          </div>
        </div>
      )}
    </div>
  );
}
// screens/Candidate/pages/CandidateAIInterview.jsx
// FIXES:
// 1. Recording bug fixed — sectionRecQIdxRef now correctly persists across sections
// 2. Mute/Video toggle buttons removed (interview context)
// 3. Internet speed check on setup + live indicator during call
// 4. Network loss detection ends interview gracefully
// 5. markRecordingComplete now uses fetch directly with auth token + 3x retry backoff
//    (fixes net::ERR_FAILED when axios is blocked in fullscreen/HTTPS context)
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  Mic,
  Video,
  PhoneOff,
  Clock,
  Settings,
  Volume2,
  CheckCircle,
  Play,
  HelpCircle,
  Upload,
  CloudOff,
  AlertTriangle,
  Eye,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import {
  getSectionQuestions,
  evaluateSectionAnswers,
  generateFollowUpQuestion,
  getRecordingPresignedUrl,
} from "../../../api/api";
import toast from "react-hot-toast";

import CandidatePatrickAvatar from "../components/CandidatePatrickAvatar";
import CandidateVideo from "../components/CandidateVideo";
import CandidateEvaluatingOverlay from "../components/CandidateEvaluatingOverlay";
import CandidateMalpracticeWarning from "../components/CandidateMalpracticeWarning";
import CandidateMalpracticeTerminated from "../components/CandidateMalpracticeTerminated";
import CandidateExtensionBlockScreen from "../components/CandidateExtensionBlockScreen";
import CandidateBackgroundPicker from "../components/CandidateBackgroundPicker";

// ─── Utilities ────────────────────────────────────────────────────────────────
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
  return Promise.resolve();
}
function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  return Promise.resolve();
}
const safeExitFullscreen = () => exitFullscreen().catch(() => {});

// ─── Chrome keep-alive ────────────────────────────────────────────────────────
let _pingInterval = null;
function startChromePing() {
  stopChromePing();
  _pingInterval = setInterval(() => {
    if (window.speechSynthesis?.paused) window.speechSynthesis.resume();
  }, 5000);
}
function stopChromePing() {
  clearInterval(_pingInterval);
  _pingInterval = null;
}

// ─── TTS ──────────────────────────────────────────────────────────────────────
function speak(text) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      const voice =
        voices.find((v) => v.name === "Veena") ||
        voices.find(
          (v) =>
            v.lang.startsWith("en") && v.name.toLowerCase().includes("female"),
        ) ||
        voices.find((v) => v.name === "Samantha") ||
        voices.find((v) => v.lang === "en-IN") ||
        null;
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 0.78;
      u.pitch = 1.0;
      u.volume = 1.0;
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      u.onend = done;
      u.onerror = (e) => {
        console.warn("TTS:", e.error);
        done();
      };
      window.speechSynthesis.speak(u);
    }, 250);
  });
}

// ─── STT ──────────────────────────────────────────────────────────────────────
class SpeechRecognizer {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      this.supported = false;
      return;
    }
    this.supported = true;
    this.rec = new SR();
    this.rec.continuous = true;
    this.rec.interimResults = true;
    this.rec.lang = "en-US";
    this._finalTranscript = "";
    this._interimTranscript = "";
    this._running = false;
    this._cb = null;

    this.rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          this._finalTranscript += e.results[i][0].transcript + " ";
        } else {
          interim += e.results[i][0].transcript;
        }
      }
      this._interimTranscript = interim;
      this._cb?.(this._finalTranscript + interim);
    };
    this.rec.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted")
        console.warn("SR:", e.error);
    };
    this.rec.onend = () => {
      if (this._running) {
        try {
          this.rec.start();
        } catch (_) {}
      }
    };
  }

  start(cb) {
    if (!this.supported) return;
    this._finalTranscript = "";
    this._interimTranscript = "";
    this._running = true;
    this._cb = cb;
    try {
      this.rec.start();
    } catch (_) {}
  }

  stop() {
    this._running = false;
    const captured = (this._finalTranscript + this._interimTranscript).trim();
    try {
      this.rec.stop();
    } catch (_) {}
    return captured || this._finalTranscript.trim();
  }

  destroy() {
    this._running = false;
    this._cb = null;
    try {
      this.rec.stop();
    } catch (_) {}
  }

  get currentTranscript() {
    return (this._finalTranscript + this._interimTranscript).trim();
  }
}

// ─── Shared: mark recording complete via fetch with retry ────────────────────
// Uses fetch() directly instead of axios to avoid interceptor/HTTPS issues
// in fullscreen context. Retries 3x with exponential backoff.
// If all retries fail, the file is still safely in S3 — DB can be reconciled.
async function markRecordingCompleteFetch(
  interviewId,
  sectionId,
  questionIndex,
  objectKey,
) {
  const token = localStorage.getItem("access_token");
  const url = `${API_BASE}/interviews/${interviewId}/sections/${sectionId}/questions/${questionIndex}/recordings`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ object_key: objectKey }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }
      return; // success
    } catch (err) {
      console.warn(
        `markComplete attempt ${attempt}/3 Q${questionIndex}:`,
        err.message,
      );
      if (attempt < 3) await wait(1000 * attempt);
    }
  }
  // All retries exhausted — file IS in S3, log for server-side reconciliation
  console.error(
    `markComplete permanently failed Q${questionIndex} — file is in S3 at key: ${objectKey}`,
  );
}

// ─── QuestionRecorder (PRIMARY — screen + mic audio) ─────────────────────────
class QuestionRecorder {
  constructor(stream, interviewId, sectionId, questionIndex) {
    this.stream = stream;
    this.interviewId = interviewId;
    this.sectionId = sectionId;
    this.questionIndex = questionIndex;
    this._chunks = [];
    this._mediaRecorder = null;
    this._presignedUrl = null;
    this._objectKey = null;
    this._blob = null;
    this._uploadStatus = "idle";
  }

  static _bestMime() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
  }

  async prefetch() {
    try {
      const data = await getRecordingPresignedUrl(
        this.interviewId,
        this.sectionId,
        this.questionIndex,
      );
      this._presignedUrl = data.presigned_url;
      this._objectKey = data.object_key;
    } catch (err) {
      console.error("Presigned URL fetch failed:", err);
    }
  }

  start() {
    if (!this.stream) {
      console.error("No stream for recorder Q", this.questionIndex);
      return;
    }
    this._chunks = [];
    const mime = QuestionRecorder._bestMime();
    try {
      this._mediaRecorder = new MediaRecorder(
        this.stream,
        mime ? { mimeType: mime } : undefined,
      );
      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) this._chunks.push(e.data);
      };
      this._mediaRecorder.start(5000);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
    }
  }

  stop() {
    return new Promise((resolve) => {
      const mr = this._mediaRecorder;
      if (!mr || mr.state === "inactive") {
        resolve(null);
        return;
      }
      mr.onstop = () => {
        this._blob = new Blob(this._chunks, {
          type: mr.mimeType || "video/webm",
        });
        resolve(this._blob);
      };
      mr.stop();
    });
  }

  // FIX #5: S3 PUT + markComplete separated with retry logic on markComplete.
  // Uses fetch() directly to bypass axios interceptors that can fail in fullscreen/HTTPS.
  async upload() {
    if (!this._blob) {
      console.warn("No blob Q", this.questionIndex);
      return;
    }
    if (this._blob.size < 500) {
      console.warn("Blob too small Q", this.questionIndex);
      return;
    }
    if (!this._presignedUrl) {
      console.error("No presigned URL Q", this.questionIndex);
      return;
    }

    this._uploadStatus = "uploading";

    // Step 1: Upload blob to S3
    try {
      const res = await fetch(this._presignedUrl, {
        method: "PUT",
        body: this._blob,
        headers: { "Content-Type": this._blob.type || "video/webm" },
      });
      if (!res.ok) throw new Error(`S3 PUT ${res.status} ${res.statusText}`);
    } catch (err) {
      this._uploadStatus = "failed";
      console.error(`S3 upload failed Q${this.questionIndex}:`, err);
      return; // Don't call markComplete if S3 itself failed
    }

    // Step 2: Notify backend with retry
    await markRecordingCompleteFetch(
      this.interviewId,
      this.sectionId,
      this.questionIndex,
      this._objectKey,
    );

    // Mark done regardless — file is confirmed in S3 even if DB mark failed
    this._uploadStatus = "done";
  }

  get uploadStatus() {
    return this._uploadStatus;
  }
}

// ─── CameraRecorder (SECONDARY — camera/canvas, silent proctor backup) ────────
class CameraRecorder {
  constructor(cameraStream, interviewId, sectionId, questionIndex) {
    this.cameraStream = cameraStream;
    this.interviewId = interviewId;
    this.sectionId = sectionId;
    this._questionIndex = questionIndex + 10000;
    this._chunks = [];
    this._mediaRecorder = null;
    this._presignedUrl = null;
    this._objectKey = null;
    this._blob = null;
    this._uploadStatus = "idle";
  }

  static _bestMime() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ];
    return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
  }

  async prefetch() {
    try {
      const data = await getRecordingPresignedUrl(
        this.interviewId,
        this.sectionId,
        this._questionIndex,
      );
      this._presignedUrl = data.presigned_url;
      this._objectKey = data.object_key;
    } catch (err) {
      console.error("Camera presigned URL fetch failed:", err);
    }
  }

  start() {
    if (!this.cameraStream) {
      console.warn("No camera stream for CameraRecorder");
      return;
    }
    this._chunks = [];
    const mime = CameraRecorder._bestMime();
    try {
      this._mediaRecorder = new MediaRecorder(
        this.cameraStream,
        mime ? { mimeType: mime } : undefined,
      );
      this._mediaRecorder.ondataavailable = (e) => {
        if (e.data?.size > 0) this._chunks.push(e.data);
      };
      this._mediaRecorder.start(5000);
    } catch (err) {
      console.error("CameraRecorder start error:", err);
    }
  }

  stop() {
    return new Promise((resolve) => {
      const mr = this._mediaRecorder;
      if (!mr || mr.state === "inactive") {
        resolve(null);
        return;
      }
      mr.onstop = () => {
        this._blob = new Blob(this._chunks, {
          type: mr.mimeType || "video/webm",
        });
        resolve(this._blob);
      };
      mr.stop();
    });
  }

  // FIX #5: Same robust upload pattern as QuestionRecorder
  async upload() {
    if (!this._blob || this._blob.size < 500) return;
    if (!this._presignedUrl) return;

    this._uploadStatus = "uploading";

    // Step 1: S3 PUT
    try {
      const res = await fetch(this._presignedUrl, {
        method: "PUT",
        body: this._blob,
        headers: { "Content-Type": this._blob.type || "video/webm" },
      });
      if (!res.ok)
        throw new Error(`Camera S3 PUT ${res.status} ${res.statusText}`);
    } catch (err) {
      this._uploadStatus = "failed";
      console.error(`Camera S3 upload failed:`, err);
      return;
    }

    // Step 2: Notify backend with retry
    await markRecordingCompleteFetch(
      this.interviewId,
      this.sectionId,
      this._questionIndex,
      this._objectKey,
    );

    this._uploadStatus = "done";
  }

  get uploadStatus() {
    return this._uploadStatus;
  }
}

// ─── Internet Speed Utilities ─────────────────────────────────────────────────
async function measureDownloadSpeed() {
  try {
    const testUrl = `https://speed.cloudflare.com/__down?bytes=100000&_=${Date.now()}`;
    const startTime = Date.now();
    const response = await fetch(testUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return fallbackSpeedCheck();
    const blob = await response.blob();
    const duration = (Date.now() - startTime) / 1000;
    if (duration < 0.05) return fallbackSpeedCheck();
    const bitsLoaded = blob.size * 8;
    const speedMbps = bitsLoaded / duration / 1024 / 1024;
    return speedMbps;
  } catch {
    return fallbackSpeedCheck();
  }
}

async function fallbackSpeedCheck() {
  try {
    const res = await fetch(
      `https://www.google.com/generate_204?_=${Date.now()}`,
      {
        cache: "no-store",
        signal: AbortSignal.timeout(3000),
      },
    );
    return res.ok || res.status === 204 ? 2 : null;
  } catch {
    return navigator.onLine ? 2 : null;
  }
}

function getNetworkQuality(speedMbps) {
  if (speedMbps === null) return "offline";
  if (speedMbps >= 5) return "good";
  if (speedMbps >= 1) return "fair";
  return "poor";
}

function NetworkIcon({ quality, className = "w-4 h-4" }) {
  if (quality === "offline")
    return <WifiOff className={`${className} text-red-400`} />;
  if (quality === "poor")
    return <Wifi className={`${className} text-red-400`} />;
  if (quality === "fair")
    return <Wifi className={`${className} text-yellow-400`} />;
  return <Wifi className={`${className} text-emerald-400`} />;
}

// ─── Extension detector ───────────────────────────────────────────────────────
function detectBrowserExtensions() {
  const found = [];
  const suspiciousPlugins = [
    "grammarly",
    "honey",
    "dashlane",
    "lastpass",
    "1password",
    "bitwarden",
    "nordpass",
    "keeper",
    "ublock",
    "adblock",
    "ghostery",
  ];
  Array.from(navigator.plugins || []).forEach((p) => {
    const name = p.name.toLowerCase();
    suspiciousPlugins.forEach((s) => {
      if (
        name.includes(s) &&
        !found.some((f) => f.name.toLowerCase().includes(s))
      )
        found.push({ name: p.name, method: "plugin" });
    });
  });
  [
    { sel: "grammarly-extension", name: "Grammarly" },
    { sel: "[data-grammarly-shadow-root]", name: "Grammarly" },
    { sel: "[honey-offers-container]", name: "Honey" },
    { sel: "[data-lastpass-icon-root]", name: "LastPass" },
    { sel: "[data-dashlane-rid]", name: "Dashlane" },
    { sel: "[loom-widget]", name: "Loom" },
    { sel: "#AdblockRoot", name: "AdBlock" },
    { sel: "[id*='ublock']", name: "uBlock Origin" },
    { sel: "[class*='ghostery']", name: "Ghostery" },
    { sel: "[id*='metamask']", name: "MetaMask" },
    { sel: ".__selenium_unwrapped", name: "Automation tool" },
  ].forEach(({ sel, name }) => {
    try {
      if (document.querySelector(sel) && !found.some((f) => f.name === name))
        found.push({ name, method: "DOM" });
    } catch (_) {}
  });
  [
    { global: "__GRAMMARLY__", name: "Grammarly" },
    { global: "honeybadger", name: "Honey" },
    { global: "_loom", name: "Loom" },
    { global: "__ublock__", name: "uBlock Origin" },
    { global: "ethereum", name: "MetaMask / crypto wallet" },
    { global: "__metamask__", name: "MetaMask" },
  ].forEach(({ global: g, name }) => {
    try {
      if (window[g] !== undefined && !found.some((f) => f.name === name))
        found.push({ name, method: "global" });
    } catch (_) {}
  });
  const extUrls = Array.from(
    document.querySelectorAll("link[href], script[src], iframe[src]"),
  ).filter((el) => {
    const href = el.getAttribute("href") || el.getAttribute("src") || "";
    return (
      href.startsWith("chrome-extension://") ||
      href.startsWith("moz-extension://") ||
      href.startsWith("safari-web-extension://")
    );
  });
  if (extUrls.length > 0) {
    found.push({
      name: `${extUrls.length} extension resource(s) injected into page`,
      method: "script injection",
    });
  }
  let shadowRootCount = 0;
  try {
    Array.from(document.body.children).forEach((el) => {
      if (el.shadowRoot) shadowRootCount++;
    });
  } catch (_) {}
  if (shadowRootCount > 0) {
    found.push({
      name: `${shadowRootCount} shadow root(s) injected by extension`,
      method: "shadow DOM",
    });
  }
  let runtimeDetected = false;
  try {
    if (typeof chrome !== "undefined" && chrome?.runtime?.id)
      runtimeDetected = true;
  } catch (_) {}
  try {
    const entries = performance.getEntriesByType("resource");
    const hasExtResource = entries.some(
      (e) =>
        e.name.startsWith("chrome-extension://") ||
        e.name.startsWith("moz-extension://"),
    );
    if (hasExtResource) runtimeDetected = true;
  } catch (_) {}
  return { extensions: found, runtimeDetected };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function CandidateAIInterview() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [interview] = useState(state?.interview || null);

  // Extension gate
  const [extCheckDone, setExtCheckDone] = useState(false);
  const [extPassed, setExtPassed] = useState(false);
  const [extResult, setExtResult] = useState({
    extensions: [],
    runtimeDetected: false,
  });

  // Phase
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [phase, setPhase] = useState("setup");
  const [currentSpeakingQuestion, setCurrentSpeakingQuestion] = useState("");
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [currentSectionIdx, setCurrentSectionIdx] = useState(0);
  const [currentSectionLabel, setCurrentSectionLabel] = useState("");
  const [totalSections, setTotalSections] = useState(0);
  const [questionTimer, setQuestionTimer] = useState(40);
  const [breakTimer, setBreakTimer] = useState(5);
  const [gapTimer, setGapTimer] = useState(5);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");

  // Media
  const [candidateStream, setCandidateStream] = useState(null);
  const [starting, setStarting] = useState(false);
  const [bgMode, setBgMode] = useState("none");
  const [showBgPicker, setShowBgPicker] = useState(false);

  // Network quality
  const [networkQuality, setNetworkQuality] = useState("unknown");
  const [networkSpeed, setNetworkSpeed] = useState(null);
  const [checkingSpeed, setCheckingSpeed] = useState(false);
  const networkMonitorRef = useRef(null);
  const networkEndedRef = useRef(false);

  // Upload
  const [pendingUploads, setPendingUploads] = useState(0);
  const [uploadStatus, setUploadStatus] = useState({});

  // Malpractice
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [showMalpracticeWarning, setShowMalpracticeWarning] = useState(false);
  const [showMalpracticeTerminated, setShowMalpracticeTerminated] =
    useState(false);
  const tabSwitchCountRef = useRef(0);
  const malpracticeEndedRef = useRef(false);

  const recognizerRef = useRef(null);
  const abortRef = useRef(false);
  const evaluateCalledRef = useRef(false);
  const qaBySection = useRef({});
  const questionTimerRef = useRef(null);
  const breakTimerRef = useRef(null);
  const gapTimerRef = useRef(null);
  const elapsedTimerRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const screenRecordStreamRef = useRef(null);
  const canvasStreamRef = useRef(null);
  const currentRecorderRef = useRef(null);
  const currentCameraRecorderRef = useRef(null);
  const allScreenRecordersRef = useRef([]);
  const allCameraRecordersRef = useRef([]);
  const skipRef = useRef(null);
  const speakSkipRef = useRef(null);
  const globalQIdxRef = useRef(0);
  const sectionRecQIdxRef = useRef(0);
  const uploadLabelsRef = useRef({});
  const frozenTranscriptRef = useRef("");

  const isGreeting = phase === "greeting";
  const isGap = phase === "gap";
  const isSpeaking = phase === "speaking";
  const isAnswering = phase === "answering";
  const isBreak = phase === "break";
  const avatarTalking = isGreeting || isSpeaking;
  const showQuestion = (isSpeaking || isAnswering) && currentSpeakingQuestion;

  // ── Extension check on mount ──────────────────────────────────────────────
  useEffect(() => {
    if (!interview) {
      toast.error("Interview details not found");
      navigate("/candidate/my-interviews");
      return;
    }
    setTimeout(() => {
      const result = detectBrowserExtensions();
      setExtResult(result);
      const passed = result.extensions.length === 0 && !result.runtimeDetected;
      setExtPassed(passed);
      setExtCheckDone(true);
    }, 1500);
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.addEventListener("voiceschanged", () => {});
  }, []);

  // ── Tab-switch detection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!interviewStarted) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) return;
      tabSwitchCountRef.current += 1;
      const count = tabSwitchCountRef.current;
      setTabSwitchCount(count);
      if (count === 1) {
        setShowMalpracticeWarning(true);
      } else if (count >= 2 && !malpracticeEndedRef.current) {
        malpracticeEndedRef.current = true;
        setShowMalpracticeWarning(false);
        setShowMalpracticeTerminated(true);
        doFinish({ malpractice: true });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [interviewStarted]);

  // ── Network monitoring during interview ───────────────────────────────────
  useEffect(() => {
    if (!interviewStarted) return;
    const monitor = async () => {
      if (networkEndedRef.current) return;
      const online = navigator.onLine;
      if (!online) {
        setNetworkQuality("offline");
        setNetworkSpeed(null);
        if (!networkEndedRef.current && !evaluateCalledRef.current) {
          networkEndedRef.current = true;
          window.speechSynthesis?.cancel();
          await speak("No network connection detected. Interview ended.");
          doFinish({ malpractice: false });
        }
        return;
      }
      const speed = await measureDownloadSpeed();
      setNetworkSpeed(speed);
      const quality = getNetworkQuality(speed);
      setNetworkQuality(quality);
    };
    monitor();
    networkMonitorRef.current = setInterval(monitor, 30000);
    return () => clearInterval(networkMonitorRef.current);
  }, [interviewStarted]);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      abortRef.current = true;
      recognizerRef.current?.destroy();
      clearAllTimers();
      stopChromePing();
      clearInterval(networkMonitorRef.current);
      window.speechSynthesis?.cancel();
      cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      currentRecorderRef.current?.stop();
      currentCameraRecorderRef.current?.stop();
    };
  }, []);

  function clearAllTimers() {
    clearInterval(questionTimerRef.current);
    clearInterval(breakTimerRef.current);
    clearInterval(gapTimerRef.current);
    clearInterval(elapsedTimerRef.current);
  }

  function startCountdown(durationSec, setter, timerRef, skippable = false) {
    setter(durationSec);
    let remaining = durationSec;
    clearInterval(timerRef.current);
    return new Promise((resolve) => {
      if (skippable) skipRef.current = resolve;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        setter(remaining);
        if (remaining <= 0) {
          clearInterval(timerRef.current);
          if (skippable) skipRef.current = null;
          resolve();
        }
      }, 1000);
    });
  }

  // ── Upload all pending recordings ─────────────────────────────────────────
  async function uploadAllRecordings() {
    const pendingScreen = allScreenRecordersRef.current.filter(
      (r) => r._blob && r.uploadStatus !== "done",
    );
    const pendingCamera = allCameraRecordersRef.current.filter(
      (r) => r._blob && r.uploadStatus !== "done",
    );
    const total = pendingScreen.length + pendingCamera.length;
    if (!total) return;
    setPendingUploads(total);

    await Promise.allSettled([
      ...pendingScreen.map(async (rec) => {
        const label =
          uploadLabelsRef.current[rec.questionIndex] ||
          `Q${rec.questionIndex + 1}`;
        setUploadStatus((s) => ({
          ...s,
          [rec.questionIndex]: { status: "uploading", label },
        }));
        await rec.upload();
        setUploadStatus((s) => ({
          ...s,
          [rec.questionIndex]: { status: rec.uploadStatus, label },
        }));
        setPendingUploads((n) => Math.max(0, n - 1));
      }),
      ...pendingCamera.map(async (rec) => {
        await rec.upload();
        setPendingUploads((n) => Math.max(0, n - 1));
      }),
    ]);
  }

  // ── Interview flow ────────────────────────────────────────────────────────
  async function runInterviewFlow(rawSections) {
    if (abortRef.current) return;
    const sections = [...rawSections].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    );
    elapsedTimerRef.current = setInterval(
      () => setElapsedTime((p) => p + 1),
      1000,
    );
    recognizerRef.current = new SpeechRecognizer();
    startChromePing();
    setTotalSections(sections.length);

    try {
      setPhase("greeting");
      setCurrentSpeakingQuestion("");
      await speak(
        `Hello ${interview.candidate_name}. Welcome to your ${interview.job_title} interview. ` +
          `I am your AI Interviewer. We have ${sections.length} section${sections.length > 1 ? "s" : ""} today. Let us begin.`,
      );
      if (abortRef.current) return;

      for (let si = 0; si < sections.length; si++) {
        if (abortRef.current) return;
        const section = sections[si];
        const questions = section.questions || [];
        const secondsPerQ = section.seconds_per_question || 40;

        setCurrentSectionIdx(si);
        setCurrentSectionLabel(section.type);
        setPhase("gap");
        setCurrentSpeakingQuestion("");

        // Reset per-section recording index at the start of EACH section
        sectionRecQIdxRef.current = 0;

        await speak(
          `Starting section ${si + 1}: ${section.type}. ${questions.length} question${questions.length > 1 ? "s" : ""}.`,
        );
        if (abortRef.current) return;

        qaBySection.current[section.id] = [];
        let sectionQCounter = 0;

        for (let qi = 0; qi < questions.length; qi++) {
          if (abortRef.current) return;

          const globalIdx = globalQIdxRef.current;
          const sectionRecIdx = sectionRecQIdxRef.current;
          const label = `S${si + 1}·Q${sectionQCounter + 1}`;
          uploadLabelsRef.current[globalIdx] = label;

          setPhase("gap");
          setCurrentQIdx(qi);
          setCurrentSpeakingQuestion("");

          // PRIMARY: Screen recorder
          const recorder = new QuestionRecorder(
            screenRecordStreamRef.current,
            interview.id,
            section.id,
            sectionRecIdx,
          );
          currentRecorderRef.current = recorder;
          allScreenRecordersRef.current.push(recorder);

          // SECONDARY: Camera recorder
          const camStream = canvasStreamRef.current
            ? new MediaStream([
                ...canvasStreamRef.current.getVideoTracks(),
                ...(cameraStreamRef.current?.getAudioTracks() || []),
              ])
            : cameraStreamRef.current;
          const cameraRec = new CameraRecorder(
            camStream,
            interview.id,
            section.id,
            sectionRecIdx,
          );
          currentCameraRecorderRef.current = cameraRec;
          allCameraRecordersRef.current.push(cameraRec);

          // Prefetch presigned URLs + gap countdown in parallel
          await Promise.all([
            recorder.prefetch(),
            cameraRec.prefetch(),
            startCountdown(5, setGapTimer, gapTimerRef),
          ]);
          if (abortRef.current) return;

          setPhase("speaking");
          setCurrentSpeakingQuestion(questions[qi]);
          await new Promise((resolve) => {
            speakSkipRef.current = () => {
              window.speechSynthesis.cancel();
              resolve();
            };
            speak(`Question ${qi + 1}. ${questions[qi]}`).then(resolve);
          });
          speakSkipRef.current = null;
          if (abortRef.current) return;
          await wait(400);

          frozenTranscriptRef.current = "";
          setLiveTranscript("");
          setPhase("answering");
          setQuestionTimer(secondsPerQ);
          recorder.start();
          cameraRec.start();
          recognizerRef.current.start((t) => setLiveTranscript(t));

          await startCountdown(
            secondsPerQ,
            setQuestionTimer,
            questionTimerRef,
            true,
          );

          const answer = recognizerRef.current.stop() || "[No answer provided]";
          frozenTranscriptRef.current = answer;

          if (abortRef.current) {
            await Promise.all([recorder.stop(), cameraRec.stop()]);
            break;
          }

          await Promise.all([recorder.stop(), cameraRec.stop()]);
          setLiveTranscript("");
          setCurrentSpeakingQuestion("");

          // Upload primary (tracked in UI)
          setUploadStatus((s) => ({
            ...s,
            [globalIdx]: { status: "uploading", label },
          }));
          recorder
            .upload()
            .then(() =>
              setUploadStatus((s) => ({
                ...s,
                [globalIdx]: { status: recorder.uploadStatus, label },
              })),
            );
          // Upload secondary (silent)
          cameraRec.upload();

          qaBySection.current[section.id].push({
            question: questions[qi],
            answer,
          });
          globalQIdxRef.current += 1;
          sectionRecQIdxRef.current += 1;
          sectionQCounter += 1;

          // FOLLOW-UP
          if (section.is_follow_up && !abortRef.current) {
            try {
              const fuData = await generateFollowUpQuestion(
                interview.id,
                section.id,
                questions[qi],
                answer,
              );
              const fuQuestion = fuData?.follow_up;
              if (fuQuestion && !abortRef.current) {
                setPhase("gap");
                setCurrentSpeakingQuestion("");
                await startCountdown(3, setGapTimer, gapTimerRef);
                if (abortRef.current) break;

                const fuGlobalIdx = globalQIdxRef.current;
                const fuSectionRecIdx = sectionRecQIdxRef.current;
                const fuLabel = `S${si + 1}·Q${sectionQCounter}f`;
                uploadLabelsRef.current[fuGlobalIdx] = fuLabel;

                const fuRecorder = new QuestionRecorder(
                  screenRecordStreamRef.current,
                  interview.id,
                  section.id,
                  fuSectionRecIdx,
                );
                currentRecorderRef.current = fuRecorder;
                allScreenRecordersRef.current.push(fuRecorder);

                const fuCamStream = canvasStreamRef.current
                  ? new MediaStream([
                      ...canvasStreamRef.current.getVideoTracks(),
                      ...(cameraStreamRef.current?.getAudioTracks() || []),
                    ])
                  : cameraStreamRef.current;
                const fuCameraRec = new CameraRecorder(
                  fuCamStream,
                  interview.id,
                  section.id,
                  fuSectionRecIdx,
                );
                currentCameraRecorderRef.current = fuCameraRec;
                allCameraRecordersRef.current.push(fuCameraRec);

                await Promise.all([
                  fuRecorder.prefetch(),
                  fuCameraRec.prefetch(),
                ]);

                setPhase("speaking");
                setCurrentSpeakingQuestion(fuQuestion);
                await new Promise((resolve) => {
                  speakSkipRef.current = () => {
                    window.speechSynthesis.cancel();
                    resolve();
                  };
                  speak(`Follow-up question. ${fuQuestion}`).then(resolve);
                });
                speakSkipRef.current = null;
                if (abortRef.current) break;
                await wait(400);

                frozenTranscriptRef.current = "";
                setLiveTranscript("");
                setPhase("answering");
                setQuestionTimer(secondsPerQ);
                fuRecorder.start();
                fuCameraRec.start();
                recognizerRef.current.start((t) => setLiveTranscript(t));

                await startCountdown(
                  secondsPerQ,
                  setQuestionTimer,
                  questionTimerRef,
                  true,
                );
                const fuAnswer =
                  recognizerRef.current.stop() || "[No answer provided]";
                frozenTranscriptRef.current = fuAnswer;
                if (abortRef.current) {
                  await Promise.all([fuRecorder.stop(), fuCameraRec.stop()]);
                  break;
                }

                await Promise.all([fuRecorder.stop(), fuCameraRec.stop()]);

                setUploadStatus((s) => ({
                  ...s,
                  [fuGlobalIdx]: { status: "uploading", label: fuLabel },
                }));
                fuRecorder
                  .upload()
                  .then(() =>
                    setUploadStatus((s) => ({
                      ...s,
                      [fuGlobalIdx]: {
                        status: fuRecorder.uploadStatus,
                        label: fuLabel,
                      },
                    })),
                  );
                fuCameraRec.upload();

                setLiveTranscript("");
                setCurrentSpeakingQuestion("");
                qaBySection.current[section.id].push({
                  question: fuQuestion,
                  answer: fuAnswer,
                });
                globalQIdxRef.current += 1;
                sectionRecQIdxRef.current += 1;
                sectionQCounter += 1;
              }
            } catch (err) {
              console.warn("Follow-up skipped:", err);
            }
          }

          if (qi < questions.length - 1) {
            setPhase("break");
            await startCountdown(5, setBreakTimer, breakTimerRef);
            if (abortRef.current) return;
          }
        }

        if (!abortRef.current && qaBySection.current[section.id]?.length > 0) {
          try {
            await evaluateSectionAnswers(
              interview.id,
              section.id,
              qaBySection.current[section.id],
            );
          } catch (err) {
            console.error("Section evaluation failed:", err);
          }
        }

        if (si < sections.length - 1 && !abortRef.current) {
          setPhase("break");
          await speak(`Section ${si + 1} complete. Taking a short break.`);
          await startCountdown(5, setBreakTimer, breakTimerRef);
        }
      }

      await doFinish({ malpractice: false });
    } catch (err) {
      console.error("Flow error:", err);
      toast.error("An error occurred during the interview");
      await doFinish({ malpractice: false });
    }
  }

  async function doFinish({ malpractice = false } = {}) {
    if (evaluateCalledRef.current) return;
    evaluateCalledRef.current = true;
    abortRef.current = true;
    clearAllTimers();
    stopChromePing();
    clearInterval(networkMonitorRef.current);
    window.speechSynthesis?.cancel();
    recognizerRef.current?.destroy();
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    currentRecorderRef.current?.stop();
    currentCameraRecorderRef.current?.stop();
    setPhase("evaluating");
    await uploadAllRecordings();
    await safeExitFullscreen();
    if (malpractice) {
      toast.error("Interview terminated due to malpractice.");
      await wait(3000);
    } else {
      toast.success("Interview completed!");
    }
    navigate(`/candidate/interview-result/${interview.id}`, {
      state: { tabSwitches: tabSwitchCountRef.current, malpractice },
    });
  }

  const handleEndInterview = async () => {
    if (evaluateCalledRef.current) return;
    abortRef.current = true;
    clearAllTimers();
    if (phase === "answering") {
      const recorder = currentRecorderRef.current;
      const cameraRecorder = currentCameraRecorderRef.current;
      if (recorder) await recorder.stop();
      if (cameraRecorder) await cameraRecorder.stop();
      const partial =
        frozenTranscriptRef.current ||
        recognizerRef.current?.currentTranscript ||
        "[No answer provided]";
      const sections = interview.sections || [];
      if (currentSectionIdx < sections.length) {
        const sec = sections[currentSectionIdx];
        const qs = sec.questions || [];
        if (
          currentQIdx < qs.length &&
          !qaBySection.current[sec.id]?.some(
            (qa) => qa.question === qs[currentQIdx],
          )
        ) {
          if (!qaBySection.current[sec.id]) qaBySection.current[sec.id] = [];
          qaBySection.current[sec.id].push({
            question: qs[currentQIdx],
            answer: partial,
          });
        }
      }
    }
    doFinish({ malpractice: false });
  };

  // ── Start interview ───────────────────────────────────────────────────────
  const handleStartInterview = async () => {
    if (starting) return;
    setStarting(true);

    setCheckingSpeed(true);
    const speed = await measureDownloadSpeed();
    setNetworkSpeed(speed);
    const quality = getNetworkQuality(speed);
    setNetworkQuality(quality);
    setCheckingSpeed(false);

    if (quality === "offline") {
      toast.error(
        "No internet connection detected. Please check your network and try again.",
      );
      setStarting(false);
      return;
    }
    if (quality === "poor") {
      toast.error(
        "Your internet speed is too low for a video interview. Please improve your connection and try again.",
      );
      setStarting(false);
      return;
    }

    let camStream;
    try {
      camStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      cameraStreamRef.current = camStream;
      setCandidateStream(camStream);
    } catch {
      toast.error(
        "Camera/microphone access denied. Please allow and try again.",
      );
      setStarting(false);
      return;
    }

    let screenStream;
    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "monitor",
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 15 },
        },
        audio: false,
      });
      screenStreamRef.current = screenStream;
    } catch {
      toast.error(
        "Screen sharing is required. Please allow screen share and try again.",
      );
      camStream.getTracks().forEach((t) => t.stop());
      setStarting(false);
      return;
    }

    screenRecordStreamRef.current = new MediaStream([
      ...screenStream.getVideoTracks(),
      ...camStream.getAudioTracks(),
    ]);

    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      if (!evaluateCalledRef.current) {
        toast.error("Screen sharing stopped — interview ended.");
        doFinish({ malpractice: false });
      }
    });

    try {
      await enterFullscreen();
    } catch (_) {}

    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      await ac.resume();
      ac.close();
    } catch (_) {}
    await new Promise((resolve) => {
      const primer = new SpeechSynthesisUtterance(".");
      primer.volume = 0.01;
      primer.rate = 2.0;
      primer.onend = resolve;
      primer.onerror = resolve;
      setTimeout(resolve, 1000);
      window.speechSynthesis.speak(primer);
    });
    await wait(300);

    const sections = interview.sections || [];
    if (!sections.length) {
      toast.error("No sections configured for this interview");
      setStarting(false);
      return;
    }

    try {
      const sectionsWithQuestions = await Promise.all(
        sections.map(async (s) => {
          try {
            const data = await getSectionQuestions(interview.id, s.id);
            return { ...s, questions: data.questions || [] };
          } catch {
            return { ...s, questions: [] };
          }
        }),
      );
      if (!sectionsWithQuestions.some((s) => s.questions.length > 0)) {
        toast.error("No questions available for this interview");
        setStarting(false);
        return;
      }
      setInterviewStarted(true);
      abortRef.current = false;
      await wait(150);
      runInterviewFlow(sectionsWithQuestions);
    } catch (err) {
      toast.error(err.message || "Failed to start interview");
      setStarting(false);
    }
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)
      .toString()
      .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Network quality badge ─────────────────────────────────────────────────
  const NetworkBadge = () => {
    const labels = {
      good: "Good",
      fair: "Fair",
      poor: "Weak",
      offline: "Offline",
      unknown: "Checking…",
    };
    const colors = {
      good: "bg-emerald-900/60 text-emerald-300 border-emerald-700/50",
      fair: "bg-yellow-900/60 text-yellow-300 border-yellow-700/50",
      poor: "bg-red-900/80 text-red-300 border-red-700/50 animate-pulse",
      offline: "bg-red-900/90 text-red-200 border-red-600 animate-pulse",
      unknown: "bg-gray-800 text-gray-400 border-gray-600",
    };
    return (
      <div
        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${colors[networkQuality] || colors.unknown}`}
      >
        <NetworkIcon quality={networkQuality} className="w-3 h-3" />
        {networkQuality === "offline"
          ? "No Network — Ending…"
          : labels[networkQuality] || "…"}
        {networkSpeed !== null && networkQuality !== "offline" && (
          <span className="opacity-60 ml-0.5">
            {networkSpeed.toFixed(1)}Mbps
          </span>
        )}
      </div>
    );
  };

  // ── Render: extension loading ─────────────────────────────────────────────
  if (!extCheckDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-emerald-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg font-medium">
            Checking browser environment…
          </p>
          <p className="text-emerald-300 text-sm mt-1">
            Scanning for extensions
          </p>
        </div>
      </div>
    );
  }

  // ── Render: extension block ───────────────────────────────────────────────
  if (!extPassed) {
    return (
      <CandidateExtensionBlockScreen
        extensions={extResult.extensions}
        runtimeDetected={extResult.runtimeDetected}
        onProceed={() => setExtPassed(true)}
        onRecheck={() => {
          setExtCheckDone(false);
          setTimeout(() => {
            const result = detectBrowserExtensions();
            setExtResult(result);
            const passed =
              result.extensions.length === 0 && !result.runtimeDetected;
            setExtPassed(passed);
            setExtCheckDone(true);
          }, 1500);
        }}
      />
    );
  }

  // ── Render: evaluating ────────────────────────────────────────────────────
  if (phase === "evaluating")
    return <CandidateEvaluatingOverlay uploadingCount={pendingUploads} />;

  // ── Render: setup screen ──────────────────────────────────────────────────
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-emerald-900 flex items-center justify-center p-6">
        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-8 py-6">
            <h1 className="text-3xl font-bold mb-2">AI Interview Setup</h1>
            <p className="text-emerald-100">
              Prepare for your interview session
            </p>
          </div>
          <div className="p-8 space-y-6">
            {/* Candidate info */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  {interview?.candidate_name
                    ?.split(" ")
                    .map((n) => n[0])
                    .join("") || "C"}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">
                    {interview?.candidate_name}
                  </h2>
                  <p className="text-gray-600 mb-3">{interview?.job_title}</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700">
                      {interview?.interview_type}
                    </span>
                    {interview?.duration && (
                      <span className="px-3 py-1 bg-white rounded-full text-sm font-medium text-gray-700">
                        {interview.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sections */}
            {interview?.sections?.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3">
                  Interview Sections
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {[...interview.sections]
                    .sort((a, b) =>
                      a.type === "introduction"
                        ? -1
                        : b.type === "introduction"
                          ? 1
                          : 0,
                    )
                    .map((s, i) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">
                            {i + 1}
                          </span>
                          <span className="font-medium text-gray-900 capitalize">
                            {s.type}
                          </span>
                          {s.type === "introduction" && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">
                              First
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                          <span>
                            {s.is_follow_up
                              ? s.no_of_questions * 2
                              : s.no_of_questions}{" "}
                            questions
                          </span>
                          <span>·</span>
                          <span>{s.seconds_per_question || 40}s/question</span>
                          {s.is_follow_up && (
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              includes follow-ups
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Setup checklist */}
            <div>
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-600" />
                Check Your Setup
              </h3>
              <div className="space-y-3">
                {[
                  {
                    icon: Monitor,
                    label: "Screen Share",
                    sub: "Full screen recorded per-question (primary)",
                  },
                  {
                    icon: Video,
                    label: "Camera",
                    sub: "Recorded as silent proctor backup",
                  },
                  {
                    icon: Mic,
                    label: "Microphone",
                    sub: "Audio captured alongside screen recording",
                  },
                  { icon: Volume2, label: "Speaker", sub: "System Audio" },
                ].map(({ icon: Icon, label, sub }) => (
                  <div
                    key={label}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="font-medium text-gray-900">{label}</p>
                        <p className="text-sm text-gray-600">{sub}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}

                {/* Internet speed check */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Wifi className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Internet Speed
                      </p>
                      <p className="text-sm text-gray-600">
                        {checkingSpeed
                          ? "Checking speed…"
                          : networkQuality === "unknown"
                            ? "Will be checked on start"
                            : networkQuality === "good"
                              ? `Good — ${networkSpeed?.toFixed(1) || "?"}Mbps`
                              : networkQuality === "fair"
                                ? `Fair — ${networkSpeed?.toFixed(1) || "?"}Mbps`
                                : networkQuality === "poor"
                                  ? `Weak — ${networkSpeed?.toFixed(1) || "?"}Mbps (may cause issues)`
                                  : "No connection detected"}
                      </p>
                    </div>
                  </div>
                  {checkingSpeed ? (
                    <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  ) : networkQuality === "good" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : networkQuality === "fair" ? (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  ) : networkQuality === "poor" ||
                    networkQuality === "offline" ? (
                    <WifiOff className="w-5 h-5 text-red-500" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>

                {/* Background picker */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Virtual Background
                      </p>
                      <p className="text-sm text-gray-600">
                        {bgMode === "none"
                          ? "No background effect"
                          : bgMode === "blur"
                            ? "Background blurred"
                            : "Custom background image"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowBgPicker((v) => !v)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
                  >
                    Change
                  </button>
                </div>
                {showBgPicker && (
                  <CandidateBackgroundPicker
                    inline
                    current={bgMode}
                    onChange={(val) => {
                      setBgMode(val);
                      setShowBgPicker(false);
                    }}
                    onClose={() => setShowBgPicker(false)}
                  />
                )}
              </div>
            </div>

            {/* Poor network warning */}
            {(networkQuality === "poor" || networkQuality === "offline") && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">
                  <strong>Poor or no internet connection detected.</strong> You
                  need a stable connection of at least 1 Mbps to attend this
                  interview. Please improve your network before proceeding.
                </p>
              </div>
            )}

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800 font-medium">
                Browser environment verified — no extensions detected
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold mb-1">Proctoring Active</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs mt-2">
                    <li>
                      Your camera feed is visible to you on the right panel
                      during the interview
                    </li>
                    <li>
                      Your{" "}
                      <strong>entire screen is recorded per-question</strong>{" "}
                      (with mic audio) and securely uploaded
                    </li>
                    <li>
                      Your <strong>camera is also recorded per-question</strong>{" "}
                      as a silent proctor backup
                    </li>
                    <li>The interview runs in full-screen mode</li>
                    <li>
                      <strong>1st tab switch</strong> = warning ·{" "}
                      <strong>2nd tab switch</strong> = immediate
                      disqualification
                    </li>
                    <li>
                      Internet connection is monitored throughout — loss of
                      network will end the interview
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-900">
                <strong>Important:</strong> When prompted, select{" "}
                <strong>"Entire Screen"</strong> — not a window or tab.
              </p>
            </div>

            <button
              onClick={handleStartInterview}
              disabled={
                starting ||
                networkQuality === "offline" ||
                networkQuality === "poor"
              }
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-bold text-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {starting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Setting up…
                </>
              ) : checkingSpeed ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking connection…
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Interview
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: live interview ────────────────────────────────────────────────
  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col overflow-hidden">
      {showMalpracticeWarning && !showMalpracticeTerminated && (
        <CandidateMalpracticeWarning
          onDismiss={() => setShowMalpracticeWarning(false)}
        />
      )}
      {showMalpracticeTerminated && <CandidateMalpracticeTerminated />}

      {/* Top bar */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-white font-medium text-sm">
              Live Interview
            </span>
          </div>
          <div className="h-5 w-px bg-gray-600" />
          <div className="flex items-center gap-2 text-white">
            <Clock className="w-4 h-4" />
            <span className="font-mono text-sm">{formatTime(elapsedTime)}</span>
          </div>
          <div className="h-5 w-px bg-gray-600" />
          <span className="text-xs text-gray-400 capitalize">
            Section {currentSectionIdx + 1}/{totalSections}:{" "}
            {currentSectionLabel}
          </span>
          <div className="h-5 w-px bg-gray-600" />
          <span className="text-sm text-white">
            {isGreeting && (
              <span className="text-emerald-300">Introduction</span>
            )}
            {isGap && (
              <span className="text-yellow-300">
                Preparing Q{currentQIdx + 1}… {gapTimer}s
              </span>
            )}
            {isSpeaking && (
              <span className="text-blue-300">Reading Q{currentQIdx + 1}</span>
            )}
            {isAnswering && (
              <span className="font-semibold">
                Q<span className="text-emerald-400">{currentQIdx + 1}</span>
              </span>
            )}
            {isBreak && (
              <span className="text-amber-300">Break — {breakTimer}s</span>
            )}
          </span>

          {Object.entries(uploadStatus).map(([qIdx, entry]) => {
            const st = typeof entry === "object" ? entry.status : entry;
            const label =
              typeof entry === "object" ? entry.label : `Q${Number(qIdx) + 1}`;
            return (
              <div
                key={qIdx}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                  st === "uploading"
                    ? "bg-blue-900 text-blue-300"
                    : st === "done"
                      ? "bg-emerald-900 text-emerald-300"
                      : "bg-red-900 text-red-300"
                }`}
              >
                {st === "uploading" && (
                  <Upload className="w-3 h-3 animate-bounce" />
                )}
                {st === "done" && <CheckCircle className="w-3 h-3" />}
                {st === "failed" && <CloudOff className="w-3 h-3" />}
                {label}
              </div>
            );
          })}

          {tabSwitchCount > 0 && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                tabSwitchCount >= 2
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-yellow-900 text-yellow-300"
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              {tabSwitchCount} switch{tabSwitchCount > 1 ? "es" : ""}
              {tabSwitchCount >= 2 && " — MALPRACTICE"}
            </div>
          )}

          <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-900/60 text-red-300 border border-red-700/50">
            <Monitor className="w-3 h-3 text-red-400" />
            <span className="text-red-400">REC</span> Screen+Audio
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NetworkBadge />
          <button
            onClick={handleEndInterview}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 text-sm transition-colors"
          >
            <PhoneOff className="w-4 h-4" />
            End Interview
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* AI Avatar panel */}
        <div className="flex-1 bg-gradient-to-br from-emerald-900 to-teal-900 flex flex-col items-center justify-center relative overflow-hidden">
          <CandidatePatrickAvatar isTalking={avatarTalking} />
          <h2 className="text-3xl font-bold text-white mt-5 mb-2">
            AI Interviewer
          </h2>

          <div className="text-center px-8 mt-1">
            {isGreeting && (
              <p className="text-emerald-200 text-base animate-pulse">
                👋 Welcoming you…
              </p>
            )}
            {isGap && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-emerald-200 text-sm">
                  Preparing next question in
                </p>
                <p className="text-5xl font-bold text-emerald-400 font-mono">
                  {gapTimer}
                </p>
              </div>
            )}
            {isSpeaking && (
              <p className="text-blue-200 text-base animate-pulse">
                🔊 Reading question aloud…
              </p>
            )}
            {isAnswering && (
              <p className="text-emerald-200 text-base animate-pulse flex items-center gap-2 justify-center">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
                Recording your answer…
              </p>
            )}
            {isBreak && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-emerald-200 text-sm">Next in</p>
                <p className="text-5xl font-bold text-emerald-400 font-mono">
                  {breakTimer}
                </p>
              </div>
            )}
          </div>

          {showQuestion && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-6">
              <div className="max-w-3xl mx-auto bg-gray-900/95 backdrop-blur-sm rounded-xl p-5 border border-gray-600 shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <HelpCircle className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-2">
                      Question {currentQIdx + 1}
                      {isSpeaking && (
                        <span className="ml-2 text-blue-400 animate-pulse">
                          🔊 Reading aloud…
                        </span>
                      )}
                      {isAnswering && (
                        <span className="ml-2 text-red-400 inline-flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                          Recording
                        </span>
                      )}
                    </p>
                    <p className="text-base text-white leading-relaxed">
                      {currentSpeakingQuestion}
                    </p>
                    {(isSpeaking || isAnswering) && (
                      <div className="mt-3 flex items-center gap-3">
                        {isAnswering && (
                          <>
                            <Clock
                              className={`w-4 h-4 ${questionTimer <= 10 ? "text-red-400" : "text-emerald-400"}`}
                            />
                            <span
                              className={`font-mono font-bold text-xl ${questionTimer <= 10 ? "text-red-400" : "text-emerald-400"}`}
                            >
                              {questionTimer}s
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-1000 ${questionTimer <= 10 ? "bg-red-500" : "bg-emerald-500"}`}
                                style={{
                                  width: `${(questionTimer / (interview?.sections?.[currentSectionIdx]?.seconds_per_question || 40)) * 100}%`,
                                }}
                              />
                            </div>
                          </>
                        )}
                        {isSpeaking && <div className="flex-1" />}
                        <button
                          onClick={() => {
                            if (isSpeaking) {
                              if (speakSkipRef.current) {
                                speakSkipRef.current();
                                speakSkipRef.current = null;
                              }
                            } else if (isAnswering) {
                              frozenTranscriptRef.current =
                                recognizerRef.current?.currentTranscript || "";
                              clearInterval(questionTimerRef.current);
                              setQuestionTimer(0);
                              if (skipRef.current) {
                                skipRef.current();
                                skipRef.current = null;
                              }
                            }
                          }}
                          className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          {isSpeaking ? "Skip Reading →" : "Next →"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isBreak && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <div className="bg-gray-900 rounded-2xl p-10 text-center border border-gray-700 shadow-2xl">
                <Clock className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-white mb-2">Next In</h3>
                <p className="text-7xl font-bold text-emerald-500 font-mono">
                  {breakTimer}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — candidate camera */}
        <div className="w-[40%] bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="relative flex-1 overflow-hidden">
            <CandidateVideo
              stream={candidateStream}
              videoOff={false}
              candidateName={interview?.candidate_name}
              blurBackground={bgMode === "blur"}
              backgroundImage={
                bgMode !== "none" && bgMode !== "blur" ? bgMode : undefined
              }
              onCanvasStream={(canvasStream) => {
                canvasStreamRef.current = canvasStream;
              }}
            />

            {isAnswering && (
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-red-600/90 text-white px-2 py-1 rounded text-xs font-semibold">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                REC
              </div>
            )}
            {isAnswering && (
              <div className="absolute top-3 left-3 z-10 bg-emerald-600/90 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
                <Mic className="w-3 h-3" />
                <span className="animate-pulse">Listening</span>
              </div>
            )}

            <div className="absolute bottom-12 left-0 right-0 z-10 px-3">
              <div className="bg-black/60 rounded-lg px-3 py-1.5 flex items-center justify-between">
                <p className="text-white text-sm font-medium">
                  {interview?.candidate_name || "You"}
                </p>
                {tabSwitchCount > 0 && (
                  <span
                    className={`flex items-center gap-1 text-xs ${tabSwitchCount >= 2 ? "text-red-400 font-bold" : "text-yellow-400"}`}
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {tabSwitchCount} switch{tabSwitchCount > 1 ? "es" : ""}
                  </span>
                )}
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-3">
              <button
                onClick={() => setShowBgPicker((v) => !v)}
                title="Virtual background"
                className={`p-3 rounded-full transition-colors shadow-lg ${
                  bgMode !== "none"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                <span className="text-white text-[10px] font-semibold leading-none">
                  BG
                </span>
              </button>
              {showBgPicker && (
                <CandidateBackgroundPicker
                  current={bgMode}
                  onChange={(val) => {
                    setBgMode(val);
                    setShowBgPicker(false);
                  }}
                  onClose={() => setShowBgPicker(false)}
                />
              )}
            </div>
          </div>

          {/* Live transcript */}
          <div className="p-4 border-t border-gray-700 max-h-44 overflow-y-auto bg-gray-900 flex-shrink-0">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Your Answer (Live)
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {liveTranscript ||
                (isAnswering
                  ? "🎙 Speak now…"
                  : "Transcript will appear here when you answer.")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { classify, guide, measure, type FaceShape } from "@/lib/face-shape";
import { cn } from "@/lib/utils";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const STABLE_FRAMES = 18;

export function FaceCamera({ onResult }: { onResult: (shape: FaceShape) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [message, setMessage] = useState("Starting camera…");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okCount, setOkCount] = useState(0);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    let landmarker: { detectForVideo: (v: HTMLVideoElement, t: number) => { faceLandmarks: { x: number; y: number }[][] }; close: () => void } | null = null;
    const probe = document.createElement("canvas");
    probe.width = 32; probe.height = 32;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    let stable = 0;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
        const v = videoRef.current!;
        v.srcObject = stream;
        await v.play();
        setMessage("Loading face guide…");
        const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
        const files = await FilesetResolver.forVisionTasks(WASM);
        landmarker = (await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: MODEL, delegate: "GPU" },
          runningMode: "VIDEO",
          numFaces: 1,
        })) as unknown as typeof landmarker;
        if (stopped) return;
        setReady(true);
        let last = -1;
        const loop = () => {
          if (stopped || !landmarker) return;
          if (v.currentTime !== last && v.videoWidth) {
            last = v.currentTime;
            const res = landmarker.detectForVideo(v, performance.now());
            const lm = res.faceLandmarks?.[0];
            if (!lm) {
              stable = 0;
              setMessage("Look at the camera — no face found");
            } else {
              pctx?.drawImage(v, 0, 0, 32, 32);
              const d = pctx?.getImageData(0, 0, 32, 32).data;
              let sum = 0;
              if (d) for (let i = 0; i < d.length; i += 4) sum += 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
              const brightness = d ? sum / (d.length / 4) : 128;
              const g = guide(lm, brightness);
              setMessage(g.message);
              stable = g.ok ? stable + 1 : 0;
              if (stable >= STABLE_FRAMES) {
                const shape = classify(measure(lm, v.videoWidth, v.videoHeight));
                stopped = true;
                onResult(shape);
                return;
              }
            }
            setOkCount(stable);
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error(e);
        setError(
          e instanceof DOMException && e.name === "NotAllowedError"
            ? "Camera access was blocked. Allow camera access in your browser settings and try again."
            : "We couldn't start the camera on this device.",
        );
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
    };
  }, [onResult]);

  if (error) {
    return <div className="rounded-lg border border-destructive/40 p-6 text-center text-sm text-destructive">{error}</div>;
  }

  const progress = Math.min(1, okCount / STABLE_FRAMES);
  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card">
        <video ref={videoRef} playsInline muted className="h-full w-full -scale-x-100 object-cover" />
        <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none">
          <defs>
            <mask id="oval-mask">
              <rect width="300" height="400" fill="white" />
              <ellipse cx="150" cy="195" rx="95" ry="130" fill="black" />
            </mask>
          </defs>
          <rect width="300" height="400" className="fill-background/60" mask="url(#oval-mask)" />
          <ellipse cx="150" cy="195" rx="95" ry="130" fill="none" strokeWidth="3"
            className={cn("transition-colors", progress > 0 ? "stroke-gold" : "stroke-foreground/50")}
            strokeDasharray={progress > 0 ? undefined : "8 8"} />
        </svg>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="rounded-lg border border-border bg-background/90 px-4 py-2.5 text-center text-sm font-semibold text-foreground" aria-live="polite">
            {message}
          </p>
          {ready && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
              <div className="h-full bg-gold transition-all" style={{ width: `${progress * 100}%` }} />
            </div>
          )}
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground">🔒 Your photo stays on your phone. Nothing is uploaded or saved.</p>
    </div>
  );
}

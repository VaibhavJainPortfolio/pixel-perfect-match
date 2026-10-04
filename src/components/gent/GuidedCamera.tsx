import { useEffect, useRef, useState } from "react";
import { Camera, ImageUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Slot } from "@/lib/capture-slots";
import {
  bodyMetrics, canvasToJpeg, faceMetrics, faceYaw, luminance, sharpness, toCanvas, wristMetrics, type Pt,
} from "@/lib/vision-metrics";
import { GoldButton, GhostButton } from "./buttons";

const WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const FACE_MODEL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const POSE_MODEL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const STABLE = 15;

export type Captured = { blob: Blob; landmarks: Record<string, unknown>; width: number; height: number; preview: string };

type Detector = { detectForVideo: (src: any, t: number) => any; close: () => void };
let filesPromise: Promise<any> | null = null;
const cache: { face?: Promise<Detector>; pose?: Promise<Detector> } = {};

async function getDetector(kind: "face" | "pose"): Promise<Detector> {
  const v = await import("@mediapipe/tasks-vision");
  filesPromise ??= v.FilesetResolver.forVisionTasks(WASM);
  const files = await filesPromise;
  if (kind === "face") {
    cache.face ??= v.FaceLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: FACE_MODEL, delegate: "GPU" }, runningMode: "VIDEO", numFaces: 2 }) as any;
    return cache.face!;
  }
  cache.pose ??= v.PoseLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: POSE_MODEL, delegate: "GPU" }, runningMode: "VIDEO", numPoses: 2, outputSegmentationMasks: true }) as any;
  return cache.pose!;
}

let ts = 0;
const nextTs = () => (ts = Math.max(ts + 1, performance.now()));

function readMask(res: any) {
  const m = res?.segmentationMasks?.[0];
  if (!m) return null;
  const out = { data: m.getAsFloat32Array().slice(), width: m.width, height: m.height };
  res.segmentationMasks.forEach((x: any) => x.close?.());
  return out;
}

async function measureCanvas(slot: Slot, c: HTMLCanvasElement): Promise<Record<string, unknown>> {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const base = { width: c.width, height: c.height, brightness: +luminance(ctx, c.width, c.height).toFixed(1) };
  try {
    if (slot.kind === "face") {
      const det = await getDetector("face");
      const lm = det.detectForVideo(c, nextTs()).faceLandmarks?.[0] as Pt[] | undefined;
      if (!lm) return { ...base, kind: "face", detected: false };
      const extra = slot.id === "face_front" ? { eyewear_mm: eyewearMetrics(lm, c.width, c.height) } : {};
      return { ...base, kind: "face", ...faceMetrics(lm, ctx, c.width, c.height), ...extra };
    }
    if (slot.kind === "body" || slot.kind === "outfit") {
      const det = await getDetector("pose");
      const res = det.detectForVideo(c, nextTs());
      const lm = res.landmarks?.[0] as Pt[] | undefined;
      const mask = readMask(res);
      if (slot.kind === "outfit") return { ...base, kind: "outfit", detected: !!lm };
      return lm ? { ...base, kind: "body", ...bodyMetrics(lm, mask, c.width, c.height) } : { ...base, kind: "body", detected: false };
    }
    return { ...base, kind: "wrist", ...wristMetrics(ctx, c.width, c.height) };
  } catch (e) {
    console.error(e);
    return { ...base, kind: slot.kind, error: "measure_failed" };
  }
}

function guideFace(slot: Slot, faces: Pt[][]): { ok: boolean; msg: string } {
  if (!faces.length) return { ok: false, msg: slot.pose === "left" || slot.pose === "right" ? "Turn slowly — keep your whole head in the frame" : "Look at the camera — no face found" };
  if (faces.length > 1) return { ok: false, msg: "Only one person in the photo, please" };
  const lm = faces[0]!;
  const w = Math.abs(lm[454]!.x - lm[234]!.x);
  const nose = lm[1]!;
  if (nose.x < 0.25 || nose.x > 0.75 || nose.y < 0.25 || nose.y > 0.7) return { ok: false, msg: "Centre your face in the outline" };
  const yaw = Math.abs(faceYaw(lm));
  const profile = slot.pose === "left" || slot.pose === "right";
  if (!profile && w < 0.3) return { ok: false, msg: "Move closer" };
  if (w > 0.75) return { ok: false, msg: "Move back a little" };
  if (slot.pose === "front" && yaw > 0.06) return { ok: false, msg: "Face the camera straight on" };
  if (slot.pose === "45" && yaw < 0.12) return { ok: false, msg: "Turn your head a little more" };
  if (slot.pose === "45" && yaw > 0.32) return { ok: false, msg: "Too far — turn back a little" };
  if (profile && yaw < 0.3) return { ok: false, msg: slot.pose === "left" ? "Turn fully to your left" : "Turn fully to your right" };
  return { ok: true, msg: "Hold still…" };
}

function guideBody(slot: Slot, poses: Pt[][]): { ok: boolean; msg: string } {
  if (!poses.length) return { ok: false, msg: "Step into the frame" };
  if (poses.length > 1) return { ok: false, msg: "Only one person in the photo, please" };
  const lm = poses[0]!;
  const vis = (i: number) => (lm[i]!.visibility ?? 1) > 0.5;
  if (lm[0]!.y < 0.05) return { ok: false, msg: "Step back so your head shows" };
  const ankleY = Math.max(lm[27]!.y, lm[28]!.y);
  if ((!vis(27) && !vis(28)) || ankleY > 0.97) return { ok: false, msg: "Step back so your feet show" };
  const span = ankleY - lm[0]!.y;
  if (span < 0.6) return { ok: false, msg: "Come a little closer" };
  const shoulder = Math.abs(lm[11]!.x - lm[12]!.x) / span;
  if (slot.pose === "body_front" && shoulder < 0.15) return { ok: false, msg: "Face the camera" };
  if (slot.pose === "body_side" && shoulder > 0.08) return { ok: false, msg: "Turn fully sideways" };
  return { ok: true, msg: "Hold still…" };
}

export function GuidedCamera({ slot, onCaptured }: { slot: Slot; onCaptured: (c: Captured) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<() => void>(() => {});
  const [msg, setMsg] = useState("Starting camera…");
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const auto = slot.kind === "face" || slot.kind === "body";
  const mirror = slot.camera === "user";

  const finish = async (c: HTMLCanvasElement) => {
    setBusy(true);
    const landmarks = await measureCanvas(slot, c);
    const blob = await canvasToJpeg(c);
    onCaptured({ blob, landmarks, width: c.width, height: c.height, preview: URL.createObjectURL(blob) });
  };

  useEffect(() => {
    let stream: MediaStream | null = null, raf = 0, stopped = false, stable = 0, last = -1;
    const probe = document.createElement("canvas");
    probe.width = 64; probe.height = 64;
    const pctx = probe.getContext("2d", { willReadFrequently: true })!;
    captureRef.current = () => { const v = videoRef.current; if (v?.videoWidth) { stopped = true; finish(toCanvas(v)); } };

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: slot.camera, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        const v = videoRef.current!;
        v.srcObject = stream; await v.play();
        if (!auto) { setMsg(slot.kind === "wrist" ? "Palm up in daylight, then tap the button" : "Stand head to feet in frame, then tap the button"); return; }
        setMsg("Loading guide…");
        const det = await getDetector(slot.kind === "face" ? "face" : "pose");
        if (stopped) return;
        const loop = () => {
          if (stopped) return;
          if (v.currentTime !== last && v.videoWidth) {
            last = v.currentTime;
            pctx.drawImage(v, 0, 0, 64, 64);
            const bright = luminance(pctx, 64, 64), sharp = sharpness(pctx, 64, 64);
            const res = det.detectForVideo(v, nextTs());
            let g: { ok: boolean; msg: string };
            if (slot.kind === "face") g = guideFace(slot, res.faceLandmarks ?? []);
            else { g = guideBody(slot, res.landmarks ?? []); res.segmentationMasks?.forEach((m: any) => m.close?.()); }
            if (bright < 70) g = { ok: false, msg: "Too dark — find more light" };
            else if (bright > 225) g = { ok: false, msg: "Too bright — move away from direct light" };
            else if (g.ok && sharp < 25) g = { ok: false, msg: "Hold still — it's blurry" };
            setMsg(g.msg);
            stable = g.ok ? stable + 1 : 0;
            setProgress(Math.min(1, stable / STABLE));
            if (stable >= STABLE) { stopped = true; finish(toCanvas(v)); return; }
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.error(e);
        setErr(e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera access was blocked. Allow it in your browser settings, or upload from your gallery."
          : "We couldn't start the camera. You can upload from your gallery instead.");
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((t) => t.stop()); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slot.key]);

  const onFile = async (f?: File) => {
    if (!f || !f.type.startsWith("image/")) return;
    setBusy(true);
    const img = new Image();
    img.src = URL.createObjectURL(f);
    await img.decode();
    finish(toCanvas(img));
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg border border-border bg-card">
        {err ? <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">{err}</div> : (
          <video ref={videoRef} playsInline muted className={cn("h-full w-full object-cover", mirror && "-scale-x-100")} />
        )}
        {!err && <Silhouette pose={slot.pose} kind={slot.kind} active={progress > 0} />}
        {!err && (
          <div className="absolute inset-x-0 bottom-0 p-3">
            <p aria-live="polite" className="rounded-lg border border-border bg-background/90 px-4 py-2.5 text-center text-sm font-semibold text-foreground">{busy ? "Processing…" : msg}</p>
            {auto && <div className="mt-2 h-1 overflow-hidden rounded-full bg-border"><div className="h-full bg-gold transition-all" style={{ width: `${progress * 100}%` }} /></div>}
          </div>
        )}
      </div>
      <div className="flex gap-2">
        {!err && <GoldButton className="flex-1" disabled={busy} onClick={() => captureRef.current()}><Camera />Take photo</GoldButton>}
        <GhostButton className="flex-1" disabled={busy} onClick={() => fileRef.current?.click()}><ImageUp />Upload from gallery</GhostButton>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      </div>
    </div>
  );
}

function Silhouette({ pose, kind, active }: { pose: Slot["pose"]; kind: Slot["kind"]; active: boolean }) {
  const cls = cn("fill-none stroke-[3] transition-colors", active ? "stroke-gold" : "stroke-foreground/60");
  const dash = active ? undefined : "8 8";
  let shape: React.ReactNode;
  if (kind === "face" && (pose === "front" || pose === "45")) shape = <ellipse cx="150" cy="185" rx={pose === "45" ? 85 : 95} ry="125" className={cls} strokeDasharray={dash} />;
  else if (kind === "face") {
    const d = "M175 70 C120 60 85 100 85 160 C85 195 95 215 100 230 L90 255 L105 262 L100 280 C100 300 125 305 150 300 L160 330 L210 330 C215 290 225 250 225 190 C225 120 210 80 175 70 Z";
    shape = <path d={d} className={cls} strokeDasharray={dash} transform={pose === "right" ? "translate(300 0) scale(-1 1)" : undefined} />;
  } else if (kind === "body" && pose === "body_side")
    shape = <path d="M150 30 a22 24 0 1 1 0.1 0 M140 80 L135 85 C125 120 125 170 132 210 L138 260 C140 300 135 340 138 375 L170 375 C168 330 165 290 165 255 L168 210 C175 170 172 115 162 85 Z" className={cls} strokeDasharray={dash} />;
  else if (kind === "body" || kind === "outfit")
    shape = <path d="M150 28 a22 24 0 1 1 0.1 0 M120 82 L180 82 L205 100 L215 200 L200 202 L190 120 L188 210 L182 375 L158 375 L150 240 L142 375 L118 375 L112 210 L110 120 L100 202 L85 200 L95 100 Z" className={cls} strokeDasharray={dash} />;
  else shape = <rect x="70" y="110" width="160" height="200" rx="40" className={cls} strokeDasharray={dash} />;
  return <svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full opacity-80">{shape}</svg>;
}

// Local face-shape classification from MediaPipe FaceLandmarker (468-point mesh).
export type FaceShape = "oval" | "round" | "square" | "oblong" | "heart" | "diamond";
type Pt = { x: number; y: number };

const L = {
  top: 10, chin: 152,
  foreheadL: 54, foreheadR: 284,
  cheekL: 234, cheekR: 454,
  jawL: 172, jawR: 397,
  nose: 1,
};

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);

export type Measurements = { forehead: number; cheek: number; jaw: number; length: number };

/** Landmarks are normalised; pass the frame size so ratios are in real pixels. */
export function measure(lm: Pt[], w: number, h: number): Measurements {
  const p = (i: number) => ({ x: lm[i]!.x * w, y: lm[i]!.y * h });
  return {
    forehead: dist(p(L.foreheadL), p(L.foreheadR)),
    cheek: dist(p(L.cheekL), p(L.cheekR)),
    jaw: dist(p(L.jawL), p(L.jawR)),
    // landmark 10 sits below the hairline; scale up slightly to approximate full length
    length: dist(p(L.top), p(L.chin)) * 1.08,
  };
}

export function classify(m: Measurements): FaceShape {
  const lr = m.length / m.cheek;
  const jr = m.jaw / m.cheek;
  const fr = m.forehead / m.cheek;
  if (lr >= 1.5) return "oblong";
  if (fr < 0.82 && jr < 0.82) return "diamond";
  if (fr - jr > 0.1) return "heart";
  if (lr < 1.25) return jr >= 0.88 ? "square" : "round";
  if (jr >= 0.9) return "square";
  return "oval";
}

export type Guidance = { ok: boolean; message: string };

/** Live positioning hints. Coordinates are normalised (0..1). */
export function guide(lm: Pt[], brightness: number): Guidance {
  const xs = [L.cheekL, L.cheekR].map((i) => lm[i]!.x);
  const faceW = Math.abs(xs[1]! - xs[0]!);
  const cx = (lm[L.cheekL]!.x + lm[L.cheekR]!.x) / 2;
  const cy = (lm[L.top]!.y + lm[L.chin]!.y) / 2;
  const yaw = Math.abs(lm[L.nose]!.x - cx) / faceW;
  if (brightness < 70) return { ok: false, message: "More light, please — face a window" };
  if (faceW < 0.32) return { ok: false, message: "Move closer" };
  if (faceW > 0.7) return { ok: false, message: "Move back a little" };
  if (Math.abs(cx - 0.5) > 0.1 || Math.abs(cy - 0.5) > 0.12) return { ok: false, message: "Centre your face in the oval" };
  if (yaw > 0.08) return { ok: false, message: "Face the camera straight on" };
  return { ok: true, message: "Hold still…" };
}

export const shapeInfo: Record<FaceShape, { label: string; blurb: string; path: string }> = {
  oval: { label: "Oval", blurb: "Balanced proportions, slightly longer than wide.", path: "M50 6 C78 6 88 32 86 58 C84 86 68 114 50 114 C32 114 16 86 14 58 C12 32 22 6 50 6Z" },
  round: { label: "Round", blurb: "Width and length are similar, with soft curves.", path: "M50 12 C80 12 90 40 90 62 C90 88 72 110 50 110 C28 110 10 88 10 62 C10 40 20 12 50 12Z" },
  square: { label: "Square", blurb: "Strong, wide jaw with a similar forehead width.", path: "M18 12 L82 12 C86 12 88 16 88 20 L88 92 C88 104 76 112 64 112 L36 112 C24 112 12 104 12 92 L12 20 C12 16 14 12 18 12Z" },
  oblong: { label: "Oblong", blurb: "Noticeably longer than wide, with straight sides.", path: "M50 4 C74 4 80 20 80 40 L80 84 C80 104 66 116 50 116 C34 116 20 104 20 84 L20 40 C20 20 26 4 50 4Z" },
  heart: { label: "Heart", blurb: "Wider forehead tapering to a narrower chin.", path: "M14 18 C14 10 30 6 50 6 C70 6 86 10 86 18 C86 46 80 70 66 92 C60 104 54 114 50 114 C46 114 40 104 34 92 C20 70 14 46 14 18Z" },
  diamond: { label: "Diamond", blurb: "Wide cheekbones with a narrower forehead and chin.", path: "M50 6 C60 6 68 18 76 34 C84 50 90 58 86 70 C80 90 64 114 50 114 C36 114 20 90 14 70 C10 58 16 50 24 34 C32 18 40 6 50 6Z" },
};

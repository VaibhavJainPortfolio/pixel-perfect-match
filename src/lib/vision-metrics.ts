// Client-side measurements from MediaPipe landmarks + pixel sampling.
export type Pt = { x: number; y: number; z?: number; visibility?: number };

const dist = (a: Pt, b: Pt, w: number, h: number) => Math.hypot((a.x - b.x) * w, (a.y - b.y) * h);

export function luminance(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const d = ctx.getImageData(0, 0, w, h).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!;
  return s / (d.length / 4);
}

/** Laplacian variance on a small grayscale copy — higher = sharper. */
export function sharpness(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const d = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * d[i * 4]! + 0.587 * d[i * 4 + 1]! + 0.114 * d[i * 4 + 2]!;
  let sum = 0, sq = 0, n = 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    const l = 4 * g[i]! - g[i - 1]! - g[i + 1]! - g[i - w]! - g[i + w]!;
    sum += l; sq += l * l; n++;
  }
  const m = sum / n;
  return sq / n - m * m;
}

export function rgbToLab(r: number, g: number, b: number) {
  const lin = (c: number) => { c /= 255; return c > 0.04045 ? ((c + 0.055) / 1.055) ** 2.4 : c / 12.92; };
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const L = 116 * f(Y) - 16, A = 500 * (f(X) - f(Y)), Bb = 200 * (f(Y) - f(Z));
  return { L: +L.toFixed(2), a: +A.toFixed(2), b: +Bb.toFixed(2) };
}

export function avgRegion(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  const x = Math.max(0, Math.round(cx - r)), y = Math.max(0, Math.round(cy - r));
  const s = Math.max(2, Math.round(r * 2));
  const d = ctx.getImageData(x, y, s, s).data;
  let R = 0, G = 0, B = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { R += d[i]!; G += d[i + 1]!; B += d[i + 2]!; n++; }
  return { r: R / n, g: G / n, b: B / n };
}

/** Yaw estimate: nose offset from face centre, normalised by face width. Raw (un-mirrored) image space. */
export function faceYaw(lm: Pt[]) {
  const left = lm[234]!, right = lm[454]!, nose = lm[1]!;
  const cx = (left.x + right.x) / 2;
  const width = Math.abs(right.x - left.x) || 0.0001;
  return (nose.x - cx) / width;
}

export function faceMetrics(lm: Pt[], ctx: CanvasRenderingContext2D, w: number, h: number) {
  const forehead = dist(lm[54]!, lm[284]!, w, h);
  const cheekbone = dist(lm[234]!, lm[454]!, w, h);
  const jaw = dist(lm[172]!, lm[397]!, w, h);
  const length = dist(lm[10]!, lm[152]!, w, h);
  // Jaw angle at the left gonion between ear-side (234) and chin (152)
  const g = lm[172]!, a = lm[234]!, c = lm[152]!;
  const v1 = { x: (a.x - g.x) * w, y: (a.y - g.y) * h }, v2 = { x: (c.x - g.x) * w, y: (c.y - g.y) * h };
  const jawAngle = (Math.acos((v1.x * v2.x + v1.y * v2.y) / (Math.hypot(v1.x, v1.y) * Math.hypot(v2.x, v2.y))) * 180) / Math.PI;
  const r = cheekbone * 0.06;
  const cheekL = avgRegion(ctx, lm[50]!.x * w, lm[50]!.y * h, r);
  const cheekR = avgRegion(ctx, lm[280]!.x * w, lm[280]!.y * h, r);
  const cheek = { r: (cheekL.r + cheekR.r) / 2, g: (cheekL.g + cheekR.g) / 2, b: (cheekL.b + cheekR.b) / 2 };
  // White-balance reference: wall in the two top corners
  const c1 = avgRegion(ctx, w * 0.06, h * 0.06, w * 0.04), c2 = avgRegion(ctx, w * 0.94, h * 0.06, w * 0.04);
  const wall = { r: (c1.r + c2.r) / 2, g: (c1.g + c2.g) / 2, b: (c1.b + c2.b) / 2 };
  return {
    face_length_px: +length.toFixed(1), forehead_width_px: +forehead.toFixed(1),
    cheekbone_width_px: +cheekbone.toFixed(1), jaw_width_px: +jaw.toFixed(1), jaw_angle_deg: +jawAngle.toFixed(1),
    ratios: { length_to_cheek: +(length / cheekbone).toFixed(3), jaw_to_cheek: +(jaw / cheekbone).toFixed(3), forehead_to_cheek: +(forehead / cheekbone).toFixed(3) },
    yaw: +faceYaw(lm).toFixed(3),
    skin_lab_cheek: rgbToLab(cheek.r, cheek.g, cheek.b),
    wall_reference_rgb: { r: Math.round(wall.r), g: Math.round(wall.g), b: Math.round(wall.b) },
    wall_reference_lab: rgbToLab(wall.r, wall.g, wall.b),
  };
}

type Mask = { data: Float32Array; width: number; height: number };

function maskRowWidth(mask: Mask, yNorm: number) {
  const y = Math.min(mask.height - 1, Math.max(0, Math.round(yNorm * mask.height)));
  let min = -1, max = -1;
  for (let x = 0; x < mask.width; x++) if (mask.data[y * mask.width + x]! > 0.5) { if (min < 0) min = x; max = x; }
  return min < 0 ? 0 : (max - min + 1) / mask.width;
}

export function bodyMetrics(lm: Pt[], mask: Mask | null, w: number, h: number) {
  const sh = { y: (lm[11]!.y + lm[12]!.y) / 2 }, hip = { y: (lm[23]!.y + lm[24]!.y) / 2 };
  let top = Math.min(lm[0]!.y, lm[7]?.y ?? 1, lm[8]?.y ?? 1) - 0.06 * Math.abs(hip.y - sh.y);
  if (mask) { for (let y = 0; y < mask.height; y++) { let hit = false; for (let x = 0; x < mask.width; x++) if (mask.data[y * mask.width + x]! > 0.5) { hit = true; break; } if (hit) { top = y / mask.height; break; } } }
  const bottom = Math.max(lm[29]?.y ?? 0, lm[30]?.y ?? 0, lm[31]?.y ?? 0, lm[32]?.y ?? 0, lm[27]!.y, lm[28]!.y);
  const heightPx = (bottom - top) * h;
  const waistY = hip.y - 0.3 * (hip.y - sh.y);
  const shoulderPx = mask ? maskRowWidth(mask, sh.y + 0.04 * (hip.y - sh.y)) * w : dist(lm[11]!, lm[12]!, w, h);
  const waistPx = mask ? maskRowWidth(mask, waistY) * w : 0;
  const hipPx = mask ? maskRowWidth(mask, hip.y) * w : dist(lm[23]!, lm[24]!, w, h);
  return {
    height_px: +heightPx.toFixed(1),
    shoulder_width_px: +shoulderPx.toFixed(1), waist_width_px: +waistPx.toFixed(1), hip_width_px: +hipPx.toFixed(1),
    relative: {
      shoulder_to_height: +(shoulderPx / heightPx).toFixed(4),
      waist_to_height: +(waistPx / heightPx).toFixed(4),
      hip_to_height: +(hipPx / heightPx).toFixed(4),
    },
    method: mask ? "segmentation" : "landmarks",
  };
}

export function wristMetrics(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const c = avgRegion(ctx, w / 2, h * 0.55, Math.min(w, h) * 0.06);
  const c1 = avgRegion(ctx, w * 0.08, h * 0.08, w * 0.05);
  return { skin_lab_wrist: rgbToLab(c.r, c.g, c.b), background_reference_lab: rgbToLab(c1.r, c1.g, c1.b) };
}

/** Draw a source (video/image) into a canvas, max 1600px on the long side, un-mirrored. */
export function toCanvas(src: HTMLVideoElement | HTMLImageElement, max = 1600) {
  const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.naturalWidth;
  const sh = src instanceof HTMLVideoElement ? src.videoHeight : src.naturalHeight;
  const s = Math.min(1, max / Math.max(sw, sh));
  const c = document.createElement("canvas");
  c.width = Math.round(sw * s); c.height = Math.round(sh * s);
  c.getContext("2d", { willReadFrequently: true })!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export const canvasToJpeg = (c: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("encode failed"))), "image/jpeg", 0.86));

/** Approximate eyewear measurements, scaled by the average human iris (11.7 mm). Needs the 478-point mesh. */
export function eyewearMetrics(lm: Pt[], w: number, h: number) {
  if (lm.length < 478) return { approximate: true, available: false };
  const irisL = (dist(lm[469]!, lm[471]!, w, h) + dist(lm[470]!, lm[472]!, w, h)) / 2;
  const irisR = (dist(lm[474]!, lm[476]!, w, h) + dist(lm[475]!, lm[477]!, w, h)) / 2;
  const iris = (irisL + irisR) / 2;
  if (!(iris > 2)) return { approximate: true, available: false };
  const mm = 11.7 / iris;
  const r = (px: number) => Math.round(px * mm * 10) / 10;
  const pd = dist(lm[468]!, lm[473]!, w, h);
  const temple = dist(lm[127]!, lm[356]!, w, h);
  const cheek = dist(lm[234]!, lm[454]!, w, h);
  const bridge = dist(lm[193]!, lm[417]!, w, h);
  const browY = ((lm[105]!.y + lm[334]!.y) / 2) * h;
  const pupilY = ((lm[468]!.y + lm[473]!.y) / 2) * h;
  return {
    approximate: true, available: true, scale: "iris_11.7mm", iris_diameter_px: +iris.toFixed(1),
    pupillary_distance: r(pd), temple_width: r(temple), cheekbone_width: r(cheek),
    nose_bridge_width: r(bridge), brow_to_pupil_height: r(pupilY - browY),
  };
}

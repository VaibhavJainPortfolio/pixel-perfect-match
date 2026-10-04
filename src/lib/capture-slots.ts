import faceFront from "@/assets/samples/face_front.jpg";
import faceLeft from "@/assets/samples/face_left.jpg";
import faceRight from "@/assets/samples/face_right.jpg";
import face45 from "@/assets/samples/face_45.jpg";
import bodyFront from "@/assets/samples/body_front.jpg";
import bodySide from "@/assets/samples/body_side.jpg";
import wrist from "@/assets/samples/wrist.jpg";
import outfit from "@/assets/samples/outfit.jpg";

export type SlotKey = "face_front" | "face_left" | "face_right" | "face_45" | "body_front" | "body_side" | "wrist" | "outfit";
export type SlotKind = "face" | "body" | "wrist" | "outfit";
export type Pose = "front" | "left" | "right" | "45" | "body_front" | "body_side" | "none";

export type Slot = {
  key: SlotKey; label: string; tip: string; kind: SlotKind; pose: Pose;
  required: boolean; camera: "user" | "environment"; sample: string;
};

export const SLOTS: Slot[] = [
  { key: "face_front", label: "Face — front", tip: "Look straight ahead with your hair pushed off your forehead.", kind: "face", pose: "front", required: true, camera: "user", sample: faceFront },
  { key: "face_left", label: "Face — left profile", tip: "Turn your head fully to your left so we see your side profile.", kind: "face", pose: "left", required: true, camera: "user", sample: faceLeft },
  { key: "face_right", label: "Face — right profile", tip: "Turn your head fully to your right so we see your side profile.", kind: "face", pose: "right", required: true, camera: "user", sample: faceRight },
  { key: "face_45", label: "Face — 45°", tip: "Turn your head halfway, so one ear is just visible.", kind: "face", pose: "45", required: true, camera: "user", sample: face45 },
  { key: "body_front", label: "Full body — front", tip: "Fitted t-shirt and jeans. Prop the phone up, step back until head to feet fit.", kind: "body", pose: "body_front", required: true, camera: "user", sample: bodyFront },
  { key: "body_side", label: "Full body — side", tip: "Same outfit. Turn fully sideways, arms relaxed by your side.", kind: "body", pose: "body_side", required: true, camera: "user", sample: bodySide },
  { key: "wrist", label: "Inner wrist", tip: "Palm up, near a window in daylight. No filters or flash.", kind: "wrist", pose: "none", required: true, camera: "environment", sample: wrist },
  { key: "outfit", label: "Favourite outfit (optional)", tip: "Wear the outfit you like most and stand head to feet in frame.", kind: "outfit", pose: "none", required: false, camera: "user", sample: outfit },
];

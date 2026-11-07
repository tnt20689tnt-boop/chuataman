export type CompletedInteractionAction = "chap" | "le";

export function interactionActionForCompletedClip(
  clipName: string,
): CompletedInteractionAction | null {
  if (clipName === "prayer") return "chap";
  if (clipName === "kneel") return "le";
  return null;
}

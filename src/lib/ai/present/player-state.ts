export type PlayerPhase = "idle" | "narrating" | "answering" | "paused" | "complete";

export type PlayerEvent =
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "RESUME" }
  | { type: "SLIDE_ENDED" }
  | { type: "QUESTION_ASKED" }
  | { type: "ANSWER_DONE" }
  | { type: "DECK_ENDED" };

export function transitionPlayerPhase(
  phase: PlayerPhase,
  event: PlayerEvent
): PlayerPhase {
  switch (phase) {
    case "idle":
      if (event.type === "PLAY") return "narrating";
      return phase;
    case "narrating":
      if (event.type === "PAUSE") return "paused";
      if (event.type === "QUESTION_ASKED") return "answering";
      if (event.type === "DECK_ENDED") return "complete";
      return phase;
    case "answering":
      if (event.type === "ANSWER_DONE") return "narrating";
      return phase;
    case "paused":
      if (event.type === "RESUME") return "narrating";
      if (event.type === "QUESTION_ASKED") return "answering";
      return phase;
    case "complete":
      return phase;
    default:
      return phase;
  }
}

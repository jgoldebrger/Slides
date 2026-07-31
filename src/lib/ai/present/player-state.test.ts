import { describe, expect, it } from "vitest";
import { transitionPlayerPhase } from "@/lib/ai/present/player-state";

describe("transitionPlayerPhase", () => {
  it("idle + PLAY → narrating", () => {
    expect(transitionPlayerPhase("idle", { type: "PLAY" })).toBe("narrating");
  });

  it("narrating + QUESTION_ASKED → answering", () => {
    expect(transitionPlayerPhase("narrating", { type: "QUESTION_ASKED" })).toBe("answering");
  });

  it("answering + ANSWER_DONE → narrating", () => {
    expect(transitionPlayerPhase("answering", { type: "ANSWER_DONE" })).toBe("narrating");
  });

  it("narrating + PAUSE → paused", () => {
    expect(transitionPlayerPhase("narrating", { type: "PAUSE" })).toBe("paused");
  });

  it("narrating + DECK_ENDED → complete", () => {
    expect(transitionPlayerPhase("narrating", { type: "DECK_ENDED" })).toBe("complete");
  });
});

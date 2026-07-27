import { describe, expect, it } from "vitest";
import {
  deckBackgroundAudioPath,
  isAllowedAudioFile,
  validateBackgroundAudioFile,
} from "@/lib/player/background-upload";

describe("validateBackgroundAudioFile", () => {
  it("accepts mp3 and wav by mime type", () => {
    expect(
      validateBackgroundAudioFile({
        name: "track.mp3",
        type: "audio/mpeg",
        size: 1024,
      } as File)
    ).toEqual({ file: expect.objectContaining({ name: "track.mp3" }) });
  });

  it("accepts wav when browser omits mime type", () => {
    expect(
      validateBackgroundAudioFile({
        name: "smooth_ic[1].wav",
        type: "",
        size: 5 * 1024 * 1024,
      } as File)
    ).toEqual({
      file: expect.objectContaining({ name: "smooth_ic[1].wav" }),
    });
  });

  it("rejects unsupported formats", () => {
    expect(
      validateBackgroundAudioFile({
        name: "track.m4a",
        type: "audio/mp4",
        size: 1024,
      } as File).error
    ).toBe("Only MP3 or WAV audio is allowed");
  });
});

describe("deckBackgroundAudioPath", () => {
  it("maps wav uploads to a wav storage path", () => {
    expect(deckBackgroundAudioPath("org-1", "deck-1", "music.wav")).toBe(
      "org-1/deck-1/background/audio.wav"
    );
  });
});

describe("isAllowedAudioFile", () => {
  it("allows extension fallback for wav", () => {
    expect(isAllowedAudioFile({ name: "a.wav", type: "" })).toBe(true);
  });
});

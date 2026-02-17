import { describe, expect, it } from "vitest";
import { clampRating, getInitials, slugify } from "./utils";

describe("slugify", () => {
  it("normalizes words and separators", () => {
    expect(slugify("  Hello   World!  ")).toBe("hello-world");
  });

  it("drops unsupported characters", () => {
    expect(slugify("AI+Tool@2026")).toBe("aitool2026");
  });
});

describe("getInitials", () => {
  it("returns two initials for full names", () => {
    expect(getInitials("Ada Lovelace")).toBe("AL");
  });

  it("returns fallback for missing names", () => {
    expect(getInitials("")).toBe("U");
    expect(getInitials(undefined)).toBe("U");
  });
});

describe("clampRating", () => {
  it("clamps values to rating bounds", () => {
    expect(clampRating(0)).toBe(1);
    expect(clampRating(3.4)).toBe(3);
    expect(clampRating(8)).toBe(5);
  });
});

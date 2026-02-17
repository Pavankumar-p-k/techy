import { describe, expect, it } from "vitest";
import {
  normalizeUrl,
  parseTagsInput,
  profileUpdateSchema,
  reviewInputSchema,
  slugCandidateFromName,
  toolSubmissionInputSchema,
} from "./validation";

describe("normalizeUrl", () => {
  it("normalizes host, trailing slash, and query order", () => {
    const normalized = normalizeUrl("HTTPS://Example.com/path/?b=2&a=1#fragment");
    expect(normalized).toBe("https://example.com/path?a=1&b=2");
  });

  it("returns null for non-http urls", () => {
    expect(normalizeUrl("ftp://example.com")).toBeNull();
  });
});

describe("toolSubmissionInputSchema", () => {
  it("accepts valid tool submission payloads", () => {
    const result = toolSubmissionInputSchema.safeParse({
      name: "Student AI Helper",
      url: "https://example.com/tool",
      category: "Productivity",
      shortDescription: "A helpful assistant for student project planning.",
      howItWorks: "You provide your task details and it generates clear, step-by-step outlines.",
      freeType: "freemium",
      freeDetails: "Free tier includes limited weekly usage.",
      tags: ["students", "planning"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tags).toEqual(["students", "planning"]);
    }
  });

  it("rejects too many tags", () => {
    const result = toolSubmissionInputSchema.safeParse({
      name: "Student AI Helper",
      url: "https://example.com/tool",
      category: "Productivity",
      shortDescription: "A helpful assistant for student project planning.",
      howItWorks: "You provide your task details and it generates clear, step-by-step outlines.",
      freeType: "freemium",
      freeDetails: "Free tier includes limited weekly usage.",
      tags: ["a-1", "b-1", "c-1", "d-1", "e-1", "f-1", "g-1", "h-1", "i-1"],
    });

    expect(result.success).toBe(false);
  });
});

describe("reviewInputSchema", () => {
  it("transforms blank review text to null", () => {
    const result = reviewInputSchema.safeParse({
      rating: 5,
      reviewText: "   ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.reviewText).toBeNull();
    }
  });
});

describe("profileUpdateSchema", () => {
  it("rejects invalid avatar urls", () => {
    const result = profileUpdateSchema.safeParse({
      fullName: "Jane",
      bio: "Test bio",
      avatarUrl: "not-a-url",
    });

    expect(result.success).toBe(false);
  });
});

describe("helpers", () => {
  it("parses tags and builds slug candidate", () => {
    expect(parseTagsInput(" Coding, productivity, coding ")).toEqual(["coding", "productivity", "coding"]);
    expect(slugCandidateFromName("My Tool!!")).toBe("my-tool");
  });
});

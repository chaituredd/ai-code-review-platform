import { describe, it, expect } from "vitest";
import { cn, truncate, getInitials, formatDate } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "visible")).toBe("base visible");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("px-4", "px-8")).toBe("px-8");
  });
});

describe("truncate", () => {
  it("returns short strings as-is", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates long strings with ellipsis", () => {
    const result = truncate("hello world this is long", 12);
    expect(result).toContain("…");
  });
});

describe("getInitials", () => {
  it("single name", () => {
    expect(getInitials("john")).toBe("J");
  });

  it("underscore separated", () => {
    expect(getInitials("john_doe")).toBe("JD");
  });

  it("dot separated", () => {
    expect(getInitials("jane.smith")).toBe("JS");
  });
});

describe("formatDate", () => {
  it("formats iso date", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("2024");
  });
});

import { describe, expect, it } from "vitest";
import { isSoundCloudTab, pickTargetTab, type TabLike } from "../src/lib/tab-picker";

const sc = (id: number, extra: Partial<TabLike> = {}): TabLike => ({
  id,
  url: `https://soundcloud.com/some/track-${id}`,
  windowId: 1,
  ...extra,
});

describe("isSoundCloudTab", () => {
  it("accepts soundcloud.com and rejects lookalikes", () => {
    expect(isSoundCloudTab({ url: "https://soundcloud.com/" })).toBe(true);
    expect(isSoundCloudTab({ url: "https://soundcloud.com" })).toBe(true);
    expect(isSoundCloudTab({ url: "https://soundcloud.com.evil.example/" })).toBe(false);
    expect(isSoundCloudTab({ url: "https://api.soundcloud.com/" })).toBe(false);
    expect(isSoundCloudTab({ url: "http://soundcloud.com/" })).toBe(false);
    expect(isSoundCloudTab({})).toBe(false);
  });
});

describe("pickTargetTab", () => {
  it("returns undefined with no SoundCloud tabs", () => {
    expect(pickTargetTab([{ id: 1, url: "https://example.com" }], "audible-first")).toBeUndefined();
  });

  it("audible-first prefers the tab making sound", () => {
    const tabs = [sc(1, { lastAccessed: 100 }), sc(2, { audible: true, lastAccessed: 1 }), sc(3)];
    expect(pickTargetTab(tabs, "audible-first")?.id).toBe(2);
  });

  it("audible-first falls back to the most recently accessed tab", () => {
    const tabs = [sc(1, { lastAccessed: 100 }), sc(2, { lastAccessed: 300 }), sc(3, { lastAccessed: 200 })];
    expect(pickTargetTab(tabs, "audible-first")?.id).toBe(2);
  });

  it("active-first uses the active tab in the focused window", () => {
    const tabs = [sc(1, { audible: true }), sc(2, { active: true, windowId: 7 })];
    expect(pickTargetTab(tabs, "active-first", 7)?.id).toBe(2);
    // Active tab in another window does not count; falls through to audible.
    expect(pickTargetTab(tabs, "active-first", 1)?.id).toBe(1);
  });

  it("first keeps tab order", () => {
    const tabs = [sc(5), sc(6, { audible: true })];
    expect(pickTargetTab(tabs, "first")?.id).toBe(5);
  });

  it("skips tabs without ids", () => {
    const tabs: TabLike[] = [{ url: "https://soundcloud.com/x" }, sc(9)];
    expect(pickTargetTab(tabs, "first")?.id).toBe(9);
  });
});

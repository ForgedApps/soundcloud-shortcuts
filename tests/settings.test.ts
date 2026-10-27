import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/lib/settings";

describe("normalizeSettings", () => {
  it("returns defaults for missing or garbage input", () => {
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings("nope")).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ tabTargeting: "bogus", seekStep: "10" })).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps valid values", () => {
    expect(
      normalizeSettings({
        tabTargeting: "first",
        seekStep: 5,
        openTabIfNone: true,
        showErrorBadge: false,
      }),
    ).toEqual({
      ...DEFAULT_SETTINGS,
      tabTargeting: "first",
      seekStep: 5,
      openTabIfNone: true,
      showErrorBadge: false,
    });
  });

  it("accepts the notification toggles", () => {
    expect(
      normalizeSettings({ notifyOnTrackChange: false, notifyOnlyWhenHidden: false, showStateBadge: false }),
    ).toMatchObject({ notifyOnTrackChange: false, notifyOnlyWhenHidden: false, showStateBadge: false });
    expect(normalizeSettings({ notifyOnTrackChange: "yes" }).notifyOnTrackChange).toBe(true);
  });

  it("clamps and rounds the seek step", () => {
    expect(normalizeSettings({ seekStep: 0 }).seekStep).toBe(1);
    expect(normalizeSettings({ seekStep: 999 }).seekStep).toBe(120);
    expect(normalizeSettings({ seekStep: 7.6 }).seekStep).toBe(8);
    expect(normalizeSettings({ seekStep: Number.NaN }).seekStep).toBe(DEFAULT_SETTINGS.seekStep);
  });
});

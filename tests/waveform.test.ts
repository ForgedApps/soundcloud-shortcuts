import { describe, expect, it } from "vitest";
import { downsample, extractWaveformUrl, isWaveformJson } from "../src/lib/waveform";
import { formatTime, parseTime } from "../src/lib/state";

describe("extractWaveformUrl", () => {
  it("finds the URL in hydration JSON", () => {
    const html = `<script>window.__sc_hydration = [{"hydratable":"sound","data":{"id":1,"waveform_url":"https://wave.sndcdn.com/abc_m.json","title":"x"}}]</script>`;
    expect(extractWaveformUrl(html)).toBe("https://wave.sndcdn.com/abc_m.json");
  });
  it("handles escaped slashes and missing data", () => {
    expect(extractWaveformUrl('"waveform_url":"https:\\/\\/wave.sndcdn.com\\/x.json"')).toBe(
      "https://wave.sndcdn.com/x.json",
    );
    expect(extractWaveformUrl("<html></html>")).toBeNull();
  });
});

describe("isWaveformJson", () => {
  it("validates shape", () => {
    expect(isWaveformJson({ width: 1800, height: 140, samples: [0, 1, 2] })).toBe(true);
    expect(isWaveformJson({ height: 140, samples: [] })).toBe(false);
    expect(isWaveformJson({ height: 140, samples: ["a"] })).toBe(false);
    expect(isWaveformJson(null)).toBe(false);
  });
});

describe("downsample", () => {
  it("takes the peak of each bucket, normalized to 0..1", () => {
    const samples = [10, 20, 30, 40, 50, 60, 70, 80];
    expect(downsample(samples, 100, 4)).toEqual([0.2, 0.4, 0.6, 0.8]);
  });
  it("handles more bars than samples and empty input", () => {
    expect(downsample([50, 100], 100, 4)).toEqual([0.5, 0.5, 1, 1]);
    expect(downsample([], 100, 4)).toEqual([]);
    expect(downsample([1], 100, 0)).toEqual([]);
  });
  it("clamps values above height", () => {
    expect(downsample([250], 100, 1)).toEqual([1]);
  });
});

describe("time helpers", () => {
  it("formats seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65.9)).toBe("1:05");
    expect(formatTime(3661)).toBe("1:01:01");
    expect(formatTime(-5)).toBe("0:00");
  });
  it("parses m:ss and h:mm:ss", () => {
    expect(parseTime("1:05")).toBe(65);
    expect(parseTime("1:01:01")).toBe(3661);
    expect(parseTime("  2:30 ")).toBe(150);
    expect(parseTime("nope")).toBeNull();
    expect(parseTime("")).toBeNull();
    expect(parseTime(undefined)).toBeNull();
  });
});

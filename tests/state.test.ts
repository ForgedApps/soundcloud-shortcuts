import { describe, expect, it } from "vitest";
import { MAX_CACHED_WAVEFORMS, rememberWaveform, type Waveform } from "../src/lib/state";

const wf = (key: string): Waveform => ({ trackKey: key, samples: [1, 2, 3], height: 140 });

describe("rememberWaveform", () => {
  it("adds and replaces by track key", () => {
    let cache = rememberWaveform({}, wf("/a/1"));
    cache = rememberWaveform(cache, wf("/a/2"));
    cache = rememberWaveform(cache, { ...wf("/a/1"), samples: [9] });
    expect(Object.keys(cache)).toEqual(["/a/2", "/a/1"]);
    expect(cache["/a/1"]?.samples).toEqual([9]);
  });

  it("evicts the oldest entries past the cap", () => {
    let cache: Record<string, Waveform> = {};
    for (let i = 0; i < MAX_CACHED_WAVEFORMS + 5; i++) cache = rememberWaveform(cache, wf(`/t/${i}`));
    expect(Object.keys(cache)).toHaveLength(MAX_CACHED_WAVEFORMS);
    expect(cache["/t/0"]).toBeUndefined();
    expect(cache[`/t/${MAX_CACHED_WAVEFORMS + 4}`]).toBeDefined();
  });
});

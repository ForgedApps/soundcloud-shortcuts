// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { currentTitle, isPlaying, readTimeline, runCommand } from "../src/lib/player-adapter";

/** A minimal stand-in for SoundCloud's bottom player bar. */
function mountPlayer(): void {
  document.body.innerHTML = `
    <div class="playControls">
      <button class="skipControl__previous" title="Skip to previous"></button>
      <button class="playControls__play playing" title="Pause current"></button>
      <button class="skipControl__next" title="Skip to next"></button>
      <button class="shuffleControl"></button>
      <button class="repeatControl"></button>
      <div class="playbackTimeline">
        <div class="playbackTimeline__progressWrapper" role="progressbar"
             aria-valuenow="30" aria-valuemin="0" aria-valuemax="300"></div>
      </div>
      <div class="volume"><button class="volume__button"></button></div>
      <div class="playbackSoundBadge">
        <a class="playbackSoundBadge__titleLink" title="Track Title" href="/artist/track"></a>
        <button class="playbackSoundBadge__like"></button>
        <button class="playbackSoundBadge__repost"></button>
      </div>
    </div>`;
}

const clicks = (selector: string) => {
  const el = document.querySelector<HTMLElement>(selector)!;
  const spy = vi.fn();
  el.addEventListener("click", spy);
  return spy;
};

describe("player adapter", () => {
  beforeEach(mountPlayer);

  it.each([
    ["play-pause", ".playControls__play"],
    ["next", ".skipControl__next"],
    ["previous", ".skipControl__previous"],
    ["like", ".playbackSoundBadge__like"],
    ["repost", ".playbackSoundBadge__repost"],
    ["mute", ".volume__button"],
    ["shuffle", ".shuffleControl"],
    ["repeat", ".repeatControl"],
  ] as const)("%s clicks %s", (command, selector) => {
    const spy = clicks(selector);
    expect(runCommand(command, 10)).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("falls back to the page's keyboard shortcut when a button is missing", () => {
    document.querySelector(".playbackSoundBadge__like")!.remove();
    const keys: string[] = [];
    document.body.addEventListener("keydown", (e) => keys.push(e.key));
    const result = runCommand("like", 10);
    expect(result.ok).toBe(true);
    expect(keys).toEqual(["l"]);
  });

  it("volume commands dispatch Shift+Arrow on the page", () => {
    const seen: KeyboardEvent[] = [];
    document.body.addEventListener("keydown", (e) => seen.push(e));
    runCommand("volume-up", 10);
    runCommand("volume-down", 10);
    expect(seen.map((e) => [e.key, e.shiftKey])).toEqual([
      ["ArrowUp", true],
      ["ArrowDown", true],
    ]);
  });

  it("reads the timeline from aria attributes", () => {
    expect(readTimeline()).toEqual({ position: 30, duration: 300 });
  });

  it("seeks by clicking the timeline at the proportional x position", () => {
    const bar = document.querySelector<HTMLElement>(".playbackTimeline__progressWrapper")!;
    bar.getBoundingClientRect = () =>
      ({ left: 100, top: 10, width: 600, height: 10, right: 700, bottom: 20, x: 100, y: 10 }) as DOMRect;
    const xs: number[] = [];
    bar.addEventListener("mousedown", (e) => xs.push(e.clientX));
    expect(runCommand("seek-forward", 15).ok).toBe(true); // 45 / 300 of 600px = 90px
    expect(runCommand("seek-backward", 60).ok).toBe(true); // clamps to 0
    expect(xs).toEqual([190, 100]);
  });

  it("uses arrow keys for seeking when the timeline is absent", () => {
    document.querySelector(".playbackTimeline")!.remove();
    const keys: string[] = [];
    document.body.addEventListener("keydown", (e) => keys.push(e.key));
    runCommand("seek-forward", 10);
    expect(keys).toEqual(["ArrowRight"]);
  });

  it("exposes play state and title", () => {
    expect(isPlaying()).toBe(true);
    expect(currentTitle()).toBe("Track Title");
    document.querySelector(".playControls__play")!.classList.remove("playing");
    document.querySelector(".playControls__play")!.setAttribute("title", "Play current");
    expect(isPlaying()).toBe(false);
  });

  it("reports missing controls when nothing can be done", () => {
    document.body.innerHTML = "";
    expect(runCommand("focus-tab", 10).ok).toBe(false);
  });
});

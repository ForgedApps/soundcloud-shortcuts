// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { artworkAtSize, readNowPlaying, seekToFraction } from "../src/lib/player-adapter";

function mountPlayer(opts: { track?: boolean; liked?: boolean; aria?: boolean } = {}): void {
  const { track = true, liked = false, aria = true } = opts;
  document.body.innerHTML = `
    <div class="playControls">
      <button class="playControls__play playing" title="Pause current"></button>
      <div class="playbackTimeline">
        <div class="playbackTimeline__timePassed"><span class="sc-visuallyhidden">Current time:</span><span aria-hidden="true">0:42</span></div>
        <div class="playbackTimeline__progressWrapper" role="progressbar" ${aria ? 'aria-valuenow="42" aria-valuemax="180"' : ""}></div>
        <div class="playbackTimeline__duration"><span class="sc-visuallyhidden">Duration:</span><span aria-hidden="true">3:00</span></div>
      </div>
      <button class="shuffleControl m-shuffling"></button>
      <button class="repeatControl m-one"></button>
      <div class="volume muted" data-level="7"><button class="volume__button"></button></div>
      <div class="playbackSoundBadge">
        ${
          track
            ? `
        <div class="playbackSoundBadge__avatar"><span class="sc-artwork" style="background-image: url(&quot;https://i1.sndcdn.com/artworks-abc-t50x50.jpg&quot;);"></span></div>
        <a class="playbackSoundBadge__lightLink" title="Some Artist" href="/some-artist"></a>
        <a class="playbackSoundBadge__titleLink" title="Great Track" href="/some-artist/great-track?in=playlist"></a>
        <button class="playbackSoundBadge__like ${liked ? "sc-button-selected" : ""}" title="${liked ? "Unlike" : "Like"}"></button>
        <button class="playbackSoundBadge__repost sc-button-selected"></button>`
            : ""
        }
      </div>
    </div>`;
}

describe("readNowPlaying", () => {
  beforeEach(() => mountPlayer());

  it("reads the full snapshot from the player bar", () => {
    const s = readNowPlaying();
    expect(s).toMatchObject({
      trackKey: "/some-artist/great-track",
      trackUrl: "https://soundcloud.com/some-artist/great-track?in=playlist",
      title: "Great Track",
      artist: "Some Artist",
      artistUrl: "https://soundcloud.com/some-artist",
      artworkUrl: "https://i1.sndcdn.com/artworks-abc-t50x50.jpg",
      playing: true,
      position: 42,
      duration: 180,
      liked: false,
      reposted: true,
      shuffle: true,
      repeat: "one",
      volume: 7,
      muted: true,
    });
    expect(typeof s?.updatedAt).toBe("number");
  });

  it("detects liked state from the selected class", () => {
    mountPlayer({ liked: true });
    expect(readNowPlaying()?.liked).toBe(true);
  });

  it("falls back to the visible time labels when aria values are missing", () => {
    mountPlayer({ aria: false });
    expect(readNowPlaying()).toMatchObject({ position: 42, duration: 180 });
  });

  it("returns null when no track is loaded", () => {
    mountPlayer({ track: false });
    expect(readNowPlaying()).toBeNull();
  });
});

describe("seekToFraction", () => {
  it("clicks the timeline at the requested fraction", () => {
    mountPlayer();
    const bar = document.querySelector<HTMLElement>(".playbackTimeline__progressWrapper")!;
    bar.getBoundingClientRect = () =>
      ({ left: 50, top: 0, width: 200, height: 8, right: 250, bottom: 8, x: 50, y: 0 }) as DOMRect;
    const xs: number[] = [];
    bar.addEventListener("click", (e) => xs.push(e.clientX));
    expect(seekToFraction(0.25).ok).toBe(true);
    expect(seekToFraction(5).ok).toBe(true); // clamps to 1
    expect(xs).toEqual([100, 250]);
  });

  it("fails cleanly without a timeline", () => {
    document.body.innerHTML = "";
    expect(seekToFraction(0.5).ok).toBe(false);
  });
});

describe("artworkAtSize", () => {
  it("rewrites SoundCloud size suffixes", () => {
    expect(artworkAtSize("https://i1.sndcdn.com/artworks-abc-t50x50.jpg", 200)).toBe(
      "https://i1.sndcdn.com/artworks-abc-t200x200.jpg",
    );
    expect(artworkAtSize("https://i1.sndcdn.com/artworks-abc-large.jpg", 500)).toBe(
      "https://i1.sndcdn.com/artworks-abc-t500x500.jpg",
    );
    expect(artworkAtSize("https://example.com/plain.png", 200)).toBe("https://example.com/plain.png");
  });
});

/**
 * Waveform helpers: fetching SoundCloud's per-track peaks (content script side)
 * and drawing them SoundCloud-style on a canvas (popup side).
 */

export interface WaveformJson {
  width: number;
  height: number;
  samples: number[];
}

/**
 * Find the waveform JSON URL for a track. SoundCloud embeds track metadata in
 * the HTML of the track page, which the content script can fetch same-origin.
 */
export function extractWaveformUrl(html: string): string | null {
  const match = /"waveform_url":"(https:\\?\/\\?\/[^"]+)"/.exec(html);
  return match?.[1]?.replace(/\\\//g, "/") ?? null;
}

export function isWaveformJson(value: unknown): value is WaveformJson {
  const v = value as Partial<WaveformJson> | null;
  return (
    !!v &&
    typeof v.height === "number" &&
    Array.isArray(v.samples) &&
    v.samples.length > 0 &&
    v.samples.every((n) => typeof n === "number")
  );
}

/** Reduce `samples` to `bars` peak values in 0..1. */
export function downsample(samples: readonly number[], height: number, bars: number): number[] {
  if (samples.length === 0 || bars <= 0) return [];
  const out = new Array<number>(bars);
  const per = samples.length / bars;
  for (let i = 0; i < bars; i++) {
    const start = Math.floor(i * per);
    const end = Math.max(start + 1, Math.floor((i + 1) * per));
    let peak = 0;
    for (let j = start; j < end && j < samples.length; j++) {
      const s = samples[j] ?? 0;
      if (s > peak) peak = s;
    }
    out[i] = Math.min(1, peak / height);
  }
  return out;
}

export interface WaveformColors {
  played: [string, string];
  hover: string;
  unplayed: string;
  reflection: number;
}

export interface DrawOptions {
  /** 0..1 progress. */
  progress: number;
  /** 0..1 hover position or null. */
  hover: number | null;
  barWidth: number;
  gap: number;
  colors: WaveformColors;
}

/** Draw bars like SoundCloud's player: main bars above, a faint mirror below. */
export function drawWaveform(
  ctx: CanvasRenderingContext2D,
  peaks: readonly number[],
  width: number,
  height: number,
  options: DrawOptions,
): void {
  const { progress, hover, barWidth, gap, colors } = options;
  const topHeight = Math.round(height * 0.7);
  const bottomHeight = height - topHeight - 1;
  ctx.clearRect(0, 0, width, height);
  if (peaks.length === 0) return;

  const playedGradient = ctx.createLinearGradient(0, 0, 0, topHeight);
  playedGradient.addColorStop(0, colors.played[0]);
  playedGradient.addColorStop(1, colors.played[1]);

  const lo = hover === null ? progress : Math.min(progress, hover);
  const hi = hover === null ? progress : Math.max(progress, hover);

  peaks.forEach((peak, i) => {
    const x = i * (barWidth + gap);
    const f = (x + barWidth / 2) / width;
    const fill: string | CanvasGradient =
      f <= lo ? playedGradient : f <= hi ? colors.hover : colors.unplayed;
    const h = Math.max(1, Math.round(peak * topHeight));
    ctx.fillStyle = fill;
    ctx.fillRect(x, topHeight - h, barWidth, h);
    const rh = Math.max(1, Math.round(peak * bottomHeight));
    ctx.globalAlpha = colors.reflection;
    ctx.fillRect(x, topHeight + 1, barWidth, rh);
    ctx.globalAlpha = 1;
  });
}
